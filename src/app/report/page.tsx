
import { createServerClient } from '@/lib/supabase/server';
import ReportClient from './report-client';
import type { Profile, TaskWithDetails, SubmissionHistoryEntry } from '@/lib/types';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function ReportPage({ searchParams }: { searchParams: { date?: string } }) {
  const supabase = await createServerClient();
  const selectedDate = searchParams.date || format(new Date(), 'yyyy-MM-dd');

  // Fetch all active profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*, roles(*), teams:profile_teams(teams(*))')
    .eq('is_archived', false)
    .order('full_name');

  // Fetch tasks that have been submitted for review
  // We fetch tasks that are NOT in 'todo' or 'inprogress' status (meaning they are in some review/done state)
  // and have a submission_history. We filter by date in the application logic for simplicity and accuracy.
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*, profiles(*), projects(*), clients(*)')
    .eq('is_deleted', false)
    .not('status', 'in', '("todo","inprogress")')
    .not('submission_history', 'is', null);

  if (profilesError || tasksError) {
    console.error({ profilesError, tasksError });
  }

  // Filter tasks that have a submission record for the selected date
  const reportTasks = (tasks as any[] || []).filter(task => {
    const history = task.submission_history as SubmissionHistoryEntry[] || [];
    return history.some(entry => entry.date.startsWith(selectedDate));
  }).map(task => {
      // Find the specific submission type for this date
      const history = task.submission_history as SubmissionHistoryEntry[] || [];
      const entryForDate = history.find(entry => entry.date.startsWith(selectedDate));
      return {
          ...task,
          submission_type: entryForDate?.type || 'original',
          submitted_at: entryForDate?.date || task.status_updated_at
      };
  });

  return (
    <ReportClient 
      initialProfiles={profiles as Profile[] || []} 
      initialTasks={reportTasks as (TaskWithDetails & { submission_type: string, submitted_at: string })[]} 
      selectedDate={selectedDate}
    />
  );
}
