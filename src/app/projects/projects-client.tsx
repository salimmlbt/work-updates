
'use client';

import { useState, useMemo } from 'react';
import { Plus, ChevronDown, Filter } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
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

const ProjectSidebar = ({ 
    activeView, 
    setActiveView,
    projectTypes 
}: { 
    activeView: string, 
    setActiveView: (view: string) => void,
    projectTypes: string[]
}) => {
    return (
        <aside className="md:col-span-1">
            <h2 className="text-lg font-bold mb-4">Type</h2>
            <nav className="space-y-1">
                <div
                    key="all-projects"
                    role="button"
                    onClick={() => setActiveView('general')}
                    className={cn(
                        buttonVariants({ variant: 'ghost' }),
                        'w-full justify-start text-left h-auto pr-8 group',
                        activeView === 'general'
                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                            : 'hover:bg-accent'
                    )}
                >
                   All Projects
                </div>
                {projectTypes.map(type => (
                     <div
                        key={type}
                        role="button"
                        onClick={() => setActiveView(type)}
                        className={cn(
                            buttonVariants({ variant: 'ghost' }),
                            'w-full justify-start text-left h-auto pr-8 group',
                            activeView === type
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                                : 'hover:bg-accent'
                        )}
                    >
                       {type}
                    </div>
                ))}
                <Button
                    variant="ghost"
                    className="mt-2 text-muted-foreground inline-flex p-0 h-auto hover:bg-transparent hover:text-blue-500 focus:ring-0 focus:ring-offset-0 px-0"
                    onClick={() => { /* Add Type functionality here */ }}
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Type
                </Button>
            </nav>
        </aside>
    )
}

export default function ProjectsClient({ initialProjects, currentUser, profiles, clients }: ProjectsClientProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [isSectionOpen, setSectionOpen] = useState(true);
  const [isAddProjectOpen, setAddProjectOpen] = useState(false);
  const [activeView, setActiveView] = useState('general');
  
  const projectTypes = useMemo(() => {
    const types = new Set<string>();
    projects.forEach(p => {
        if (p.type) {
            types.add(p.type)
        }
    });
    return Array.from(types);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (activeView === 'general') {
        return projects;
    }
    return projects.filter(p => p.type === activeView);
  }, [projects, activeView]);

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
    <div className="p-4 md:p-8 lg:p-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        <ProjectSidebar activeView={activeView} setActiveView={setActiveView} projectTypes={projectTypes} />
        <main className="md:col-span-3">
            <Card>
                <CardHeader>
                    <CardTitle>{activeView === 'general' ? 'All Projects' : activeView}</CardTitle>
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
                          <span className="text-sm font-normal text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{filteredProjects.length}</span>
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
                              {filteredProjects.map(project => (
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
        </main>
      </div>
       <AddProjectDialog
          isOpen={isAddProjectOpen}
          setIsOpen={setAddProjectOpen}
          clients={clients}
          profiles={profiles}
          currentUser={currentUser}
          onProjectAdded={handleProjectAdded}
        />
    </div>
  );
}
