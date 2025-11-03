import { createServerClient } from '@/lib/supabase/server';
import type { Task, Profile, Client, Project, TaskWithDetails } from '@/lib/types';
import ProjectsPageLoader from './projects-page-loader';
import TasksPageLoader from './tasks-page-loader';

// ✅ This controls Next.js caching behavior
export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const supabase = createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  let userProfile: Profile | null = null;
  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, roles(*), teams:profile_teams(teams(*))')
      .eq('id', user.id)
      .single();

    userProfile = profileData as Profile;
  }

  const [
    { data: tasksData, error: tasksError },
    { data: clientsData, error: clientsError },
    { data: profilesData, error: profilesError },
    { data: allProjectsData, error: allProjectsError },
  ] = await Promise.all([
    supabase.from('tasks').select('*, projects(id, name, clients(id, name))'),
    supabase.from('clients').select('*'),
    supabase.from('profiles').select('*, teams:profile_teams(teams(*))'),
    supabase.from('projects').select('*').eq('is_deleted', false),
  ]);

  if (tasksError || clientsError || profilesError || allProjectsError) {
    console.error('Error fetching data:', tasksError, clientsError, profilesError, allProjectsError);
  }

  const tasks = (tasksData as any[] || []).map(task => ({
      ...task,
      clients: task.projects?.clients || null,
      projects: {
        ...task.projects,
        clients: undefined,
      }
    }));


  return (
    <TasksPageLoader
      initialTasks={tasks as TaskWithDetails[]}
      projects={(allProjectsData as Project[]) || []}
      clients={(clientsData as Client[]) || []}
      profiles={(profilesData as Profile[]) || []}
      currentUserProfile={userProfile}
    />
  );
}
