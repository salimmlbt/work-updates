
'use client';

import { useState, useMemo, useTransition } from 'react';
import { Plus, ChevronDown, Filter, LayoutGrid, Table, Folder, MoreVertical, Pencil, Trash2, Trash } from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import type { Project, Profile, Client, ProjectType } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { FilterIcon } from '@/components/icons';
import { AddProjectDialog } from '@/components/dashboard/add-project-dialog';
import { CreateTypeDialog } from './create-type-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { deleteProject } from '@/app/actions';
import { EditProjectDialog } from './edit-project-dialog';

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
  initialProjectTypes: ProjectType[];
}

const ProjectSidebar = ({ 
    activeView, 
    setActiveView,
    projectTypes,
    onAddTypeClick,
    deletedCount
}: { 
    activeView: string, 
    setActiveView: (view: string) => void,
    projectTypes: {name: string, count: number}[],
    onAddTypeClick: () => void,
    deletedCount: number
}) => {
    return (
        <aside className="md:col-span-1">
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
                   All projects
                </div>
                {projectTypes.map(type => (
                     <div
                        key={type.name}
                        role="button"
                        onClick={() => setActiveView(type.name)}
                        className={cn(
                            buttonVariants({ variant: 'ghost' }),
                            'w-full justify-between text-left h-auto pr-8 group',
                            activeView === type.name
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                                : 'hover:bg-accent'
                        )}
                    >
                       <div className="flex items-center gap-2">
                         <Folder className="h-4 w-4" />
                         {type.name}
                       </div>
                       <span className="text-muted-foreground">{type.count}</span>
                    </div>
                ))}
                <Button
                    variant="ghost"
                    className="mt-2 text-muted-foreground inline-flex p-2 h-auto hover:bg-transparent hover:text-blue-500 focus:ring-0 focus:ring-offset-0"
                    onClick={onAddTypeClick}
                >
                    <Plus className="mr-2 h-4 w-4" /> Create type
                </Button>
                 <div
                    key="deleted-projects"
                    role="button"
                    onClick={() => setActiveView('deleted')}
                    className={cn(
                        buttonVariants({ variant: 'ghost' }),
                        'w-full justify-between text-left h-auto pr-8 group mt-4',
                        activeView === 'deleted'
                            ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50'
                            : 'hover:bg-accent'
                    )}
                >
                   <div className="flex items-center gap-2">
                     <Trash className="h-4 w-4 text-red-500" />
                     Deleted Projects
                   </div>
                   <span className="text-muted-foreground">{deletedCount}</span>
                </div>
            </nav>
        </aside>
    )
}

