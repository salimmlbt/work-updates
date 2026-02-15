'use server'

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Leave } from '@/lib/types';
import { Resend } from 'resend';

export async function applyLeave(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to apply for leave.' };
  }

  const startDate = formData.get('start_date') as string;
  const endDate = formData.get('end_date') as string;
  const leaveType = formData.get('leave_type') as string;
  const reason = formData.get('reason') as string;

  if (!startDate || !endDate || !leaveType || !reason?.trim()) {
    return { error: 'All fields including reason are mandatory.' };
  }

  // Double check overlap on server side
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

  // --- Email Notification Logic ---
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
        from: 'Falaq Corner <onboarding@resend.dev>',
        to: 'falaqbranding@gmail.com',
        subject: `New Leave Request: ${userName}`,
        html: `
          <div style="font-family: sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; max-width: 600px; background-color: #ffffff;">
            <h2 style="color: #0f172a; margin-bottom: 8px;">New Leave Application</h2>
            <p style="color: #64748b; margin-top: 0;">A new leave request has been submitted through Falaq Corner.</p>
            
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; margin: 24px 0;">
              <p style="margin: 8px 0;"><strong>Employee:</strong> ${userName}</p>
              <p style="margin: 8px 0;"><strong>Leave Type:</strong> ${leaveType}</p>
              <p style="margin: 8px 0;"><strong>Dates:</strong> ${startDate} to ${endDate}</p>
              <p style="margin: 8px 0;"><strong>Reason:</strong> ${reason}</p>
            </div>
            
            <p style="font-size: 14px; color: #94a3b8;">This is an automated notification. Please log in to the dashboard to review this request.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #cbd5e1; text-align: center;">Falaq Corner Dashboard</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send leave notification email:', emailError);
    }
  }

  revalidatePath('/falaq-corner');
  return { data: data as Leave };
}

export async function cancelLeave(leaveId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in.' };
  }

  const { error } = await supabase
    .from('leaves')
    .update({ status: 'Cancelled' })
    .eq('id', leaveId)
    .eq('user_id', user.id)
    .in('status', ['Pending', 'Approved']);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/falaq-corner');
  return { success: true };
}
