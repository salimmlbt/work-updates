
import { createServerClient } from '@/lib/supabase/server';
import SchedulerClient from './scheduler-client';
import type { Client, ContentSchedule, Task, Team, Profile } from '@/lib/types';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export type ScheduleWithDetails = ContentSchedule & {
  task: Task | null;
  teams: Team | null;
};

export default async function SchedulerPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [
    clientsRes,
    schedulesRes,
    tasksRes,
    teamsRes,
    profilesRes,
  ] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('content_schedules').select('*, teams(*)').eq('is_deleted', false),
    supabase.from('tasks').select('*, profiles(*), projects(*), clients(*)').eq('is_deleted', false).not('schedule_id', 'is', null),
    supabase.from('teams').select('*'),
    supabase.from('profiles').select('*'),
  ]);

  const { data: clients, error: clientsError } = clientsRes;
  const { data: schedules, error: schedulesError } = schedulesRes;
  const { data: tasks, error: tasksError } = tasksRes;
  const { data: teams, error: teamsError } = teamsRes;
  const { data: profiles, error: profilesError } = profilesRes;

  if (clientsError || schedulesError || tasksError || teamsError || profilesError) {
    console.error({ clientsError, schedulesError, tasksError, teamsError, profilesError });
    // Handle error display appropriately
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
    />
  );
}
