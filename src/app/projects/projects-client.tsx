
'use client';

import * as React from 'react';
import { useState, useMemo, useTransition, useEffect } from 'react';
import { Plus, ChevronDown, Filter, Folder, MoreVertical, Pencil, Trash2, Trash, RefreshCcw } from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import type { Project, Profile, Client, ProjectType } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { format } from 'date-fns';
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
import { deleteProject, restoreProject, deleteProjectPermanently, updateProjectStatus, deleteProjectType } from '@/app/actions';
import { EditProjectDialog } from './edit-project-dialog';
import { RenameTypeDialog } from './rename-type-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { useClientCache } from '../client-cache';

type ProjectWithOwnerAndClient = Project & {
    owner: Profile | null;
    client: Client | null;
    tasks_count: number | null;
};

interface ProjectsClientProps {
  initialProjects: Project[];
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
                    role="button"
                    onClick={() => setActiveView('general')}
                    className={cn(
                        buttonVariants({ variant: 'ghost' }),
                        'w-full justify-start text-left h-auto pr-8 rounded-xl transition-all duration-300 border',
                        activeView === 'general'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/20 shadow-[0_0_20px_rgba(56,189,248,0.12)]'
                            : 'border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                    )}
                >
                   All projects
                </div>
                {projectTypes.map(type => (
                     <div
                        key={type.id}
                        className="relative group flex items-center"
                    >
                       <div
                         role="button"
                         onClick={() => setActiveView(type.name)}
                         className={cn(
                           buttonVariants({ variant: 'ghost' }),
                           'w-full justify-between text-left h-auto pr-2 flex items-center rounded-xl transition-all duration-300 border',
                           activeView === type.name
                             ? 'bg-sky-500/20 text-sky-300 border-sky-500/20 shadow-[0_0_20px_rgba(56,189,248,0.12)]'
                             : 'border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
                         )}
                       >
                         <div className="flex items-center gap-2">
                           <Folder className="h-4 w-4" />
                           {type.name}
                         </div>
                         <span className={cn("text-xs", activeView === type.name ? "text-sky-300" : "text-zinc-500")}>{type.count}</span>
                       </div>
                       <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="p-1 h-auto text-zinc-500 hover:text-sky-400 transition-colors focus-visible:ring-0 shadow-none"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                                  <DropdownMenuItem onClick={() => onRenameType(type)}>
                                     <Pencil className="mr-2 h-4 w-4" />
                                     Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    disabled={type.count > 0}
                                    onClick={() => onDeleteType(type)}
                                    className="text-red-400 focus:text-red-400 focus:bg-red-950/30"
                                  >
                                     <Trash2 className="mr-2 h-4 w-4" />
                                     Delete
                                  </DropdownMenuItem>
                               </DropdownMenuContent>
                            </DropdownMenu>
                         </div>
                    </div>
                ))}
                <Button
                    variant="ghost"
                    className="mt-2 text-zinc-500 inline-flex p-2 h-auto hover:bg-transparent hover:text-sky-400 focus:ring-0 transition-colors"
                    onClick={onAddTypeClick}
                >
                    <Plus className="mr-2 h-4 w-4" /> Create type
                </Button>
                 <div
                    role="button"
                    onClick={() => setActiveView('deleted')}
                    className={cn(
                        buttonVariants({ variant: 'ghost' }),
                        'w-full justify-between text-left h-auto pr-8 group mt-6 rounded-xl transition-all duration-300 border',
                        activeView === 'deleted'
                            ? 'bg-red-500/20 text-red-400 border-red-500/20'
                            : 'border-transparent text-zinc-500 hover:bg-red-950/10 hover:text-red-400'
                    )}
                >
                   <div className="flex items-center gap-2">
                     <Trash className="h-4 w-4" />
                     Deleted Projects
                   </div>
                   <span className="text-xs">{deletedCount}</span>
                </div>
            </nav>
        </aside>
    )
}

const ProjectRow = ({ project, profiles, handleEditClick, handleDeleteClick, onStatusChange, isCompleted }: { project: ProjectWithOwnerAndClient, profiles: Profile[], handleEditClick: (project: ProjectWithOwnerAndClient) => void, handleDeleteClick: (project: ProjectWithOwnerAndClient) => void, onStatusChange: (projectId: string, newStatus: string) => void, isCompleted: boolean }) => {
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
            <td className="px-4 py-3 font-medium text-zinc-100">{project.name}</td>
            <td className="px-4 py-3 text-zinc-400">{project.client?.name ?? '-'}</td>
            <td className="px-4 py-3">
                <Badge variant="outline" className="font-normal border-amber-500/30 text-amber-400 bg-amber-500/10">
                    <span className="mr-2 text-amber-500">=</span>
                    {project.priority ?? "Medium"}
                </Badge>
            </td>
            <td className="px-4 py-3 text-zinc-500">{project.tasks_count ?? 0}</td>
            <td className="px-4 py-3">
                <div className="flex -space-x-2">
                    {project.leaders && project.leaders.slice(0, 3).map(id => {
                        const profile = profiles.find(p => p.id === id);
                        if (!profile) return null;
                        return (
                            <Avatar key={id} className="h-6 w-6 border border-zinc-900">
                                <AvatarImage src={profile.avatar_url ?? undefined} />
                                <AvatarFallback className="text-[8px] bg-zinc-800 text-zinc-400">{getInitials(profile.full_name)}</AvatarFallback>
                            </Avatar>
                        )
                    })}
                     {(!project.leaders || project.leaders.length === 0) && <span className="text-zinc-600">-</span>}
                </div>
            </td>
            <td className="px-4 py-3">
                <div className="flex -space-x-2">
                    {project.members && project.members.slice(0, 3).map(id => {
                        const profile = profiles.find(p => p.id === id);
                        if (!profile) return null;
                        return (
                            <Avatar key={id} className="h-6 w-6 border border-zinc-900">
                                <AvatarImage src={profile.avatar_url ?? undefined} />
                                <AvatarFallback className="text-[8px] bg-zinc-800 text-zinc-400">{getInitials(profile.full_name)}</AvatarFallback>
                            </Avatar>
                        )
                    })}
                </div>
            </td>
             <td className="px-4 py-3 text-zinc-500 text-xs">{formatDate(dateToShow)}</td>
             <td className="px-4 py-3">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="px-2 py-1 h-auto text-zinc-300 hover:text-zinc-100 hover:bg-white/5 focus-visible:ring-0">
                            {project.status ?? "New"}
                            <ChevronDown className="h-4 w-4 ml-2 opacity-40 group-hover:opacity-100 transition-opacity" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
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
            <td className="px-4 py-3 text-right">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-sky-400 hover:bg-white/5">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                            <DropdownMenuItem onClick={() => handleEditClick(project)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-red-950/30" onClick={() => handleDeleteClick(project)}>
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
    projects: ProjectWithOwnerAndClient[];
    profiles: Profile[]; 
    handleEditClick: (project: ProjectWithOwnerAndClient) => void;
    handleDeleteClick: (project: ProjectWithOwnerAndClient) => void;
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
                        className="border-b border-white/5 hover:bg-white/[0.04] group transition-colors"
                    >
                        <ProjectRow project={project} {...rest} />
                    </motion.tr>
                ))}
            </AnimatePresence>
        </tbody>
    )
}

