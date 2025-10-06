
import { createServerClient } from '@/lib/supabase/server';
import ProjectsClient from './projects-client';
import type { Profile, Client } from '@/lib/types';

export default async function ProjectsPage() {
  const supabase = createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  const projectsPromise = supabase
    .from('projects')
    .select('*, owner:profiles(*), client:clients(*)');

  const profilesPromise = supabase.from('profiles').select('*');
  const clientsPromise = supabase.from('clients').select('*');

  const [{ data: projects, error }, { data: profiles }, { data: clients }] = await Promise.all([
    projectsPromise,
    profilesPromise,
    clientsPromise
  ]);

  if (error) {
    console.error('Error fetching projects:', error);
  }

  // The data now comes correctly shaped, so we can cast it.
  const projectsWithOwnerAndClient = projects || [];


  return (
    <ProjectsClient 
      initialProjects={projectsWithOwnerAndClient as any} 
      currentUser={user} 
      profiles={profiles as Profile[] ?? []}
      clients={clients as Client[] ?? []}
    />
  );
}
