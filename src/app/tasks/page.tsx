
import { createServerClient } from '@/lib/supabase/server';
import TasksClient from './tasks-client';
import type { Task, Profile, Client, Project, TaskWithDetails } from '@/lib/types';


export default async function TasksPage() {
    const supabase = createServerClient();
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

    const projects = (tasksData?.map(t => t.projects).filter(Boolean) as Project[] || []);

    return <TasksClient 
        initialTasks={tasks as TaskWithDetails[]} 
        projects={projects}
        clients={clientsData as Client[] || []}
        profiles={profilesData as Profile[] || []}
    />
}