export default function ProjectsClient({ initialProjects, currentUser, profiles, clients, initialProjectTypes }: ProjectsClientProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { cache, setCache } = useClientCache();
  const cachedProjects = cache['projects'] as ProjectWithOwnerAndClient[] | null;
  const cachedProjectTypes = cache['projectTypes'] as ProjectType[] | null;

  const [projects, setProjects] = useState<ProjectWithOwnerAndClient[]>([]);
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>(cachedProjectTypes || initialProjectTypes);

  const [activeView, setActiveView] = useState('general');
  const [isAddProjectOpen, setAddProjectOpen] = useState(false);
  const [isCreateTypeOpen, setCreateTypeOpen] = useState(false);
  
  const [projectToEdit, setProjectToEdit] = useState<ProjectWithOwnerAndClient | null>(null);
  const [isEditProjectOpen, setEditProjectOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectWithOwnerAndClient | null>(null);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  
  const [activeProjectsOpen, setActiveProjectsOpen] = useState(true);
  const [closedProjectsOpen, setClosedProjectsOpen] = useState(true);
  
  const [showActiveProjects, setShowActiveProjects] = useState(true);

  const [typeToRename, setTypeToRename] = useState<ProjectType | null>(null);
  const [isRenameTypeOpen, setRenameTypeOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<ProjectType | null>(null);
  const [isDeleteTypeAlertOpen, setDeleteTypeAlertOpen] = useState(false);
  const [projectToDeletePermanently, setProjectToDeletePermanently] = useState<ProjectWithOwnerAndClient | null>(null);

  useEffect(() => {
    const dataToUse = cachedProjects || initialProjects;
    const projectsWithData = dataToUse.map(p => ({
        ...p,
        owner: profiles.find(profile => profile.id === currentUser?.id) || null,
        client: clients.find(c => c.id === p.client_id) || null,
        tasks_count: p.tasks_count || 0,
    }));
    setProjects(projectsWithData);
    if (!cachedProjects) {
        setCache('projects', projectsWithData);
    }
  }, [initialProjects, cachedProjects, profiles, clients, currentUser, setCache]);

  useEffect(() => {
    const projectId = searchParams.get('projectId');
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setProjectToEdit(project);
        setEditProjectOpen(true);
      }
    }
  }, [searchParams, projects]);

  const activeRawProjects = useMemo(() => projects.filter(p => !p.is_deleted), [projects]);
  const deletedRawProjects = useMemo(() => projects.filter(p => p.is_deleted), [projects]);

  const projectTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    activeRawProjects.forEach(p => {
        if (p.type) {
            counts.set(p.type, (counts.get(p.type) || 0) + 1);
        }
    });
    
    return projectTypes.map(pt => ({
        ...pt,
        count: counts.get(pt.name) || 0,
    })).sort((a,b) => a.name.localeCompare(b.name));
  }, [activeRawProjects, projectTypes]);

  const filteredProjects = useMemo(() => {
    if (activeView === 'general') return activeRawProjects;
    if (activeView === 'deleted') return deletedRawProjects;
    return activeRawProjects.filter(p => p.type === activeView);
  }, [activeRawProjects, deletedRawProjects, activeView]);

  const activeProjects = filteredProjects.filter(p => (p.status ?? 'New') !== 'Done' && !p.is_deleted);
  const closedProjects = filteredProjects.filter(p => p.status === 'Done' && !p.is_deleted);

  const handleProjectAdded = (newProjectData: Project) => {
    const newProjectWithOwnerAndClient = {
        ...newProjectData,
        owner: profiles.find(p => p.id === currentUser?.id) || null,
        client: clients.find(c => c.id === newProjectData.client_id) || null,
        tasks_count: 0
    };
    const newProjects = [newProjectWithOwnerAndClient, ...projects];
    setProjects(newProjects);
    setCache('projects', newProjects);
  };

  const handleProjectUpdated = (updatedProjectData: Project) => {
    const newProjects = projects.map(p => {
        if (p.id === updatedProjectData.id) {
            return {
                ...p, 
                ...updatedProjectData,
                client: clients.find(c => c.id === updatedProjectData.client_id) || p.client,
            };
        }
        return p;
    });
    setProjects(newProjects);
    setCache('projects', newProjects);
  };
  
  const handleTypeCreated = (newType: ProjectType) => {
      const newTypes = [...projectTypes, newType];
      setProjectTypes(newTypes);
      setCache('projectTypes', newTypes);
  }
  
  const handleTypeRenamed = (updatedType: ProjectType, oldName: string) => {
    const newTypes = projectTypes.map(t => t.id === updatedType.id ? updatedType : t);
    setProjectTypes(newTypes);
    setCache('projectTypes', newTypes);
    
    const newProjects = projects.map(p => p.type === oldName ? { ...p, type: updatedType.name } : p);
    setProjects(newProjects);
    setCache('projects', newProjects);

    if (activeView === oldName) setActiveView(updatedType.name);
  }

  const handleEditClick = (project: ProjectWithOwnerAndClient) => {
    setProjectToEdit(project);
    setEditProjectOpen(true);
  }

  const handleDeleteClick = (project: ProjectWithOwnerAndClient) => {
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
            toast({ title: "Project moved to bin" });
            const newProjects = projects.map(p => p.id === projectToDelete.id ? {...p, is_deleted: true, updated_at: new Date().toISOString() } : p);
            setProjects(newProjects);
            setCache('projects', newProjects);
        }
        setDeleteAlertOpen(false);
        setProjectToDelete(null);
    });
  }

  const handleRestoreProject = (project: ProjectWithOwnerAndClient) => {
      startTransition(async () => {
          const { error } = await restoreProject(project.id);
          if (error) {
              toast({ title: "Error restoring project", description: error, variant: "destructive" });
          } else {
              toast({ title: "Project restored" });
              const newProjects = projects.map(p => p.id === project.id ? {...p, is_deleted: false, updated_at: new Date().toISOString()} : p);
              setProjects(newProjects);
              setCache('projects', newProjects);
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
              const newProjects = projects.filter(p => p.id !== projectToDeletePermanently.id);
              setProjects(newProjects);
              setCache('projects', newProjects);
          }
          setProjectToDeletePermanently(null);
      });
  }

  const handleStatusChange = (projectId: string, newStatus: string) => {
    const originalProjects = [...projects];
    const newProjects = projects.map(p =>
        p.id === projectId ? { ...p, status: newStatus, updated_at: new Date().toISOString() } : p
    );
    setProjects(newProjects);
    setCache('projects', newProjects);

    startTransition(async () => {
        const { error } = await updateProjectStatus(projectId, newStatus);
        if (error) {
            toast({ title: "Error updating status", description: error, variant: "destructive" });
            setProjects(originalProjects);
            setCache('projects', originalProjects);
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
        const newTypes = projectTypes.filter(t => t.id !== typeToDelete.id);
        setProjectTypes(newTypes);
        setCache('projectTypes', newTypes);
        if (activeView === typeToDelete.name) setActiveView('general');
      }
      setDeleteTypeAlertOpen(false);
      setTypeToDelete(null);
    });
  }

  const mainContent = () => {
    if (activeView === 'deleted') {
        return (
            <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02] backdrop-blur-xl">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                            <th className="px-4 py-3 font-medium text-zinc-500 w-1/3">Name</th>
                            <th className="px-4 py-3 font-medium text-zinc-500">Status</th>
                            <th className="px-4 py-3 font-medium text-zinc-500">Due date</th>
                            <th className="px-4 py-3 w-[5%]"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {deletedRawProjects.map(project => (
                        <tr key={project.id} className="border-b border-white/5 hover:bg-white/[0.04] group transition-colors">
                            <td className="px-4 py-3 font-medium text-zinc-100">{project.name}</td>
                            <td className="px-4 py-3 text-zinc-400">{project.status ?? "New"}</td>
                            <td className="px-4 py-3 text-zinc-500 text-xs">{format(new Date(project.due_date || ''), 'dd MMM yyyy')}</td>
                            <td className="px-4 py-3">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-sky-400">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                                            <DropdownMenuItem onClick={() => handleRestoreProject(project)}>
                                                <RefreshCcw className="mr-2 h-4 w-4" />
                                                Restore project
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-red-950/30" onClick={() => setProjectToDeletePermanently(project)}>
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
                {deletedRawProjects.length === 0 && (
                    <div className="text-center py-20 text-zinc-600 italic text-sm">
                        The bin is empty.
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02] backdrop-blur-xl shadow-2xl shadow-black/50">
                <Collapsible.Root open={activeProjectsOpen} onOpenChange={setActiveProjectsOpen}>
                    <Collapsible.Trigger asChild>
                        <Button variant="ghost" className="w-full flex items-center justify-between p-4 border-b border-white/10 hover:bg-white/5 group">
                            <div className="flex items-center gap-3">
                                <ChevronDown className={cn("w-5 h-5 text-zinc-500 transition-transform duration-300", !activeProjectsOpen && "-rotate-90")} />
                                <span className="font-bold text-white tracking-tight">Active projects</span>
                                <Badge variant="secondary" className="bg-white/10 text-zinc-300 border-0">{activeProjects.length}</Badge>
                            </div>
                        </Button>
                    </Collapsible.Trigger>
                    <Collapsible.Content asChild>
                      <motion.div
                          initial="collapsed"
                          animate={activeProjectsOpen ? 'open' : 'collapsed'}
                          variants={{ open: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }}
                          transition={{ duration: 0.3 }}
                      >
                          <table className="w-full text-left table-fixed">
                              <thead>
                                  <tr className="border-b border-white/10 bg-white/5">
                                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[20%]">Name</th>
                                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[12%]">Client</th>
                                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[10%]">Priority</th>
                                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[8%]">Tasks</th>
                                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[12%]">Leaders</th>
                                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[12%]">Members</th>
                                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[12%]">Created</th>
                                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[10%]">Status</th>
                                      <th className="px-4 py-3 w-[4%]"></th>
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
                           <div className="p-2 border-t border-white/5">
                            <Button
                                variant="ghost"
                                className="text-zinc-500 inline-flex p-2 h-auto hover:bg-transparent hover:text-sky-400 transition-colors"
                                onClick={() => setAddProjectOpen(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Add project
                            </Button>
                           </div>
                      </motion.div>
                    </Collapsible.Content>
                </Collapsible.Root>
            </div>

            {closedProjects.length > 0 && (
                <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02] backdrop-blur-xl">
                     <Collapsible.Root open={closedProjectsOpen} onOpenChange={setClosedProjectsOpen}>
                        <Collapsible.Trigger asChild>
                            <Button variant="ghost" className="w-full flex items-center justify-between p-4 border-b border-white/10 hover:bg-white/5 group">
                                <div className="flex items-center gap-3">
                                    <ChevronDown className={cn("w-5 h-5 text-zinc-500 transition-transform duration-300", !closedProjectsOpen && "-rotate-90")} />
                                    <span className="font-bold text-white tracking-tight opacity-70">Closed projects</span>
                                    <Badge variant="secondary" className="bg-white/10 text-zinc-500 border-0">{closedProjects.length}</Badge>
                                </div>
                            </Button>
                        </Collapsible.Trigger>
                        <Collapsible.Content asChild>
                            <motion.div
                                initial="collapsed"
                                animate={closedProjectsOpen ? "open" : "collapsed"}
                                variants={{ open: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }}
                                transition={{ duration: 0.3 }}
                            >
                                <table className="w-full text-left table-fixed opacity-60 grayscale-[0.5]">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-white/5">
                                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[20%]">Name</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[12%]">Client</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[10%]">Priority</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[8%]">Tasks</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[12%]">Leaders</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[12%]">Members</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[12%]">Completed</th>
                                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-[10%]">Status</th>
                                            <th className="px-4 py-3 w-[4%]"></th>
                                        </tr>
                                    </thead>
                                    <ProjectTableBody
                                        isOpen={true}
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
        </div>
    );
  }

  return (
    <div className="bg-[#0f0f0f] p-4 md:p-8 lg:p-10 h-full w-full flex flex-col text-zinc-100">
       <header className="flex items-center justify-between pb-6 mb-2 border-b border-white/10">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-white">Projects</h1>
          <Button onClick={() => setAddProjectOpen(true)} className="rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.3)]">
            <Plus className="mr-2 h-4 w-4" />
            Add new
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-full bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border-sky-500/20"><Filter className="mr-2 h-4 w-4" />Filter</Button>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start flex-1 pt-6">
        <ProjectSidebar 
            activeView={activeView} 
            setActiveView={setActiveView} 
            projectTypes={projectTypeCounts} 
            onAddTypeClick={() => setCreateTypeOpen(true)}
            onRenameType={(type) => { setTypeToRename(type); setRenameTypeOpen(true); }}
            onDeleteType={(type) => { setTypeToDelete(type); setDeleteTypeAlertOpen(true); }}
            deletedCount={deletedRawProjects.length}
        />
        <main className="md:col-span-4 overflow-auto custom-scrollbar">
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
            <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400">
                        This action cannot be undone. This will permanently delete the project type "{typeToDelete?.name}".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-zinc-700">Cancel</AlertDialogCancel>
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
            <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <AlertDialogHeader>
                    <AlertDialogTitle>Move to bin?</AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400">
                        The project "{projectToDelete?.name}" will be moved to the bin. You can restore it later.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-zinc-700">Cancel</AlertDialogCancel>
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
            <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400">
                        This action is irreversible. All associated data for "{projectToDeletePermanently?.name}" will be removed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-zinc-700">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDeletePermanently}
                        className={cn(buttonVariants({ variant: "destructive" }))}
                        disabled={isPending}
                    >
                       {isPending ? 'Deleting...' : 'Permanently Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.1);
          }
        `}</style>
    </div>
  );
}
