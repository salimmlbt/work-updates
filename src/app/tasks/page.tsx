
import { createServerClient } from '@/lib/supabase/server';
import type { Task, Profile, Client, Project, TaskWithDetails } from '@/lib/types';
import TasksLoader from './tasks-loader';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
    const supabase = createServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    let userProfile: Profile | null = null;
    if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*, roles(*), teams:profile_teams(teams(*))').eq('id', user.id).single();
        userProfile = profileData as Profile;
    }

    const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*, profiles(*), projects(*)');

    const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');

    const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*, teams:profile_teams(teams(*))');

    if (tasksError || clientsError || profilesError) {
        console.error('Error fetching data:', tasksError || clientsError || profilesError);
    }
    
    const tasks = (tasksData as any[] || []).map(task => {
        const client = task.projects?.client_id 
            ? (clientsData as Client[] || []).find(c => c.id === task.projects.client_id)
            : (clientsData as Client[] || []).find(c => c.id === task.client_id);
            
        return { ...task, clients: client || null };
    });

    const projectMap = new Map<string, Project>();
    if (tasksData) {
      tasksData.forEach(task => {
        if (task.projects && !projectMap.has(task.projects.id)) {
          projectMap.set(task.projects.id, task.projects as Project);
        }
      });
    }
    const projects = Array.from(projectMap.values());

    return <TasksLoader 
        initialTasks={tasks as TaskWithDetails[]} 
        projects={projects}
        clients={clientsData as Client[] || []}
        profiles={profilesData as Profile[] || []}
        currentUserProfile={userProfile}
    />
}
