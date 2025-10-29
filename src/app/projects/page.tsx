
import { createServerClient } from '@/lib/supabase/server';
import ProjectsClient from './projects-client';
import type { Profile, Client, Project, ProjectType } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch all required data in parallel
    const [
        { data: projectsData, error: projectsError },
        { data: profilesData, error: profilesError },
        { data: clientsData, error: clientsError },
        { data: projectTypesData, error: projectTypesError }
    ] = await Promise.all([
        supabase.from('projects').select('*, tasks(id)'), // tasks_count is not a real column. fetch task ids and count them client-side.
        supabase.from('profiles').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('project_types').select('*')
    ]);

    if (projectsError) console.error("Error fetching projects:", projectsError);
    if (profilesError) console.error("Error fetching profiles:", profilesError);
    if (clientsError) console.error("Error fetching clients:", clientsError);
    if (projectTypesError) console.error("Error fetching project types:", projectTypesError);

    const projectsWithTaskCount = (projectsData as any[] ?? []).map(p => ({
        ...p,
        tasks_count: p.tasks.length,
        tasks: undefined, // remove the tasks array
    }));

    return (
        <ProjectsClient 
            initialProjects={projectsWithTaskCount as Project[]} 
            currentUser={user} 
            profiles={profilesData as Profile[] ?? []}
            clients={clientsData as Client[] ?? []}
            initialProjectTypes={projectTypesData as ProjectType[] ?? []}
        />
    );
}
