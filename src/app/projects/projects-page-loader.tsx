
'use client';

import type { Client, Profile, Project, ProjectType } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import ProjectsClient from './projects-client';

interface ProjectsPageLoaderProps {
    initialProjects: Project[];
    currentUser: User | null;
    profiles: Profile[];
    clients: Client[];
    initialProjectTypes: ProjectType[];
}

export default function ProjectsPageLoader(props: ProjectsPageLoaderProps) {
    return <ProjectsClient {...props} />;
}
