
import { createServerClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Role, Profile, Team, WorkType } from '@/lib/types';
import RolesClient from './roles-client';
import TeamsClient from './teams-client';

async function getRoles(supabase: any) {
    return await supabase.from('roles').select('*');
}

export default async function TeamsPage() {
  const supabase = await createServerClient();
  
  let { data: rolesData, error: rolesError } = await getRoles(supabase);

  if (rolesError) {
    console.error('Error fetching roles:', rolesError);
  }

  const adminRoleExists = rolesData?.some(r => r.name === 'Falaq Admin');

  if (!adminRoleExists) {
    const { error: insertError } = await supabase.from('roles').insert({
      name: 'Falaq Admin',
      permissions: {
        dashboard: "Editor",
        projects: "Editor",
        tasks: "Editor",
        clients: "Editor",
        calendar: "Editor",
        chat: "Editor",
        billing: "Editor",
        teams: "Editor",
        settings: "Editor",
        accessibility: "Editor"
      }
    });
    
    if (insertError) {
        console.error('Error creating admin role:', insertError);
    } else {
      // Re-fetch roles after creating the admin role
      const { data: updatedRolesData } = await getRoles(supabase);
      rolesData = updatedRolesData;
    }
  }

  const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*, roles(*), teams:profile_teams(teams!inner(*))');
  const { data: teamsData, error: teamsError } = await supabase.from('teams').select('*');
  const { data: workTypesData, error: workTypesError } = await supabase.from('work_types').select('*');

  if (profilesError) console.error('Error fetching profiles:', profilesError);
  if (teamsError) console.error('Error fetching teams:', teamsError);
  if (workTypesError) console.error('Error fetching work types:', workTypesError);


  const roles = rolesData as Role[] ?? [];
  const profiles = profilesData as Profile[] ?? [];
  const teams = teamsData as Team[] ?? [];
  const workTypes = workTypesData as WorkType[] ?? [];

  const permissionsList = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'projects', label: 'Projects' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'clients', label: 'Clients' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'chat', label: 'Chat' },
    { id: 'billing', label: 'Billing' },
    { id: 'teams', label: 'Team & Users' },
    { id: 'settings', label: 'Settings' },
    { id: 'accessibility', label: 'Accessibility' },
  ];

  return (
    <div className="p-4 md:p-8 lg:p-10">
      <Tabs defaultValue="teams" className="space-y-4">
        <TabsList className="bg-transparent p-0 border-b rounded-none gap-6">
          <TabsTrigger
            value="general"
            className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent text-muted-foreground px-1 pb-2"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="teams"
            className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent text-muted-foreground px-1 pb-2"
          >
            Teams & Users
          </TabsTrigger>
          <TabsTrigger
            value="roles"
            className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent text-muted-foreground px-1 pb-2"
          >
            Roles & Permissions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                General team settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>General team settings will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="teams" className="mt-6">
          <TeamsClient 
            initialUsers={profiles} 
            initialRoles={roles} 
            initialTeams={teams}
            workTypes={workTypes}
          />
        </TabsContent>
        <TabsContent value="roles" className="mt-6">
          <RolesClient initialRoles={roles} permissionsList={permissionsList} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
