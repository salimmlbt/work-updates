
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

  // Fetch all profiles (including archived to preserve history)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*, roles(*), teams:profile_teams(teams(*))')
    .order('full_name');

  // Fetch all tasks - filter logic handled in memory for maximum robustness
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*, profiles(*), projects(*), clients(*)')
    .eq('is_deleted', false);

  if (profilesError || tasksError) {
    console.error({ profilesError, tasksError });
  }

  // Filter tasks based on submission history entries matching the selected date
  const reportTasks = (tasks as any[] || []).filter(task => {
    let history: SubmissionHistoryEntry[] = [];
    const rawHistory = task.submission_history;
    
    if (Array.isArray(rawHistory)) {
        history = rawHistory;
    } else if (typeof rawHistory === 'string' && rawHistory.trim().startsWith('[')) {
        try { history = JSON.parse(rawHistory); } catch (e) {}
    }

    if (!history || !Array.isArray(history) || history.length === 0) return false;

    // Check if any submission in the history matches the selected day
    const entriesForDate = history.filter(entry => entry.date && entry.date.startsWith(selectedDate));
    if (entriesForDate.length === 0) return false;

    // 🛡️ Accidental Submission Check:
    // Only hide if the task is currently active AND the latest entry globally is today's entry (being hidden).
    const isCurrentlyActive = task.status === 'todo' || task.status === 'inprogress';
    const isPosting = task.posting_status === 'Scheduled' || task.posting_status === 'Posted';

    if (isCurrentlyActive && !isPosting) {
        const latestGlobalEntry = history[history.length - 1];
        const latestEntryOnDate = entriesForDate[entriesForDate.length - 1];
        const isLatestGlobalEntryBeingViewed = latestGlobalEntry.date === latestEntryOnDate.date;

        if (isLatestGlobalEntryBeingViewed) {
            const isLegitimateSubmitToday = latestEntryOnDate.type === 'correction' || latestEntryOnDate.type === 'recreate' || latestEntryOnDate.type === 'completed';
            const hasMultipleSubmitsToday = entriesForDate.length > 1;
            
            if (!isLegitimateSubmitToday && !hasMultipleSubmitsToday) {
                return false;
            }
        }
    }

    return true;
  }).map(task => {
      let history: SubmissionHistoryEntry[] = [];
      const rawHistory = task.submission_history;
      if (Array.isArray(rawHistory)) {
          history = rawHistory;
      } else if (typeof rawHistory === 'string' && rawHistory.trim().startsWith('[')) {
          try { history = JSON.parse(rawHistory); } catch (e) {}
      }

      const entriesForDate = history.filter(entry => entry.date && entry.date.startsWith(selectedDate));
      const latestEntryOnDate = entriesForDate[entriesForDate.length - 1];
      
      return {
          ...task,
          submission_type: latestEntryOnDate?.type || 'original',
          submitted_at: latestEntryOnDate?.date || task.status_updated_at || task.created_at
      };
  });

  // Ensure every task has a user profile associated even if it's not in the joined data
  const profilesMap = new Map((profiles as Profile[] || []).map(p => [p.id, p]));
  
  const reportTasksWithProfiles = reportTasks.map(task => ({
      ...task,
      profiles: task.profiles || profilesMap.get(task.assignee_id) || null
  }));

  // Include only profiles that have work on this specific date
  const activeProfiles = (profiles as Profile[] || []).filter(profile => 
    reportTasksWithProfiles.some(task => task.assignee_id === profile.id)
  );

  return (
    <ReportClient 
      initialProfiles={activeProfiles} 
      initialTasks={reportTasksWithProfiles as any[]} 
      selectedDate={selectedDate}
    />
  );
}
