
import { createServerClient } from '@/lib/supabase/server';
import ClientsPageClient from './clients-page-client';
import type { Industry, Project, Task } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const supabase = await createServerClient();
  const [
    { data: clients, error: clientsError },
    { data: industries, error: industriesError },
    { data: projects, error: projectsError },
    { data: tasks, error: tasksError }
  ] = await Promise.all([
    supabase.from('clients').select('*, projects(id), tasks(id, parent_task_id)').order('created_at', { ascending: false }),
    supabase.from('industries').select('*').order('name'),
    supabase.from('projects').select('*').eq('is_deleted', false),
    supabase.from('tasks').select('id, project_id, type, status').eq('is_deleted', false)
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
  
  const clientsWithCounts = (clients as any[] ?? []).map(c => ({
      ...c,
      projects_count: c.projects.length,
      tasks_count: c.tasks.filter((t: { parent_task_id: string | null }) => !t.parent_task_id).length,
      projects: undefined,
      tasks: undefined
  }));

  return <ClientsPageClient 
    initialClients={clientsWithCounts ?? []} 
    industries={industries as Industry[] ?? []} 
    allProjects={projects as Project[] ?? []}
    allTasks={tasks as Task[] ?? []}
  />;
}
