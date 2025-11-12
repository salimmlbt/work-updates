
import { createServerClient } from '@/lib/supabase/server';
import ClientsPageClient from './clients-page-client';
import type { Industry, Project, Task, Client } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const supabase = await createServerClient();
  const [
    { data: clients, error: clientsError },
    { data: industries, error: industriesError },
    { data: projects, error: projectsError },
    { data: tasks, error: tasksError }
  ] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('industries').select('*').order('name'),
    supabase.from('projects').select('id, client_id, status').eq('is_deleted', false),
    supabase.from('tasks').select('id, client_id, parent_task_id, status').eq('is_deleted', false)
  ]);

  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
  }
  if (industriesError) {
    console.error('Error fetching industries:', industriesError);
  }
   if (projectsError) {
    console.error('Error fetching projects:', projectsError);
  }
  if (tasksError) {
    console.error('Error fetching tasks:', tasksError);
  }
  
  const clientsWithStats = (clients as Client[] ?? []).map(client => {
    const clientProjects = (projects as Project[] ?? []).filter(p => p.client_id === client.id);
    const clientTasks = (tasks as Task[] ?? []).filter(t => t.client_id === client.id && !t.parent_task_id);
    const postingTasks = (tasks as Task[] ?? []).filter(t => t.client_id === client.id && !!t.parent_task_id);

    const completedProjects = clientProjects.filter(p => p.status === 'Done').length;
    const completedTasks = clientTasks.filter(t => t.status === 'approved' || t.status === 'done').length;

    const taskCompletion = clientTasks.length > 0 ? Math.round((completedTasks / clientTasks.length) * 100) : 0;
    
    return {
      ...client,
      total_projects: clientProjects.length,
      completed_projects: completedProjects,
      total_tasks: clientTasks.length,
      completed_tasks: completedTasks,
      posting_tasks: postingTasks.length,
      extras: postingTasks.length, // Using posting tasks for extras as per layout
      task_completion_percentage: taskCompletion,
    };
  });


  return <ClientsPageClient 
    initialClients={clientsWithStats ?? []} 
    industries={industries as Industry[] ?? []} 
    allProjects={projects as Project[] ?? []}
    allTasks={tasks as Task[] ?? []}
  />;
}
