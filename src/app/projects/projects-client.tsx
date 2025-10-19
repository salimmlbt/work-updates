

'use client';

import * as React from 'react';
import { useState, useMemo, useTransition, useEffect } from 'react';
import { Plus, ChevronDown, Filter, LayoutGrid, Table, Folder, MoreVertical, Pencil, Trash2, Trash, RefreshCcw } from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import type { Project, Profile, Client, ProjectType, Task } from '@/lib/types';
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
import { deleteProject, restoreProject, deleteProjectPermanently, updateProjectStatus, deleteProjectType, renameProjectType } from '@/app/actions';
import { EditProjectDialog } from './edit-project-dialog';
import { RenameTypeDialog } from './rename-type-dialog';
import { motion, AnimatePresence } from 'framer-motion';

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
    tasks_count: number | null;
};

interface ProjectsClientProps {
  initialProjects: ProjectWithOwner[];
  currentUser: User | null;
  profiles: Profile[];
  clients: Client[];
  initialProjectTypes: ProjectType[];
}

const statusOptions = ['New', 'On Hold', 'In Progress', 'Done'];


const ProjectSidebar = ({ 
    activeView, 
    setActiveView,
    projectTypes,
    onAddTypeClick,
    onRenameType,
    onDeleteType,
    deletedCount
}: { 
    activeView: string, 
    setActiveView: (view: string) => void,
    projectTypes: (ProjectType & { count: number })[],
    onAddTypeClick: () => void,
    onRenameType: (type: ProjectType) => void,
    onDeleteType: (type: ProjectType) => void,
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
                        key={type.id}
                        role="button"
                        onClick={() => setActiveView(type.name)}
                        className={cn(
                            'relative group flex items-center',
                            buttonVariants({ variant: 'ghost' }),
                            'w-full justify-between text-left h-auto pr-2',
                            activeView === type.name
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                                : 'hover:bg-accent',
                            activeView !== type.name && 'group-has-[[data-state=open]]:bg-accent'
                        )}
                    >
                       <div className="flex items-center gap-2">
                         <Folder className="h-4 w-4" />
                         {type.name}
                       </div>
                       <div className="flex items-center gap-2">
                         <span className="text-muted-foreground">{type.count}</span>
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity group-has-[[data-state=open]]:opacity-100">
                            <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className={cn(
                                      "p-1 h-auto text-gray-500 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0",
                                      "hover:bg-transparent hover:text-blue-500",
                                      "data-[state=open]:text-blue-500",
                                       activeView === type.name ? "dark:hover:bg-blue-900/20 hover:bg-blue-100/50" : "hover:bg-gray-100 dark:hover:bg-gray-800",
                                       "data-[state=open]:bg-transparent"
                                    )}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem onClick={() => onRenameType(type)}>
                                     <Pencil className="mr-2 h-4 w-4" />
                                     Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    disabled={type.count > 0}
                                    onClick={() => onDeleteType(type)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                     <Trash2 className="mr-2 h-4 w-4" />
                                     Delete
                                  </DropdownMenuItem>
                               </DropdownMenuContent>
                            </DropdownMenu>
                         </div>
                       </div>
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

const ProjectRow = ({ project, profiles, handleEditClick, handleDeleteClick, onStatusChange, isCompleted }: { project: ProjectWithOwner, profiles: Profile[], handleEditClick: (project: ProjectWithOwner) => void, handleDeleteClick: (project: ProjectWithOwner) => void, onStatusChange: (projectId: string, newStatus: string) => void, isCompleted: boolean }) => {
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), 'dd MMM yyyy');
        } catch (e) {
            return '-';
        }
    };
    
    const dateToShow = isCompleted ? project.updated_at : project.created_at;

    return (
        <React.Fragment>
            <td className="px-4 py-3 font-medium">{project.name}</td>
            <td className="px-4 py-3">{project.client?.name ?? '-'}</td>
            <td className="px-4 py-3">
                <Badge variant="outline" className="font-normal border-yellow-500/30 text-yellow-700 dark:text-yellow-400 bg-yellow-500/10">
                    <span className="mr-2 text-yellow-500">=</span>
                    {project.priority ?? "Medium"}
                </Badge>
            </td>
            <td className="px-4 py-3 text-muted-foreground">{project.tasks_count ?? 0}</td>
            <td className="px-4 py-3">
                <div className="flex -space-x-2">
                    {project.leaders && project.leaders.slice(0, 3).map(id => {
                        const profile = profiles.find(p => p.id === id);
                        if (!profile) return null;
                        return (
                            <Avatar key={id} className="h-6 w-6 border-2 border-background">
                                <AvatarImage src={profile.avatar_url ?? undefined} />
                                <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                            </Avatar>
                        )
                    })}
                    {project.leaders && project.leaders.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground border-2 border-background">
                            +{project.leaders.length - 3}
                        </div>
                    )}
                     {(!project.leaders || project.leaders.length === 0) && '-'}
                </div>
            </td>
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
             <td className="px-4 py-3 text-muted-foreground">{formatDate(dateToShow)}</td>
             <td className="px-4 py-3">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="px-2 py-1 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-transparent">
                            {project.status ?? "New"}
                            <ChevronDown className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {statusOptions.map(status => (
                            <DropdownMenuItem 
                                key={status} 
                                onClick={() => onStatusChange(project.id, status)}
                                disabled={project.status === status}
                            >
                                {status}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </td>
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
        </React.Fragment>
    )
}

const ProjectTableBody = ({ 
    isOpen, 
    projects,
    ...rest 
} : { 
    isOpen: boolean; 
    projects: ProjectWithOwner[];
    profiles: Profile[]; 
    handleEditClick: (project: ProjectWithOwner) => void;
    handleDeleteClick: (project: ProjectWithOwner) => void;
    onStatusChange: (projectId: string, newStatus: string) => void;
    isCompleted: boolean;
}) => {
    return (
        <tbody>
            <AnimatePresence>
                {isOpen && projects.map((project, index) => (
                    <motion.tr
                        key={project.id}
                        variants={{
                            hidden: { opacity: 0, y: -10 },
                            visible: { opacity: 1, y: 0 },
                        }}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="border-b hover:bg-muted/50 group"
                    >
                        <ProjectRow project={project} {...rest} />
                    </motion.tr>
                ))}
            </AnimatePresence>
        </tbody>
    )
}

export default function ProjectsClient({ initialProjects, currentUser, profiles, clients, initialProjectTypes }: ProjectsClientProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [deletedProjects, setDeletedProjects] = useState<ProjectWithOwner[]>([]);
  const [isAddProjectOpen, setAddProjectOpen] = useState(false);
  const [activeView, setActiveView] = useState('general');
  const [projectTypes, setProjectTypes] = useState(initialProjectTypes);
  const [isCreateTypeOpen, setCreateTypeOpen] = useState(false);
  
  const [projectToEdit, setProjectToEdit] = useState<ProjectWithOwner | null>(null);
  const [isEditProjectOpen, setEditProjectOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectWithOwner | null>(null);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [projectToRestore, setProjectToRestore] = useState<ProjectWithOwner | null>(null);
  const [projectToDeletePermanently, setProjectToDeletePermanently] = useState<ProjectWithOwner | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const [activeProjectsOpen, setActiveProjectsOpen] = useState(true);
  const [closedProjectsOpen, setClosedProjectsOpen] = useState(true);
  
  const [showActiveProjects, setShowActiveProjects] = useState(true);
  const [showClosedProjects, setShowClosedProjects] = useState(true);


  const [typeToRename, setTypeToRename] = useState<ProjectType | null>(null);
  const [isRenameTypeOpen, setRenameTypeOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<ProjectType | null>(null);
  const [isDeleteTypeAlertOpen, setDeleteTypeAlertOpen] = useState(false);

  const projectTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach(p => {
        if (p.type) {
            counts.set(p.type, (counts.get(p.type) || 0) + 1);
        }
    });
    
    return projectTypes.map(pt => ({
        ...pt,
        count: counts.get(pt.name) || 0,
    })).sort((a,b) => a.name.localeCompare(b.name));
  }, [projects, projectTypes]);

  const filteredProjects = useMemo(() => {
    if (activeView === 'general') {
        return projects;
    }
    if (activeView === 'deleted') {
        return []; // Deleted projects are handled separately
    }
    return projects.filter(p => p.type === activeView);
  }, [projects, activeView]);

  const activeProjects = filteredProjects.filter(p => (p.status ?? 'New') !== 'Done');
  const closedProjects = filteredProjects.filter(p => p.status === 'Done');

  const handleProjectAdded = (newProjectData: Project) => {
    const newProjectWithOwner = {
        ...newProjectData,
        owner: profiles.find(p => p.id === currentUser?.id) || null,
        client: clients.find(c => c.id === newProjectData.client_id) || null,
        tasks_count: 0
    };
    setProjects(prev => [newProjectWithOwner as ProjectWithOwner, ...prev]);
  };

  const handleProjectUpdated = (updatedProjectData: Project) => {
    setProjects(prev => prev.map(p => {
        if (p.id === updatedProjectData.id) {
            const client = clients.find(c => c.id === updatedProjectData.client_id) || p.client;
            return {
                ...p, 
                ...updatedProjectData, 
                client,
            } as ProjectWithOwner;
        }
        return p;
    }));
  };
  
  const handleTypeCreated = (newType: ProjectType) => {
      setProjectTypes(prev => [...prev, newType]);
  }
  
  const handleTypeRenamed = (updatedType: ProjectType, oldName: string) => {
    setProjectTypes(prev => prev.map(t => t.id === updatedType.id ? updatedType : t));
    setProjects(prev => prev.map(p => p.type === oldName ? { ...p, type: updatedType.name } : p));
    if (activeView === oldName) {
        setActiveView(updatedType.name);
    }
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
            setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
            setDeletedProjects(prev => [projectToDelete, ...prev]);
        }
        setDeleteAlertOpen(false);
        setProjectToDelete(null);
    });
  }

  const handleRestoreProject = (project: ProjectWithOwner) => {
      startTransition(async () => {
          const { error } = await restoreProject(project.id);
          if (error) {
              toast({ title: "Error restoring project", description: error, variant: "destructive" });
          } else {
              toast({ title: "Project restored" });
              setDeletedProjects(prev => prev.filter(p => p.id !== project.id));
              setProjects(prev => [{...project, is_deleted: false}, ...prev]);
          }
      });
  }

  const handleDeletePermanently = () => {
      if (!projectToDeletePermanently) return;
      startTransition(async () => {
          const result = await deleteProjectPermanently(projectToDeletePermanently.id);
          if (result.error) {
              toast({ title: "Error deleting project", description: result.error, variant: "destructive" });
          } else {
              toast({ title: "Project permanently deleted" });
              setDeletedProjects(prev => prev.filter(p => p.id !== projectToDeletePermanently.id));
          }
          setProjectToDeletePermanently(null);
      });
  }

  const handleStatusChange = (projectId: string, newStatus: string) => {
    const originalProjects = [...projects];
    const optimisticProjects = projects.map(p => 
        p.id === projectId ? { ...p, status: newStatus, updated_at: new Date().toISOString() } : p
    );
    setProjects(optimisticProjects);

    startTransition(async () => {
        const { data, error } = await updateProjectStatus(projectId, newStatus);
        if (error) {
            toast({ title: "Error updating status", description: error, variant: "destructive" });
            setProjects(originalProjects); // Revert on error
        } else if (data) {
            setProjects(currentProjects => currentProjects.map(p =>
                p.id === data.id ? { ...p, status: data.status, updated_at: data.updated_at } : p
            ));
        }
    });
  }

  const handleDeleteTypeAction = () => {
    if (!typeToDelete) return;
    startTransition(async () => {
      const { error } = await deleteProjectType(typeToDelete.id);
      if (error) {
        toast({ title: "Error deleting type", description: error, variant: "destructive" });
      } else {
        toast({ title: "Project type deleted" });
        setProjectTypes(prev => prev.filter(t => t.id !== typeToDelete.id));
        if (activeView === typeToDelete.name) {
          setActiveView('general');
        }
      }
      setDeleteTypeAlertOpen(false);
      setTypeToDelete(null);
    });
  }

  const handleToggleActiveProjects = () => {
    if (activeProjectsOpen) {
      // Start exit animation
      setShowActiveProjects(false);
      // Wait for animation to finish before collapsing
      const totalAnimationTime = (activeProjects.length - 1) * 0.05 * 1000 + 200; // delay * (n-1) + duration
      setTimeout(() => {
        setActiveProjectsOpen(false);
      }, totalAnimationTime);
    } else {
      setActiveProjectsOpen(true);
      setShowActiveProjects(true);
    }
  };

  const handleToggleClosedProjects = () => {
    if (closedProjectsOpen) {
      // Start exit animation
      setShowClosedProjects(false);
      const totalAnimationTime = (closedProjects.length - 1) * 0.05 * 1000 + 200;
      setTimeout(() => {
        setClosedProjectsOpen(false);
      }, totalAnimationTime);
    } else {
      setClosedProjectsOpen(true);
      setShowClosedProjects(true);
    }
  };

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
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => handleRestoreProject(project)}>
                                                        <RefreshCcw className="mr-2 h-4 w-4" />
                                                        Restore project
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setProjectToDeletePermanently(project)}>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete permanently
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
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
                <Collapsible.Root open={activeProjectsOpen} onOpenChange={handleToggleActiveProjects}>
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
                    <Collapsible.Content asChild>
                      <motion.div
                          initial="collapsed"
                          animate={activeProjectsOpen ? 'open' : 'collapsed'}
                          variants={{
                            open: { opacity: 1, height: 'auto' },
                            collapsed: { opacity: 0, height: 0 },
                          }}
                          transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                          className="overflow-hidden"
                      >
                          <table className="w-full text-left mt-2 table-fixed">
                              <thead>
                                  <tr className="border-b">
                                      <th className="px-4 py-3 font-medium text-muted-foreground w-[18%]">Name</th>
                                      <th className="px-4 py-3 font-medium text-muted-foreground w-[12%]">Client</th>
                                      <th className="px-4 py-3 font-medium text-muted-foreground w-[10%]">Priority</th>
                                      <th className="px-4 py-3 font-medium text-muted-foreground w-[8%]">Tasks</th>
                                      <th className="px-4 py-3 font-medium text-muted-foreground w-[12%]">Leaders</th>
                                      <th className="px-4 py-3 font-medium text-muted-foreground w-[12%]">Members</th>
                                      <th className="px-4 py-3 font-medium text-muted-foreground w-[12%]">Created date</th>
                                      <th className="px-4 py-3 font-medium text-muted-foreground w-[10%]">Status</th>
                                      <th className="px-4 py-3 font-medium text-muted-foreground text-right w-[6%]"></th>
                                  </tr>
                              </thead>
                               <ProjectTableBody
                                isOpen={showActiveProjects}
                                projects={activeProjects}
                                profiles={profiles}
                                handleEditClick={handleEditClick}
                                handleDeleteClick={handleDeleteClick}
                                onStatusChange={handleStatusChange}
                                isCompleted={false}
                               />
                          </table>
                           <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: showActiveProjects ? 1 : 0 }}
                                transition={{ duration: 0.2 }}
                           >
                            <Button
                                variant="ghost"
                                className="mt-2 text-muted-foreground inline-flex p-2 h-auto hover:bg-transparent hover:text-blue-500 focus:ring-0 focus:ring-offset-0"
                                onClick={() => setAddProjectOpen(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Add project
                            </Button>
                           </motion.div>
                      </motion.div>
                    </Collapsible.Content>
                </Collapsible.Root>
               
            </div>
            {closedProjects.length > 0 && (
                <div className="mb-4 overflow-x-auto">
                     <Collapsible.Root open={closedProjectsOpen} onOpenChange={handleToggleClosedProjects}>
                        <div className="flex items-center gap-2">
                            <Collapsible.Trigger asChild>
                                <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                                    <div className="flex items-center gap-2">
                                    <ChevronDown className={cn("w-5 h-5 transition-transform", !closedProjectsOpen && "-rotate-90")} />
                                    Closed projects
                                    <span className="text-sm font-normal text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{closedProjects.length}</span>
                                    </div>
                                </Button>
                            </Collapsible.Trigger>
                        </div>
                        <Collapsible.Content asChild>
                            <motion.div
                                initial="collapsed"
                                animate={closedProjectsOpen ? "open" : "collapsed"}
                                variants={{
                                    open: { opacity: 1, height: 'auto' },
                                    collapsed: { opacity: 0, height: 0 },
                                }}
                                transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                                className="overflow-hidden"
                            >
                                <table className="w-full text-left mt-2 table-fixed">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="px-4 py-3 font-medium text-muted-foreground w-[18%]">Name</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground w-[12%]">Client</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground w-[10%]">Priority</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground w-[8%]">Tasks</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground w-[12%]">Leaders</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground w-[12%]">Members</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground w-[12%]">Completed date</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground w-[10%]">Status</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground w-[6%]"></th>
                                        </tr>
                                    </thead>
                                    <ProjectTableBody
                                        isOpen={showClosedProjects}
                                        projects={closedProjects}
                                        profiles={profiles}
                                        handleEditClick={handleEditClick}
                                        handleDeleteClick={handleDeleteClick}
                                        onStatusChange={handleStatusChange}
                                        isCompleted={true}
                                    />
                                </table>
                            </motion.div>
                        </Collapsible.Content>
                    </Collapsible.Root>
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
            onRenameType={(type) => { setTypeToRename(type); setRenameTypeOpen(true); }}
            onDeleteType={(type) => { setTypeToDelete(type); setDeleteTypeAlertOpen(true); }}
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
        {typeToRename && (
            <RenameTypeDialog
                isOpen={isRenameTypeOpen}
                setIsOpen={setRenameTypeOpen}
                projectType={typeToRename}
                onTypeRenamed={handleTypeRenamed}
            />
        )}
        <AlertDialog open={isDeleteTypeAlertOpen} onOpenChange={setDeleteTypeAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the project type "{typeToDelete?.name}".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setTypeToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDeleteTypeAction}
                        className={cn(buttonVariants({ variant: "destructive" }))}
                        disabled={isPending}
                    >
                       {isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
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
        <AlertDialog open={!!projectToDeletePermanently} onOpenChange={(open) => !open && setProjectToDeletePermanently(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the project "{projectToDeletePermanently?.name}" and all its associated data.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDeletePermanently}
                        className={cn(buttonVariants({ variant: "destructive" }))}
                        disabled={isPending}
                    >
                       {isPending ? 'Permanently Delete' : 'Permanently Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