const ProjectRow = ({ project, profiles, handleEditClick, handleDeleteClick }: { project: ProjectWithOwner, profiles: Profile[], handleEditClick: (project: ProjectWithOwner) => void, handleDeleteClick: (project: ProjectWithOwner) => void }) => {
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), 'dd MMM yyyy');
        } catch (e) {
            return '-';
        }
    };

    return (
        <tr className="border-b hover:bg-muted/50 group">
            <td className="px-4 py-3 font-medium">{project.name}</td>
            <td className="px-4 py-3">{project.client?.name ?? '-'}</td>
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
                            +{project.members.length - 3}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-4 py-3">
                {project.owner && (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={project.owner.avatar_url ?? undefined} />
                            <AvatarFallback>{getInitials(project.owner.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">{project.owner.full_name}</span>
                    </div>
                )}
            </td>
            <td className="px-4 py-3 text-muted-foreground">{formatDate(project.created_at)}</td>
            <td className="px-4 py-3 text-muted-foreground">{project.status === 'Done' ? formatDate(project.due_date) : '-'}</td>
            <td className="px-4 py-3">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditClick(project)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDeleteClick(project)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </td>
        </tr>
    )
}

export default function ProjectsClient({ initialProjects, currentUser, profiles, clients, initialProjectTypes }: ProjectsClientProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [isAddProjectOpen, setAddProjectOpen] = useState(false);
  const [activeView, setActiveView] = useState('general');
  const [projectTypes, setProjectTypes] = useState(initialProjectTypes);
  const [isCreateTypeOpen, setCreateTypeOpen] = useState(false);
  
  const [projectToEdit, setProjectToEdit] = useState<ProjectWithOwner | null>(null);
  const [isEditProjectOpen, setEditProjectOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectWithOwner | null>(null);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const [activeProjectsOpen, setActiveProjectsOpen] = useState(true);
  const [closedProjectsOpen, setClosedProjectsOpen] = useState(true);

  const nonDeletedProjects = useMemo(() => projects.filter(p => !p.is_deleted), [projects]);
  const deletedProjects = useMemo(() => projects.filter(p => p.is_deleted), [projects]);

  const projectTypeCounts = useMemo(() => {
    const types = new Map<string, number>();
    nonDeletedProjects.forEach(p => {
        if (p.type) {
            types.set(p.type, (types.get(p.type) || 0) + 1);
        }
    });
    
    projectTypes.forEach(pt => {
        if (!types.has(pt.name)) {
            types.set(pt.name, 0);
        }
    });

    return Array.from(types).map(([name, count]) => ({name, count}));
  }, [nonDeletedProjects, projectTypes]);

  const filteredProjects = useMemo(() => {
    if (activeView === 'general') {
        return nonDeletedProjects;
    }
    if (activeView === 'deleted') {
        return deletedProjects;
    }
    return nonDeletedProjects.filter(p => p.type === activeView);
  }, [nonDeletedProjects, deletedProjects, activeView]);

  const activeProjects = filteredProjects.filter(p => p.status !== 'Done');
  const closedProjects = filteredProjects.filter(p => p.status === 'Done');

  const handleProjectAdded = (newProject: Project) => {
    const newProjectWithOwner = {
      ...newProject,
      owner: profiles.find(p => p.id === newProject.owner_id) || null,
      client: clients.find(c => c.id === newProject.client_id) || null,
    };
    setProjects(prev => [newProjectWithOwner as ProjectWithOwner, ...prev]);
  }

  const handleProjectUpdated = (updatedProject: Project) => {
    const updatedProjectWithOwner = {
        ...updatedProject,
        owner: profiles.find(p => p.id === updatedProject.owner_id) || null,
        client: clients.find(c => c.id === updatedProject.client_id) || null,
    };
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProjectWithOwner as ProjectWithOwner : p));
  }
  
  const handleTypeCreated = (newType: ProjectType) => {
      setProjectTypes(prev => [...prev, newType]);
  }

  const handleEditClick = (project: ProjectWithOwner) => {
    setProjectToEdit(project);
    setEditProjectOpen(true);
  }

  const handleDeleteClick = (project: ProjectWithOwner) => {
    setProjectToDelete(project);
    setDeleteAlertOpen(true);
  }

  const handleDeleteProject = () => {
    if (!projectToDelete) return;

    startTransition(async () => {
        const result = await deleteProject(projectToDelete.id);
        if (result.error) {
            toast({ title: "Error deleting project", description: result.error, variant: "destructive" });
        } else {
            toast({ title: "Project moved to bin", description: `Project "${projectToDelete.name}" has been deleted.` });
            setProjects(prev => prev.map(p => p.id === projectToDelete.id ? { ...p, is_deleted: true } : p));
        }
        setDeleteAlertOpen(false);
        setProjectToDelete(null);
    });
  }

  const mainContent = () => {
    if (activeView === 'deleted') {
        return (
            <div className="mb-8">
                <div className="overflow-x-auto">
                    {deletedProjects.length > 0 ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b">
                                <th className="px-4 py-3 font-medium text-muted-foreground w-1/3">Name</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Due date</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground w-[5%]"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {deletedProjects.map(project => (
                                <tr key={project.id} className="border-b hover:bg-muted/50 group">
                                    <td className="px-4 py-3 font-medium">{project.name}</td>
                                    <td className="px-4 py-3">{project.status ?? "New"}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(project.due_date || ''), 'dd MMM yyyy')}</td>
                                    <td className="px-4 py-3">
                                        {/* Restore/Permanent Delete Options Here */}
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            The bin is empty.
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="mb-8 overflow-x-auto">
                <Collapsible.Root open={activeProjectsOpen} onOpenChange={setActiveProjectsOpen}>
                    <div className="flex items-center gap-2">
                        <Collapsible.Trigger asChild>
                            <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                                <div className="flex items-center gap-2">
                                <ChevronDown className={cn("w-5 h-5 transition-transform", !activeProjectsOpen && "-rotate-90")} />
                                Active projects
                                <span className="text-sm font-normal text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{activeProjects.length}</span>
                                </div>
                            </Button>
                        </Collapsible.Trigger>
                    </div>
                    <Collapsible.Content className="data-[state=closed]:animate-fade-out-bottom-up data-[state=open]:animate-fade-in-top-down">
                        <table className="w-full text-left mt-2">
                            <thead>
                                <tr className="border-b">
                                    <th className="px-4 py-3 font-medium text-muted-foreground w-1/4">Name</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Client</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Priority</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Start date</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Due date</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Members</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Project owner</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Creation date</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Closed date</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setAddProjectOpen(true);}}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeProjects.map(project => (
                                    <ProjectRow key={project.id} project={project} profiles={profiles} handleEditClick={handleEditClick} handleDeleteClick={handleDeleteClick} />
                                ))}
                            </tbody>
                        </table>
                    </Collapsible.Content>
                </Collapsible.Root>
            </div>
            {closedProjects.length > 0 && (
                <div className="mb-4 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr role="button" onClick={() => setClosedProjectsOpen(!closedProjectsOpen)} className="border-b">
                                <th className="px-4 py-3 font-medium text-muted-foreground w-1/4">
                                    <div className="flex items-center gap-2">
                                        <ChevronDown className={cn("w-5 h-5 transition-transform", !closedProjectsOpen && "-rotate-90")} />
                                        Closed projects
                                        <span className="text-sm font-normal text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{closedProjects.length}</span>
                                    </div>
                                </th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Client</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Priority</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Start date</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Due date</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Members</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Project owner</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Creation date</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Closed date</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground w-[5%]"></th>
                            </tr>
                        </thead>
                        {closedProjectsOpen && (
                            <tbody>
                                {closedProjects.map(project => (
                                    <ProjectRow key={project.id} project={project} profiles={profiles} handleEditClick={handleEditClick} handleDeleteClick={handleDeleteClick} />
                                ))}
                            </tbody>
                        )}
                    </table>
                </div>
            )}
        </>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 h-full flex flex-col">
       <header className="flex items-center justify-between pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddProjectOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add new
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filter</Button>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start flex-1">
        <ProjectSidebar 
            activeView={activeView} 
            setActiveView={setActiveView} 
            projectTypes={projectTypeCounts} 
            onAddTypeClick={() => setCreateTypeOpen(true)}
            deletedCount={deletedProjects.length}
        />
        <main className="md:col-span-4">
            {mainContent()}
        </main>
      </div>
       <AddProjectDialog
          isOpen={isAddProjectOpen}
          setIsOpen={setAddProjectOpen}
          clients={clients}
          profiles={profiles}
          currentUser={currentUser}
          onProjectAdded={handleProjectAdded}
          projectTypes={projectTypes}
        />
        {projectToEdit && (
            <EditProjectDialog
                isOpen={isEditProjectOpen}
                setIsOpen={setEditProjectOpen}
                project={projectToEdit}
                clients={clients}
                profiles={profiles}
                currentUser={currentUser}
                onProjectUpdated={handleProjectUpdated}
                projectTypes={projectTypes}
            />
        )}
        <CreateTypeDialog 
            isOpen={isCreateTypeOpen}
            setIsOpen={setCreateTypeOpen}
            onTypeCreated={handleTypeCreated}
        />
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will move the project
                        "{projectToDelete?.name}" to the bin.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDeleteProject}
                        className={cn(buttonVariants({ variant: "destructive" }))}
                        disabled={isPending}
                    >
                       {isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
