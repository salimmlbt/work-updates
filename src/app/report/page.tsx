
import { createServerClient } from '@/lib/supabase/server';
import ReportClient from './report-client';
import type { Profile, SubmissionHistoryEntry } from '@/lib/types';
import { format } from 'date-fns';

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

  // Fetch tasks that have a submission history
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*, profiles(*), projects(*), clients(*)')
    .eq('is_deleted', false)
    .not('submission_history', 'is', null);

  if (profilesError || tasksError) {
    console.error({ profilesError, tasksError });
  }

  // Filter tasks based on submission history entries matching the selected date
  const reportTasks = (tasks as any[] || []).filter(task => {
    let history: SubmissionHistoryEntry[] = [];
    try {
        if (task.submission_history) {
            history = Array.isArray(task.submission_history) 
                ? task.submission_history 
                : typeof task.submission_history === 'string'
                    ? JSON.parse(task.submission_history)
                    : [];
        }
    } catch (e) {
        return false;
    }

    // Hide tasks that are currently back in "todo" or "inprogress"
    if (task.status === 'todo' || task.status === 'inprogress') {
        return false;
    }

    // Check if any submission in the history matches the selected day
    return history.some(entry => {
        try {
            return entry.date.startsWith(selectedDate);
        } catch (e) {
            return false;
        }
    });
  }).map(task => {
      let history: SubmissionHistoryEntry[] = [];
      try {
          history = Array.isArray(task.submission_history) 
              ? task.submission_history 
              : JSON.parse(task.submission_history as string);
      } catch (e) {}

      // Find the specific submission entry for this date to determine the label
      const entryForDate = history.find(entry => entry.date.startsWith(selectedDate));
      
      return {
          ...task,
          submission_type: entryForDate?.type || 'original',
          submitted_at: entryForDate?.date || task.status_updated_at || task.created_at
      };
  });

  // CRITICAL CHANGE: Only show users who have tasks for this specific date
  const activeProfiles = (profiles as Profile[] || []).filter(profile => 
    reportTasks.some(task => task.assignee_id === profile.id)
  );

  return (
    <ReportClient 
      initialProfiles={activeProfiles} 
      initialTasks={reportTasks as any[]} 
      selectedDate={selectedDate}
    />
  );
}
