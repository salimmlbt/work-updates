
import { createServerClient } from '@/lib/supabase/server';
import type { Task, Profile, Client, Project, TaskWithDetails } from '@/lib/types';
import dynamicImport from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

const TasksClient = dynamicImport(() => import('./tasks-client'), {
    ssr: false,
    loading: () => (
        <div className="p-6 h-full">
            <div className="flex items-center justify-between pb-4 mb-4 border-b">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-40" />
                </div>
            </div>
            <div className="space-y-8">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <div className="border rounded-lg">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
            </div>
        </div>
    )
});

export default async function TasksPage() {
    const supabase = createServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    let userProfile: Profile | null = null;
    if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*, roles(*), teams:profile_teams(teams(*))').eq('id', user.id).single();
        userProfile = profileData as Profile;
    }

    const [
        { data: tasksData, error: tasksError },
        { data: clientsData, error: clientsError },
        { data: profilesData, error: profilesError },
        { data: allProjectsData, error: allProjectsError }
    ] = await Promise.all([
        supabase.from('tasks').select('*, profiles(*), projects(id, name, client_id)'),
        supabase.from('clients').select('*'),
        supabase.from('profiles').select('*, teams:profile_teams(teams(*))'),
        supabase.from('projects').select('*').eq('is_deleted', false) // Fetch all active projects
    ]);


    if (tasksError || clientsError || profilesError || allProjectsError) {
        console.error('Error fetching data:', tasksError, clientsError, profilesError, allProjectsError);
    }
    
    const tasks = (tasksData as any[] || []).map(task => {
        const client = task.projects?.client_id 
            ? (clientsData as Client[] || []).find(c => c.id === task.projects.client_id)
            : (clientsData as Client[] || []).find(c => c.id === task.client_id);
            
        return { ...task, clients: client || null };
    });

    return <TasksClient 
        initialTasks={tasks as TaskWithDetails[]} 
        projects={allProjectsData as Project[] || []}
        clients={clientsData as Client[] || []}
        profiles={profilesData as Profile[] || []}
        currentUserProfile={userProfile}
    />
}
