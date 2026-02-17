
import { createServerClient } from '@/lib/supabase/server';
import ReportClient from './report-client';
import type { Profile, SubmissionHistoryEntry } from '@/lib/types';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ReportPage({ searchParams }: { searchParams: { date?: string } }) {
  const supabase = await createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*, roles(*)').eq('id', authUser.id).single();
  const permissions = (profile?.roles as any)?.permissions || {};
  const isFalaqAdmin = profile?.roles?.name === 'Falaq Admin';

  if (!isFalaqAdmin && permissions.report === 'Restricted') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500">You do not have permission to view the Daily Work Report.</p>
      </div>
    );
  }

  // Use IST for the default date to fix midnight submission bias
  const selectedDate = searchParams.date || formatInTimeZone(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');

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
        const rawHistory = task.submission_history;
        if (rawHistory) {
            if (Array.isArray(rawHistory)) {
                history = rawHistory;
            } else if (typeof rawHistory === 'string' && rawHistory.trim().startsWith('[')) {
                history = JSON.parse(rawHistory);
            }
        }
    } catch (e) {
        console.warn("Could not parse submission history for task", task.id);
        return false;
    }

    // Check if any submission in the history matches the selected day
    const entryForDate = history.find(entry => entry.date && entry.date.startsWith(selectedDate));
    
    if (!entryForDate) return false;

    // Logic: Only show tasks that reached a submission state (Review, Completed, Scheduled, Posted)
    const isSubmission = entryForDate.type === 'original' || 
                         entryForDate.type === 'correction' || 
                         entryForDate.type === 'recreate' || 
                         entryForDate.type === 'completed' || 
                         entryForDate.type === 'scheduled' || 
                         entryForDate.type === 'posted';

    return isSubmission;
  }).map(task => {
      let history: SubmissionHistoryEntry[] = [];
      try {
          const rawHistory = task.submission_history;
          if (Array.isArray(rawHistory)) {
              history = rawHistory;
          } else if (typeof rawHistory === 'string' && rawHistory.trim().startsWith('[')) {
              history = JSON.parse(rawHistory);
          }
      } catch (e) {}

      // Find the specific submission entry for this date to determine the label
      // We look for the LATEST entry of the day to capture status updates (like Approval) on same-day submissions
      const entriesForDate = history.filter(entry => entry.date && entry.date.startsWith(selectedDate));
      const latestEntry = entriesForDate[entriesForDate.length - 1];
      
      return {
          ...task,
          submission_type: latestEntry?.type || 'original',
          submitted_at: latestEntry?.date || task.status_updated_at || task.created_at
      };
  });

  // Only show users who have tasks for this specific date
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
