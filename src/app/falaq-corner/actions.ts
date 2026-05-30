'use server'

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Leave, LeaveStatus, RoleWithPermissions } from '@/lib/types';
import { Resend } from 'resend';

/**
 * CORE LEAVE MANAGEMENT ACTIONS
 */

export async function applyLeave(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const startDate = formData.get('start_date') as string;
  let endDate = formData.get('end_date') as string;
  const leaveType = formData.get('leave_type') as string;
  const reason = formData.get('reason') as string;
  const dayType = formData.get('day_type') as string || 'Full Day';

  if (!endDate) endDate = startDate;

  if (!startDate || !leaveType || !reason?.trim()) {
    return { error: 'Start date, type, and reason are mandatory.' };
  }

  // Overlap Check
  const { data: existing } = await supabase
    .from('leaves')
    .select('start_date, end_date')
    .eq('user_id', user.id)
    .not('status', 'in', '("Cancelled", "Rejected")');

  const hasOverlap = existing?.some(leave => {
    return (startDate <= leave.end_date) && (endDate >= leave.start_date);
  });

  if (hasOverlap) return { error: 'An active request already exists for these dates.' };

  const { data, error } = await supabase
    .from('leaves')
    .insert({
      user_id: user.id,
      start_date: startDate,
      end_date: endDate,
      leave_type: leaveType,
      reason: reason.trim(),
      status: 'Pending',
      day_type: dayType,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Notify via Email
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && data) {
    try {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: 'Falaq Corner <notifications@mail.falaq.com>',
        to: 'falaqbranding@gmail.com',
        subject: `New Leave Request: ${profile?.full_name || user.email}`,
        html: `<p>${profile?.full_name} has requested ${leaveType} from ${startDate} to ${endDate}.</p><p>Reason: ${reason}</p>`,
      });
    } catch (e) {}
  }

  revalidatePath('/falaq-corner');
  return { data: data as Leave };
}

export async function updateLeaveStatus(
  leaveId: string, 
  status: LeaveStatus, 
  approvedDates?: { start: string; end: string; days: string[] }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase.from('profiles').select('*, roles(*)').eq('id', user.id).single();
  const isEditor = (profile?.roles as RoleWithPermissions)?.permissions?.falaq_corner === 'Editor' || profile?.roles?.name === 'Falaq Admin';

  if (!isEditor) return { error: 'Unauthorized.' };

  const updates: any = { status };
  if (status === 'Approved' && approvedDates) {
    updates.start_date = approvedDates.start;
    updates.end_date = approvedDates.end;
    updates.approved_days = approvedDates.days;
  }

  const { error } = await supabase.from('leaves').update(updates).eq('id', leaveId);
  if (error) return { error: error.message };

  revalidatePath('/falaq-corner');
  return { success: true };
}

export async function cancelLeave(leaveId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('leaves').update({ status: 'Cancelled' }).eq('id', leaveId).eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/falaq-corner');
  return { success: true };
}

export async function reopenLeave(leaveId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('leaves').update({ status: 'Pending' }).eq('id', leaveId).eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/falaq-corner');
  return { success: true };
}

export async function deleteLeavePermanently(leaveId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('leaves').delete().eq('id', leaveId).eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/falaq-corner');
  return { success: true };
}
