
import { createServerClient } from '@/lib/supabase/server';
import ProjectsClient from './projects-client';
import type { Profile, Client, Project, ProjectType } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
    const supabase = createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch all required data in parallel
    const [
        { data: projectsData, error: projectsError },
        { data: profilesData, error: profilesError },
        { data: clientsData, error: clientsError },
        { data: projectTypesData, error: projectTypesError }
    ] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('project_types').select('*')
    ]);

    if (projectsError) console.error("Error fetching projects:", projectsError);
    if (profilesError) console.error("Error fetching profiles:", profilesError);
    if (clientsError) console.error("Error fetching clients:", clientsError);
    if (projectTypesError) console.error("Error fetching project types:", projectTypesError);

    return (
        <ProjectsClient 
            initialProjects={projectsData ?? []} 
            currentUser={user} 
            profiles={profilesData as Profile[] ?? []}
            clients={clientsData as Client[] ?? []}
            initialProjectTypes={projectTypesData as ProjectType[] ?? []}
        />
    );
}
