
import { createServerClient } from '@/lib/supabase/server';
import type { Task, Profile, Client, Project, TaskWithDetails } from '@/lib/types';
import TasksPageLoader from './tasks-page-loader';

export const dynamic = 'force-dynamic';

export default async function TasksPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    let userProfile: Profile | null = null;
    if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*, roles(*), teams:profile_teams(teams(*))').eq('id', user.id).single();
        userProfile = profileData as Profile;
    }

    const [
        tasksResponse,
        clientsResponse,
        profilesResponse,
        projectsResponse,
    ] = await Promise.all([
        supabase.from('tasks').select('*, profiles(id, full_name, avatar_url), projects(id, name, client_id)').order('created_at', { ascending: false }),
        supabase.from('clients').select('*'),
        supabase.from('profiles').select('*, teams:profile_teams(teams(*))'),
        supabase.from('projects').select('*').eq('is_deleted', false),
    ]);

    const { data: tasksData, error: tasksError } = tasksResponse;
    const { data: clientsData, error: clientsError } = clientsResponse;
    const { data: profilesData, error: profilesError } = profilesResponse;
    const { data: allProjectsData, error: allProjectsError } = projectsResponse;


    if (tasksError || clientsError || profilesError || allProjectsError) {
        console.error('Error fetching data:', tasksError, clientsError, profilesError, allProjectsError);
    }
    
    const tasks = (tasksData as any[] || []).map(task => {
        const client = task.projects?.client_id 
            ? (clientsData as Client[] || []).find(c => c.id === task.projects.client_id)
            : (clientsData as Client[] || []).find(c => c.id === task.client_id);
            
        return { ...task, clients: client || null };
    });

    const taskId = searchParams?.taskId as string | undefined;

    return (
        <TasksPageLoader 
            initialTasks={tasks as TaskWithDetails[]} 
            projects={allProjectsData as Project[] || []}
            clients={clientsData as Client[] || []}
            profiles={profilesData as Profile[] || []}
            currentUserProfile={userProfile}
            highlightedTaskId={taskId}
        />
    )
}
