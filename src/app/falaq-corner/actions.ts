
'use server'

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Leave, LeaveStatus, RoleWithPermissions } from '@/lib/types';
import { Resend } from 'resend';

/**
 * Handles leave application with mandatory validation, overlap prevention,
 * and email notification to admin via Resend.
 * Updated: End date is now optional (defaults to start date).
 */
export async function applyLeave(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to apply for leave.' };
  }

  const startDate = formData.get('start_date') as string;
  let endDate = formData.get('end_date') as string;
  const leaveType = formData.get('leave_type') as string;
  const reason = formData.get('reason') as string;

  // If end date is not provided, it's a one-day leave
  if (!endDate) {
    endDate = startDate;
  }

  if (!startDate || !leaveType || !reason?.trim()) {
    return { error: 'Start date, leave type, and reason are mandatory.' };
  }

  if (endDate < startDate) {
    return { error: 'End date cannot be before start date.' };
  }

  const { data: existing } = await supabase
    .from('leaves')
    .select('start_date, end_date')
    .eq('user_id', user.id)
    .not('status', 'in', '("Cancelled", "Rejected")');

  const hasOverlap = existing?.some(leave => {
    return (startDate <= leave.end_date) && (endDate >= leave.start_date);
  });

  if (hasOverlap) {
    return { error: 'You already have an active leave application for these dates.' };
  }

  const { data, error } = await supabase
    .from('leaves')
    .insert({
      user_id: user.id,
      start_date: startDate,
      end_date: endDate,
      leave_type: leaveType,
      reason: reason.trim(),
      status: 'Pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error applying for leave:', error);
    return { error: error.message };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && data) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      const userName = profile?.full_name || user.email || 'An employee';
      const resend = new Resend(resendApiKey);

      await resend.emails.send({
        from: 'Falaq Corner <notifications@mail.falaq.com>',
        to: 'falaqbranding@gmail.com',
        subject: `New Leave Request: ${userName}`,
        html: `
          <div style="font-family: sans-serif; padding: 32px; border: 1px solid #e2e8f0; border-radius: 24px; max-width: 600px; background-color: #ffffff; color: #0f172a;">
            <div style="background: linear-gradient(to right, #2563eb, #9333ea); padding: 2px; border-radius: 24px;">
              <div style="background: white; padding: 24px; border-radius: 22px;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 24px; letter-spacing: -0.025em;">New Leave Application</h2>
                <p style="color: #64748b; margin-bottom: 24px;">A new leave request has been submitted through the Falaq Corner portal.</p>
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; margin-bottom: 24px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Employee</td>
                      <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${userName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Type</td>
                      <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${leaveType}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Dates</td>
                      <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${startDate} ${startDate !== endDate ? `to ${endDate}` : '(1 Day)'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px; vertical-align: top;">Reason</td>
                      <td style="padding: 8px 0; color: #0f172a; font-weight: 500; font-style: italic;">"${reason}"</td>
                    </tr>
                  </table>
                </div>
                <div style="text-align: center;">
                  <a href="https://falaq.com/falaq-corner" style="display: inline-block; padding: 12px 32px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 100px; font-weight: 600; font-size: 14px;">Review in Dashboard</a>
                </div>
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0 24px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification from Falaq Work Updates.</p>
              </div>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
    }
  }

  revalidatePath('/falaq-corner');
  return { data: data as Leave };
}

export async function cancelLeave(leaveId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'You must be logged in.' };

  const { error } = await supabase
    .from('leaves')
    .update({ status: 'Cancelled' })
    .eq('id', leaveId)
    .eq('user_id', user.id)
    .in('status', ['Pending', 'Approved']);

  if (error) return { error: error.message };

  revalidatePath('/falaq-corner');
  return { success: true };
}

export async function reopenLeave(leaveId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'You must be logged in.' };

  const { error } = await supabase
    .from('leaves')
    .update({ status: 'Pending' })
    .eq('id', leaveId)
    .eq('user_id', user.id)
    .eq('status', 'Cancelled');

  if (error) return { error: error.message };

  revalidatePath('/falaq-corner');
  return { success: true };
}

export async function deleteLeavePermanently(leaveId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'You must be logged in.' };

  const { error } = await supabase
    .from('leaves')
    .delete()
    .eq('id', leaveId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/falaq-corner');
  return { success: true };
}

/**
 * Updates the status of a leave request (Approve/Reject).
 * Restricted to Editors/Admins.
 * Can optionally accept specific approved dates for partial approvals.
 */
export async function updateLeaveStatus(
  leaveId: string, 
  status: LeaveStatus, 
  approvedDates?: { start: string; end: string; days: string[] }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, roles(*)')
    .eq('id', user.id)
    .single();

  const permissions = (profile?.roles as RoleWithPermissions)?.permissions || {};
  const isEditor = permissions.falaq_corner === 'Editor' || profile?.roles?.name === 'Falaq Admin';

  if (!isEditor) return { error: 'Insufficient permissions to manage leaves.' };

  const updates: any = { status };
  if (status === 'Approved' && approvedDates) {
    updates.start_date = approvedDates.start;
    updates.end_date = approvedDates.end;
    updates.approved_days = approvedDates.days;
  }

  const { error } = await supabase
    .from('leaves')
    .update(updates)
    .eq('id', leaveId);

  if (error) return { error: error.message };

  revalidatePath('/falaq-corner');
  return { success: true };
}
