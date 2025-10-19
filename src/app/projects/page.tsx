
import { createServerClient } from '@/lib/supabase/server';
import ProjectsClient from './projects-client';
import type { Profile, Client, Project, ProjectType } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type ProjectWithOwner = Project & {
    owner: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    } | null;
    client: {
        id: string;
        name: string;
    } | null;
};


export default async function ProjectsPage() {
    const supabase = createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    const { data: projectsData } = await supabase.from('projects').select('*, owner:profiles(*), client:clients(*)').eq('is_deleted', false);
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: clients } = await supabase.from('clients').select('*');
    const { data: projectTypes } = await supabase.from('project_types').select('*');
    const { data: deletedProjectsData } = await supabase.from('projects').select('*, owner:profiles(*), client:clients(*)').eq('is_deleted', true);

    const allProjects = [...(projectsData || []), ...(deletedProjectsData || [])];

    return (
        <ProjectsClient 
            initialProjects={allProjects as ProjectWithOwner[] ?? []} 
            currentUser={user} 
            profiles={profiles as Profile[] ?? []}
            clients={clients as Client[] ?? []}
            initialProjectTypes={projectTypes as ProjectType[] ?? []}
        />
    );
}
