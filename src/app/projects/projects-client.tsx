
'use client';

import { useState } from 'react';
import { Plus, ChevronDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import type { Project, Profile, Client } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { FilterIcon } from '@/components/icons';
import { AddProjectDialog } from '@/components/dashboard/add-project-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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

interface ProjectsClientProps {
  initialProjects: ProjectWithOwner[];
  currentUser: User | null;
  profiles: Profile[];
  clients: Client[];
}

export default function ProjectsClient({ initialProjects, currentUser, profiles, clients }: ProjectsClientProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [isSectionOpen, setSectionOpen] = useState(true);
  const [isAddProjectOpen, setAddProjectOpen] = useState(false);
  
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (e) {
      return '-';
    }
  }

  const handleProjectAdded = (newProject: Project) => {
    // This is a simplified version. We might need to refetch to get owner/client data
    const newProjectWithOwner = {
      ...newProject,
      owner: profiles.find(p => p.id === newProject.owner_id) || null,
      client: clients.find(c => c.id === newProject.client_id) || null,
    };
    setProjects(prev => [newProjectWithOwner as ProjectWithOwner, ...prev]);
  }

  return (
    <>
      <Card>
          <CardHeader>
              <CardTitle>Projects</CardTitle>
              <CardDescription>
                  Manage your projects here.
              </CardDescription>
          </CardHeader>
          <CardContent>
            <header className="flex items-center justify-between pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Button onClick={() => setAddProjectOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add new
                </Button>
                <Button variant="outline" size="icon">
                  <FilterIcon className="h-5 w-5" />
                </Button>
              </div>
            </header>
            
            <main>
              <div className="mb-4">
                <button onClick={() => setSectionOpen(!isSectionOpen)} className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                    {isSectionOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 -rotate-90" />}
                    Active projects
                    <span className="text-sm font-normal text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{projects.length}</span>
                </button>

                {isSectionOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-3 font-medium text-muted-foreground w-1/3"></th>
                          <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-3 font-medium text-muted-foreground">Priority</th>
                          <th className="px-4 py-3 font-medium text-muted-foreground">Start date</th>
                          <th className="px-4 py-3 font-medium text-muted-foreground">Due date</th>
                          <th className="px-4 py-3 font-medium text-muted-foreground">Members</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.map(project => (
                          <tr key={project.id} className="border-b hover:bg-muted/50">
                            <td className="px-4 py-3 font-medium">{project.name}</td>
                            <td className="px-4 py-3">{project.status ?? "New"}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="font-normal border-yellow-500/30 text-yellow-700 dark:text-yellow-400 bg-yellow-500/10">
                                <span className="mr-2 text-yellow-500">=</span>
                                {project.priority ?? "Medium"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(project.start_date)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(project.due_date)}</td>
                            <td className="px-4 py-3">
                               <div className="flex -space-x-2">
                                {project.members && project.members.slice(0, 3).map(id => {
                                  const profile = profiles.find(p => p.id === id);
                                  if (!profile) return null;
                                  return (
                                      <Avatar key={id} className="h-6 w-6 border-2 border-background">
                                          <AvatarImage src={profile.avatar_url ?? undefined} />
                                          <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                                      </Avatar>
                                  )
                                })}
                                {project.members && project.members.length > 3 && (
                                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground border-2 border-background">
                                      +{project.members.length-3}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={6} className="px-4 pt-4">
                              <Button variant="ghost" className="text-muted-foreground" onClick={() => setAddProjectOpen(true)}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Create project
                              </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </main>
        </CardContent>
      </Card>
      <AddProjectDialog
        isOpen={isAddProjectOpen}
        setIsOpen={setAddProjectOpen}
        clients={clients}
        profiles={profiles}
        currentUser={currentUser}
        onProjectAdded={handleProjectAdded}
      />
    </>
  );
}
