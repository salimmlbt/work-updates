
import { createServerClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Role, Profile, Team } from '@/lib/types';
import RolesClient from './roles-client';
import TeamsClient from './teams-client';

async function getRoles(supabase: ReturnType<typeof createServerClient>) {
    return await supabase.from('roles').select('*');
}

export default async function TeamsPage() {
  const supabase = createServerClient();
  
  let { data: rolesData } = await getRoles(supabase);

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
      }
    });
    
    if (!insertError) {
      // Re-fetch roles after creating the admin role
      const { data: updatedRolesData } = await getRoles(supabase);
      rolesData = updatedRolesData;
    }
  }
  
  const { data: profilesData } = await supabase.from('profiles').select('*, roles(*), teams:profile_teams(teams(*))');
  const { data: teamsData } = await supabase.from('teams').select('*');

  const roles = rolesData as Role[] ?? [];
  const profiles = profilesData as Profile[] ?? [];
  const teams = teamsData as Team[] ?? [];

  const permissionsList = [
    { id: 'dashboard', label: 'Can the "{ROLE_NAME}" Access Dashboard?' },
    { id: 'projects', label: 'Can the "{ROLE_NAME}" Access Projects?' },
    { id: 'tasks', label: 'Can the "{ROLE_NAME}" Access Tasks?' },
    { id: 'clients', label: 'Can the "{ROLE_NAME}" Access Clients?' },
    { id: 'calendar', label: 'Can the "{ROLE_NAME}" Access Calendar?' },
    { id: 'chat', label: 'Can the "{ROLE_NAME}" Access Chat?' },
    { id: 'billing', label: 'Can the "{ROLE_NAME}" Access Billing?' },
    { id: 'teams', label: 'Can the "{ROLE_NAME}" Access Team & Users?' },
    { id: 'settings', label: 'Can the "{ROLE_NAME}" Access Settings?' },
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
          />
        </TabsContent>
        <TabsContent value="roles" className="mt-6">
          <RolesClient initialRoles={roles} permissionsList={permissionsList} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
