
import { createServerClient } from '@/lib/supabase/server';
import dynamic from 'next/dynamic';
import type { Task, Profile, Client, Project, TaskWithDetails } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

const TasksClient = dynamic(() => import('./tasks-client'), {
    ssr: false,
    loading: () => (
        <div className="p-6">
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

    return <TasksClient 
        initialTasks={tasks as TaskWithDetails[]} 
        projects={projects}
        clients={clientsData as Client[] || []}
        profiles={profilesData as Profile[] || []}
        currentUserProfile={userProfile}
    />
}
