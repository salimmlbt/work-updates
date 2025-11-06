
import { createServerClient } from '@/lib/supabase/server';
import SchedulerClient from './scheduler-client';
import type { Client, ContentSchedule, Task, Team } from '@/lib/types';
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
  ] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('content_schedules').select('*, teams(*)').eq('is_deleted', false),
    supabase.from('tasks').select('*').eq('is_deleted', false).not('schedule_id', 'is', null),
    supabase.from('teams').select('*')
  ]);

  const { data: clients, error: clientsError } = clientsRes;
  const { data: schedules, error: schedulesError } = schedulesRes;
  const { data: tasks, error: tasksError } = tasksRes;
  const { data: teams, error: teamsError } = teamsRes;

  if (clientsError || schedulesError || tasksError || teamsError) {
    console.error({ clientsError, schedulesError, tasksError, teamsError });
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
    />
  );
}
