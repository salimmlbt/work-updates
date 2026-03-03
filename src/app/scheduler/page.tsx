
import { createServerClient } from '@/lib/supabase/server';
import SchedulerClient from './scheduler-client';
import type { Client, ContentSchedule, Task, Team, Profile, Project } from '@/lib/types';
import { redirect } from 'next/navigation';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export type ScheduleWithDetails = ContentSchedule & {
  task: Task | null;
  teams: Team | null;
  projects: Project | null;
};

export default async function SchedulerPage({ searchParams }: { searchParams: { client?: string, month?: string } }) {
  const supabase = await createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('profiles').select('*, roles(*)').eq('id', authUser.id).single();
  const permissions = (profile?.roles as any)?.permissions || {};
  const isFalaqAdmin = profile?.roles?.name === 'Falaq Admin';

  if (!isFalaqAdmin && permissions.scheduler === 'Restricted') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500">You do not have permission to view the Content Scheduler.</p>
      </div>
    );
  }

  // Calculate Month Range
  const selectedMonth = (await searchParams).month || format(new Date(), 'yyyy-MM');
  const monthDate = new Date(`${selectedMonth}-01T00:00:00Z`);
  const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');

  const [
    clientsRes,
    schedulesRes,
    tasksRes,
    teamsRes,
    profilesRes,
    projectsRes,
  ] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('content_schedules')
      .select('*, teams(*), projects(*)')
      .gte('scheduled_date', monthStart)
      .lte('scheduled_date', monthEnd),
    supabase.from('tasks')
      .select('*, profiles(*), projects(*), clients(*)')
      .eq('is_deleted', false)
      .not('schedule_id', 'is', null)
      .gte('deadline', monthStart)
      .lte('deadline', monthEnd),
    supabase.from('teams').select('*'),
    supabase.from('profiles').select('*, roles(*), teams:profile_teams(teams(*))'),
    supabase.from('projects').select('*'),
  ]);

  const { data: clients, error: clientsError } = clientsRes;
  const { data: schedules, error: schedulesError } = schedulesRes;
  const { data: tasks, error: tasksError } = tasksRes;
  const { data: teams, error: teamsError } = teamsRes;
  const { data: profiles, error: profilesError } = profilesRes;
  const { data: projects, error: projectsError } = projectsRes;

  if (clientsError || schedulesError || tasksError || teamsError || profilesError || projectsError) {
    console.error({ clientsError, schedulesError, tasksError, teamsError, profilesError, projectsError });
  }

  const tasksByScheduleId = new Map(tasks?.map(task => [task.schedule_id, task]));

  const schedulesWithDetails: ScheduleWithDetails[] = (schedules as any[] || []).map(schedule => ({
    ...schedule,
    task: tasksByScheduleId.get(schedule.id) || null,
  }));

  return (
    <SchedulerClient
      clients={clients as Client[] ?? []}
      initialSchedules={schedulesWithDetails}
      teams={teams as Team[] ?? []}
      profiles={profiles as Profile[] ?? []}
      projects={projects as Project[] ?? []}
      selectedMonth={selectedMonth}
    />
  );
}
