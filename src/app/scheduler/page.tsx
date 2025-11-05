import { createServerClient } from '@/lib/supabase/server';
import SchedulerClient from './scheduler-client';
import type { Client, ContentSchedule, Task } from '@/lib/types';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export type ScheduleWithTask = ContentSchedule & { task: Task | null };

export default async function SchedulerPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [
    clientsRes,
    schedulesRes,
    tasksRes
  ] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('content_schedules').select('*').eq('is_deleted', false),
    supabase.from('tasks').select('*').eq('is_deleted', false).not('schedule_id', 'is', null)
  ]);

  const { data: clients, error: clientsError } = clientsRes;
  const { data: schedules, error: schedulesError } = schedulesRes;
  const { data: tasks, error: tasksError } = tasksRes;

  if (clientsError || schedulesError || tasksError) {
    console.error({ clientsError, schedulesError, tasksError });
    // Handle error display appropriately
  }

  const tasksByScheduleId = new Map(tasks?.map(task => [task.schedule_id, task]));

  const schedulesWithTasks: ScheduleWithTask[] = (schedules || []).map(schedule => ({
    ...schedule,
    task: tasksByScheduleId.get(schedule.id) || null
  }));

  return (
    <SchedulerClient
      clients={clients as Client[] ?? []}
      initialSchedules={schedulesWithTasks}
    />
  );
}
