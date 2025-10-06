import { createServerClient } from '@/lib/supabase/server';
import ProjectView from '@/components/dashboard/project-view';
import type { TaskWithAssignee, Client } from '@/lib/types';
import { Suspense } from 'react';

async function DashboardData({ projectId }: { projectId?: string }) {
  const supabase = createServerClient();

  const { data: projects } = await supabase.from('projects').select('id, name');
  
  const currentProjectId = projectId || projects?.[0]?.id;
  
  let tasks: TaskWithAssignee[] = [];
  if (currentProjectId) {
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*, profiles(id, full_name, avatar_url, email)')
      .eq('project_id', currentProjectId)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
    }
    tasks = (tasksData as any) ?? [];
  }

  const { data: profiles } = await supabase.from('profiles').select('*');
  const { data: clients } = await supabase.from('clients').select('*');

  return (
    <ProjectView 
      projects={projects ?? []} 
      initialTasks={tasks}
      currentProjectId={currentProjectId}
      profiles={profiles ?? []}
      clients={clients as Client[] ?? []}
    />
  );
}


export default function DashboardPage({
  searchParams,
}: {
  searchParams: { project?: string };
}) {
  return (
    <Suspense fallback={<div className="text-center p-8">Loading dashboard...</div>}>
      <DashboardData projectId={searchParams.project} />
    </Suspense>
  );
}
