
import { createServerClient } from '@/lib/supabase/server';
import ClientsPageClient from './clients-page-client';
import type { Industry, Project, Task, Client, ContentSchedule } from '@/lib/types';
import { startOfMonth, endOfMonth, format, subMonths, addMonths } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function ClientsPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = await createServerClient();
  const selectedDate = searchParams.month ? new Date(`${searchParams.month}-01T00:00:00Z`) : new Date();

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const prevMonth = format(subMonths(selectedDate, 1), 'yyyy-MM');
  const nextMonth = format(addMonths(selectedDate, 1), 'yyyy-MM');

  const [
    { data: clients, error: clientsError },
    { data: industries, error: industriesError },
    { data: projects, error: projectsError },
    { data: tasks, error: tasksError },
    { data: schedules, error: schedulesError },
  ] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('industries').select('*').order('name'),
    supabase.from('projects').select('id, client_id, status').eq('is_deleted', false),
    supabase.from('tasks').select('id, client_id, parent_task_id, status, schedule_id, status_updated_at').eq('is_deleted', false),
    supabase.from('content_schedules').select('id, client_id, scheduled_date'),
  ]);

  if (clientsError) console.error('Error fetching clients:', clientsError);
  if (industriesError) console.error('Error fetching industries:', industriesError);
  if (projectsError) console.error('Error fetching projects:', projectsError);
  if (tasksError) console.error('Error fetching tasks:', tasksError);
  if (schedulesError) console.error('Error fetching schedules:', schedulesError);
  
  const allTasks = (tasks as Task[] ?? []);
  
  const clientsWithStats = (clients as Client[] ?? []).map(client => {
    const clientProjects = (projects as Project[] ?? []).filter(p => p.client_id === client.id);
    const clientTasks = allTasks.filter(t => t.client_id === client.id && !t.parent_task_id);
    const postingTasks = allTasks.filter(t => t.client_id === client.id && !!t.parent_task_id);
    
    const clientSchedules = (schedules as ContentSchedule[] ?? []).filter(s => {
      const scheduleDate = new Date(s.scheduled_date);
      return s.client_id === client.id && scheduleDate >= monthStart && scheduleDate <= monthEnd;
    });

    const completedScheduleIds = new Set(
      allTasks.filter(t => {
        if (!t.schedule_id || (t.status !== 'approved' && t.status !== 'done') || !t.status_updated_at) return false;
        const completionDate = new Date(t.status_updated_at);
        return completionDate >= monthStart && completionDate <= monthEnd;
      }).map(t => t.schedule_id)
    );

    const completedSchedules = clientSchedules.filter(s => completedScheduleIds.has(s.id)).length;
    const completedProjects = clientProjects.filter(p => p.status === 'Done').length;
    
    const completedTasksInMonth = clientTasks.filter(t => {
        if ((t.status !== 'approved' && t.status !== 'done') || !t.status_updated_at) return false;
        const completionDate = new Date(t.status_updated_at);
        return completionDate >= monthStart && completionDate <= monthEnd;
    }).length;

    const taskCompletion = clientTasks.length > 0 ? Math.round((completedTasksInMonth / clientTasks.length) * 100) : 0;
    
    return {
      ...client,
      total_projects: clientProjects.length,
      completed_projects: completedProjects,
      total_tasks: clientTasks.length,
      completed_tasks: completedTasksInMonth,
      posting_tasks: postingTasks.length,
      extras: postingTasks.length,
      task_completion_percentage: taskCompletion,
      total_schedules: clientSchedules.length,
      completed_schedules: completedSchedules,
    };
  });


  return <ClientsPageClient 
    initialClients={clientsWithStats ?? []} 
    industries={industries as Industry[] ?? []} 
    allProjects={projects as Project[] ?? []}
    allTasks={allTasks}
    selectedDate={format(selectedDate, 'yyyy-MM-dd')}
    prevMonth={prevMonth}
    nextMonth={nextMonth}
  />;
}
