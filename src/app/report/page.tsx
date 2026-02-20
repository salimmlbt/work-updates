
import { createServerClient } from '@/lib/supabase/server';
import ReportClient from './report-client';
import type { Profile } from '@/lib/types';
import { formatInTimeZone } from 'date-fns-tz';
import { redirect } from 'next/navigation';

/**
 * REBUILT DAILY WORK REPORT PAGE
 * Uses the report_entries table as the single source of truth for work submissions.
 */

export const dynamic = 'force-dynamic';

export default async function ReportPage({ searchParams }: { searchParams: { date?: string } }) {
  const supabase = await createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: currentUserProfile } = await supabase.from('profiles').select('*, roles(*)').eq('id', authUser.id).single();
  const permissions = (currentUserProfile?.roles as any)?.permissions || {};
  const isFalaqAdmin = currentUserProfile?.roles?.name === 'Falaq Admin';

  if (!isFalaqAdmin && permissions.report === 'Restricted') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500">You do not have permission to view the Daily Work Report.</p>
      </div>
    );
  }

  const selectedDate = searchParams.date || formatInTimeZone(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');

  const { data: reportEntries, error: reportError } = await supabase
    .from('report_entries')
    .select(`
        *,
        tasks (
          *, 
          projects (*), 
          clients (*)
        ),
        profiles (*)
    `)
    .gte('submitted_at', `${selectedDate}T00:00:00+05:30`)
    .lte('submitted_at', `${selectedDate}T23:59:59+05:30`)
    .order('submitted_at', { ascending: false });

  if (reportError) {
    console.error('Error fetching report entries:', JSON.stringify(reportError, null, 2));
  }

  // Format data for the client component
  const submissions = (reportEntries || [])
    .filter((entry: any) => entry.tasks)
    .map((entry: any) => {
      const task = entry.tasks;
      return {
        ...task,
        id: entry.id, // Entry ID for UI keys
        taskId: entry.task_id,
        assignee_id: entry.user_id,
        profiles: entry.profiles,
        clients: task.clients || task.projects?.clients || null,
        submission_type: entry.is_correction_cycle ? 'correction' : 'original',
        final_status: entry.final_status,
        submitted_at: entry.submitted_at
      };
    });

  const activeProfiles = Array.from(new Set(submissions.map(s => s.assignee_id)))
    .map(id => submissions.find(s => s.assignee_id === id)?.profiles)
    .filter(Boolean) as Profile[];

  return (
    <ReportClient 
      initialProfiles={activeProfiles} 
      initialSubmissions={submissions as any[]} 
      selectedDate={selectedDate}
    />
  );
}
