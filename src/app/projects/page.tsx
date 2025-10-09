
import { createServerClient } from '@/lib/supabase/server';
import ProjectsClient from './projects-client';
import ProjectTypes from './project-types';
import type { Profile, Client } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="p-4 md:p-8 lg:p-10">
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="bg-transparent p-0 border-b rounded-none gap-6">
          <TabsTrigger
            value="general"
            className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent text-muted-foreground px-1 pb-2"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="project-type"
            className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent text-muted-foreground px-1 pb-2"
          >
            Project Type
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-6">
            <ProjectsClient 
              initialProjects={projectsWithOwnerAndClient as any} 
              currentUser={user} 
              profiles={profiles as Profile[] ?? []}
              clients={clients as Client[] ?? []}
            />
        </TabsContent>
        <TabsContent value="project-type" className="mt-6">
            <ProjectTypes />
        </TabsContent>
      </Tabs>
    </div>
  );
}
