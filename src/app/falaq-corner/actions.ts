
'use server'

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Leave } from '@/lib/types';

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

  if (!startDate || !endDate || !leaveType) {
    return { error: 'Missing required fields.' };
  }

  const { data, error } = await supabase
    .from('leaves')
    .insert({
      user_id: user.id,
      start_date: startDate,
      end_date: endDate,
      leave_type: leaveType,
      reason: reason || null,
      status: 'Pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error applying for leave:', error);
    return { error: error.message };
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
    .eq('user_id', user.id) // Security check
    .in('status', ['Pending', 'Approved']);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/falaq-corner');
  return { success: true };
}
