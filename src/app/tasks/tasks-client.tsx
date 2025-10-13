
'use client'

import React, { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import {
  ChevronDown,
  Plus,
  Table,
  LayoutGrid,
  Search,
  Users,
  Filter,
  MoreVertical,
  Save,
  X,
  Rocket,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Trash2,
  RefreshCcw,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getInitials, cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import type { Project, Client, Profile, Team, Task, TaskWithDetails, RoleWithPermissions } from '@/lib/types';
import { createTask } from '@/app/teams/actions';
import { updateTaskStatus, deleteTask, restoreTask, deleteTaskPermanently } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import * as Collapsible from '@radix-ui/react-collapsible';
import { motion, AnimatePresence } from 'framer-motion';
import { EditTaskDialog } from './edit-task-dialog';
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

const statusIcons = {
  'todo': <AlertCircle className="h-4 w-4 text-gray-400" />,
  'inprogress': <Rocket className="h-4 w-4 text-purple-600" />,
  'done': <CheckCircle2 className="h-4 w-4 text-green-500" />,
};

const statusLabels = {
    'todo': 'To Do',
    'inprogress': 'In Progress',
    'done': 'Done'
}
const statusOptions: ('todo' | 'inprogress' | 'done')[] = ['todo', 'inprogress', 'done'];


const typeColors: { [key: string]: string } = {
  "Poster": "bg-blue-100 text-blue-800",
  "Video": "bg-orange-100 text-orange-800",
  "Story": "bg-purple-100 text-purple-800",
  "Motion Graphics": "bg-pink-100 text-pink-800",
  "Animation": "bg-indigo-100 text-indigo-800",
  "Grid": "bg-green-100 text-green-800",
  "Posting": "bg-yellow-100 text-yellow-800",
  "Account Creation": "bg-red-100 text-red-800",
  "Flyer": "bg-teal-100 text-teal-800",
  "Profile": "bg-cyan-100 text-cyan-800",
  "Menu": "bg-lime-100 text-lime-800",
  "FB Cover": "bg-sky-100 text-sky-800",
  "Whatsapp Cover": "bg-emerald-100 text-emerald-800",
  "Profile Picture": "bg-fuchsia-100 text-fuchsia-800",
  "Highlite Cover": "bg-rose-100 text-rose-800",
  "Ad Post": "bg-amber-100 text-amber-800",
  "Shooting": "bg-violet-100 text-violet-800",
  "Meeting": "bg-gray-100 text-gray-800",
  "Connect": "bg-slate-100 text-slate-800",
  "Followup": "bg-stone-100 text-stone-800",
};


const getResponsibleAvatar = (profile: Profile | null) => {
  return profile?.avatar_url ?? undefined;
}

const AddTaskRow = ({ 
  onSave, 
  onCancel,
  projects,
  clients,
  profiles
}: { 
  onSave: (task: any) => void; 
  onCancel: () => void; 
  projects: Project[],
  clients: Client[],
  profiles: Profile[]
}) => {
  const [taskName, setTaskName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [assigneeId, setAssigneeId] = useState('');
  const [taskType, setTaskType] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();

  const selectedAssignee = profiles.find(p => p.id === assigneeId);
  const assigneeTeams = selectedAssignee?.teams?.map(t => t.teams).filter(Boolean) as Team[] || [];
  const availableTaskTypes = [...new Set(assigneeTeams.flatMap(t => t.default_tasks || []))];
  const filteredProjects = clientId ? projects.filter(p => p.client_id === clientId) : [];

  const taskInputRef = React.useRef<HTMLInputElement>(null);
  const clientRef = React.useRef<HTMLButtonElement>(null);
  const projectRef = React.useRef<HTMLButtonElement>(null);
  const dueDateRef = React.useRef<HTMLButtonElement>(null);
  const assigneeRef = React.useRef<HTMLButtonElement>(null);
  const typeRef = React.useRef<HTMLButtonElement>(null);

  useEffect(() => {
    taskInputRef.current?.focus();
  }, []);

  useEffect(() => {
      if (projectId && projectId !== 'no-project') {
          const project = projects.find(p => p.id === projectId);
          if (project?.client_id && project.client_id !== clientId) {
              setClientId(project.client_id);
          }
      }
  }, [projectId, projects, clientId]);

  const handleClientChange = (selectedClientId: string) => {
      setClientId(selectedClientId);
      setProjectId(''); // Reset project when client changes
  }

  const handleSave = async () => {
      if (isSaving) return;
      if (!taskName || !clientId || !dueDate || !assigneeId || !taskType) {
          toast({ title: "Missing fields", description: "Task Details, Client, Due Date, Assignee, and Type are all required.", variant: "destructive" });
          return;
      }
      setIsSaving(true);
      try {
        const result = await createTask({
            description: taskName,
            project_id: projectId === 'no-project' ? null : projectId,
            client_id: clientId || null,
            deadline: dueDate.toISOString(),
            assignee_id: assigneeId,
            type: taskType || null,
        });

        if (result.error) {
            toast({ title: "Error creating task", description: result.error, variant: 'destructive'});
        } else if (result.data) {
            onSave(result.data);
        }
      } finally {
        setIsSaving(false);
      }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return <span>Pick a date</span>;
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday'
    return format(date, "dd MMM");
  }

  // Handle Enter key navigation
  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<any>) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          if (nextRef?.current) {
              nextRef.current.focus();
              nextRef.current.click?.(); // Open dropdowns
          } else {
             handleSave();
          }
      }
  }

  const handleDueDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!calendarOpen) {
        handleSave();
      }
    }
  };

  return (
      <tr className="border-b bg-gray-50">
          <td className="px-4 py-3 border-r">
              <Input 
                  placeholder="Type Task Details" 
                  value={taskName} 
                  ref={taskInputRef}
                  onChange={(e) => setTaskName(e.target.value)} 
                  onKeyDown={(e) => handleKeyDown(e, clientRef)}
                  className="bg-white focus-visible:ring-0 focus-visible:ring-offset-0"
              />
          </td>
          <td className="px-4 py-3 border-r">
              <Select onValueChange={handleClientChange} value={clientId}>
                  <SelectTrigger 
                      className="bg-white focus-visible:ring-0 focus-visible:ring-offset-0" 
                      ref={clientRef} 
                      onKeyDown={(e) => handleKeyDown(e, projectRef)}
                  >
                      <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
              </Select>
          </td>
           <td className="px-4 py-3 border-r">
              <Select onValueChange={setProjectId} value={projectId} disabled={!clientId}>
                  <SelectTrigger 
                      className="bg-white focus-visible:ring-0 focus-visible:ring-offset-0" 
                      ref={projectRef} 
                      onKeyDown={(e) => handleKeyDown(e, assigneeRef)}
                  >
                      <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="no-project">No project</SelectItem>
                      {filteredProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
              </Select>
          </td>
           <td className="px-4 py-3 border-r">
              <Select onValueChange={setAssigneeId} value={assigneeId}>
                  <SelectTrigger 
                      className="bg-white focus-visible:ring-0 focus-visible:ring-offset-0" 
                      ref={assigneeRef} 
                      onKeyDown={(e) => handleKeyDown(e, typeRef)}
                  >
                      <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                      {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
              </Select>
          </td>
          <td className="px-4 py-3 border-r">
              <Select 
                  onValueChange={setTaskType} 
                  value={taskType} 
                  disabled={!assigneeId || availableTaskTypes.length === 0}
              >
                  <SelectTrigger 
                      className="bg-white focus-visible:ring-0 focus-visible:ring-offset-0" 
                      ref={typeRef} 
                      onKeyDown={(e) => handleKeyDown(e, dueDateRef)}
                  >
                      <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                      {availableTaskTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
              </Select>
          </td>
          <td className="px-4 py-3 border-r">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                      <Button 
                          variant="outline" 
                          className="w-full justify-start text-left font-normal bg-white focus-visible:ring-0 focus-visible:ring-offset-0"
                          ref={dueDateRef} 
                          onKeyDown={handleDueDateKeyDown}
                      >
                          {formatDate(dueDate)}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                      <CalendarComponent 
                          mode="single" 
                          selected={dueDate} 
                          onSelect={(date) => {
                              setDueDate(date);
                              setCalendarOpen(false);
                              dueDateRef.current?.focus();
                          }}
                          initialFocus 
                      />
                  </PopoverContent>
              </Popover>
          </td>
          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
            <div className="flex items-center gap-2">
              {statusIcons['todo']}
              <span>{statusLabels['todo']}</span>
            </div>
          </td>
          <td className="px-4 py-3 text-right">
              <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={onCancel} disabled={isSaving} className="focus-visible:ring-0 focus-visible:ring-offset-0">Cancel</Button>
                  <Button onClick={handleSave} disabled={isSaving} className="focus-visible:ring-0 focus-visible:ring-offset-0">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
              </div>
          </td>
      </tr>
  );
};


const TaskRow = ({ task, onStatusChange, onEdit, onDelete, openMenuId, setOpenMenuId, canEdit }: { task: TaskWithDetails; onStatusChange: (taskId: string, status: 'todo' | 'inprogress' | 'done') => void; onEdit: (task: TaskWithDetails) => void; onDelete: (task: TaskWithDetails) => void; openMenuId: string | null; setOpenMenuId: (id: string | null) => void; canEdit: boolean }) => {
  const [dateText, setDateText] = useState('No date');

  useEffect(() => {
    if (task.deadline) {
      const date = parseISO(task.deadline);
      if (isToday(date)) {
        setDateText('Today');
      } else if (isTomorrow(date)) {
        setDateText('Tomorrow');
      } else if (isYesterday(date)) {
        setDateText('Yesterday');
      } else {
        setDateText(format(date, 'dd MMM'));
      }
    } else {
      setDateText('No date');
    }
  }, [task.deadline]);
  
  return (
    <>
      <td className="px-4 py-3 border-r max-w-[250px]">
        <div className="truncate flex items-center gap-3 whitespace-nowrap overflow-hidden text-ellipsis" title={task.description}>
          <span className="truncate shrink">{task.description}</span>
          {task.tags?.map(tag => (
            <Badge
              key={tag}
              variant="secondary"
              className={`${tag === 'ASAP' ? 'bg-red-100 text-red-700' : tag === 'Feedback' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'} font-medium`}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 border-r max-w-[150px]">
        <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis" title={task.clients?.name || '-'}>{task.clients?.name || '-'}</div>
      </td>
      <td className="px-4 py-3 border-r max-w-[150px]">
        <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis" title={task.projects?.name || '-'}>{task.projects?.name || '-'}</div>
      </td>
      {canEdit && (
        <td className="px-4 py-3 border-r max-w-[180px]">
          {task.profiles ? (
            <div className="flex items-center gap-2 truncate whitespace-nowrap overflow-hidden text-ellipsis" title={task.profiles.full_name ?? ''}>
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={getResponsibleAvatar(task.profiles)} />
                <AvatarFallback>{getInitials(task.profiles.full_name)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{task.profiles.full_name}</span>
            </div>
          ) : <div className="flex justify-center">-</div>}
        </td>
      )}
      <td className="px-4 py-3 border-r max-w-[120px]">
        <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis" title={task.type || ''}>
          {task.type && <Badge variant="outline" className={cn(`border-0`, typeColors[task.type] || 'bg-gray-100 text-gray-800')}>{task.type}</Badge>}
        </div>
      </td>
      <td className="px-4 py-3 border-r max-w-[150px]">
        <div className="flex items-center gap-2 truncate whitespace-nowrap overflow-hidden text-ellipsis">
            <span className="truncate">{dateText}</span>
        </div>
      </td>
      <td className="p-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="group w-full h-full flex items-center justify-start px-4 py-3 cursor-pointer">
              <div className="flex items-center gap-2 whitespace-nowrap">
                {statusIcons[task.status]}
                <span>{statusLabels[task.status]}</span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {statusOptions.map(status => (
              <DropdownMenuItem
                key={status}
                disabled={task.status === status}
                onClick={() => onStatusChange(task.id, status)}
                className={cn(task.status === status && 'bg-accent')}
              >
                <div className="flex items-center gap-2">
                  {statusIcons[status]}
                  <span>{statusLabels[status]}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="px-4 py-3 text-right">
        {canEdit && (
        <DropdownMenu
          onOpenChange={(open) => setOpenMenuId(open ? task.id : null)}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:opacity-100"
            >
              <MoreVertical
                className={cn(
                  "h-4 w-4 transition-colors",
                  openMenuId === task.id ? "text-blue-500" : "text-gray-500 hover:text-blue-500"
                )}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="z-50"
          >
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(task)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </td>
    </>
  );
};


const TaskTableBody = ({
  isOpen,
  tasks,
  isAddingTask,
  onSaveTask,
  onCancelAddTask,
  projects,
  clients,
  profiles,
  onStatusChange,
  onEdit,
  onDelete,
  canEdit
}: {
  isOpen: boolean
  tasks: TaskWithDetails[]
  isAddingTask?: boolean
  onSaveTask?: (task: any) => void
  onCancelAddTask?: () => void
  projects?: Project[]
  clients?: Client[]
  profiles?: Profile[],
  onStatusChange: (taskId: string, status: 'todo' | 'inprogress' | 'done') => void
  onEdit: (task: TaskWithDetails) => void;
  onDelete: (task: TaskWithDetails) => void;
  canEdit: boolean;
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  return (
    <tbody>
      <AnimatePresence>
        {isOpen &&
          tasks.map((task, index) => (
            <motion.tr
              key={task.id}
              variants={{
                hidden: { opacity: 0, y: -10 },
                visible: { opacity: 1, y: 0 },
              }}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className={`border-b group hover:bg-muted/50 data-[menu-open=true]:bg-muted/50 transition-colors`}
              data-menu-open={openMenuId === task.id}
            >
              <TaskRow task={task} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} canEdit={canEdit} />
            </motion.tr>
          ))}
      </AnimatePresence>
      {isAddingTask && onSaveTask && onCancelAddTask && projects && clients && profiles && (
        <AddTaskRow 
            onSave={onSaveTask} 
            onCancel={onCancelAddTask} 
            projects={projects} 
            clients={clients} 
            profiles={profiles} 
        />
      )}
    </tbody>
  )
}

const KanbanCard = ({ task, onStatusChange, onEdit, onDelete, canEdit }: { task: TaskWithDetails, onStatusChange: (taskId: string, status: 'todo' | 'inprogress' | 'done') => void, onEdit: (task: TaskWithDetails) => void, onDelete: (task: TaskWithDetails) => void, canEdit: boolean }) => {
  const cardColors: { [key: string]: string } = {
    "todo": "bg-blue-100",
    "inprogress": "bg-yellow-100",
    "done": "bg-gray-100",
  };
  
  return (
    <Card className={`mb-4 ${cardColors[task.status] ?? 'bg-gray-100'}`}>
      <CardHeader className="p-4 flex flex-row items-start justify-between">
        <CardTitle className="text-sm font-medium">{task.description}</CardTitle>
         {canEdit && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 -mt-2 -mr-2">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onEdit(task)}>Edit</DropdownMenuItem>
                    {statusOptions.map(status => (
                        <DropdownMenuItem 
                            key={status}
                            disabled={task.status === status}
                            onClick={() => onStatusChange(task.id, status)}
                            className={cn(task.status === status && 'bg-accent')}
                        >
                            Change to {statusLabels[status]}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(task)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
         )}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {task.tags && (
          <div className="flex flex-wrap gap-2 mb-2">
            {task.tags.map((tag: string) => (
              <Badge
                key={tag}
                className={tag === 'Feedback' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200'}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {task.deadline && <p className="text-xs text-gray-600">{format(new Date(task.deadline), 'dd MMM yyyy')}</p>}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="flex items-center">
        </div>
         {task.profiles && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={getResponsibleAvatar(task.profiles)} />
              <AvatarFallback>{getInitials(task.profiles.full_name)}</AvatarFallback>
            </Avatar>
        )}
      </CardFooter>
    </Card>
  );
};


const KanbanBoard = ({ tasks: allTasksProp, onStatusChange, onEdit, onDelete, canEdit }: { tasks: TaskWithDetails[], onStatusChange: (taskId: string, status: 'todo' | 'inprogress' | 'done') => void, onEdit: (task: TaskWithDetails) => void, onDelete: (task: TaskWithDetails) => void, canEdit: boolean }) => {
  const statuses = ['todo', 'inprogress', 'done'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statuses.map(status => {
        const tasksInStatus = allTasksProp.filter(task => task.status === status);
        return (
          <div key={status}>
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              {statusLabels[status as keyof typeof statusLabels]}
              <Badge variant="secondary" className="ml-2">{tasksInStatus.length}</Badge>
            </h2>
            <div className="bg-gray-100 p-4 rounded-lg h-full">
              {tasksInStatus.map(task => (
                <KanbanCard key={task.id} task={task} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit}/>
              ))}
              {canEdit && (
                <Button variant="ghost" className="w-full mt-2 text-gray-500">
                    <Plus className="w-4 h-4 mr-2"/> Add task
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface TasksClientProps {
  initialTasks: TaskWithDetails[];
  projects: Project[];
  clients: Client[];
  profiles: Profile[];
  currentUserProfile: Profile | null;
}

export default function TasksClient({ initialTasks, projects, clients, profiles, currentUserProfile }: TasksClientProps) {
  const [view, setView] = useState('table');
  const [tasks, setTasks] = useState<TaskWithDetails[]>(initialTasks);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [activeTasksOpen, setActiveTasksOpen] = useState(true)
  const [completedTasksOpen, setCompletedTasksOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<TaskWithDetails | null>(null);
  const [isEditTaskOpen, setEditTaskOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskWithDetails | null>(null);
  const [taskToRestore, setTaskToRestore] = useState<TaskWithDetails | null>(null);
  const [taskToDeletePermanently, setTaskToDeletePermanently] = useState<TaskWithDetails | null>(null);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [showBin, setShowBin] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskView, setTaskView] = useState<'all' | 'mine'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const supabase = createClient();

  const userPermissions = (currentUserProfile?.roles as RoleWithPermissions)?.permissions;
  const canEditTasks = userPermissions?.tasks === 'Editor';

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-tasks-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
           if (payload.eventType === 'INSERT') {
                const newTask = payload.new as Task;
                const newFullTask: TaskWithDetails = {
                    ...newTask,
                    profiles: profiles.find(p => p.id === newTask.assignee_id) || null,
                    projects: projects.find(p => p.id === newTask.project_id) || null,
                    clients: clients.find(c => c.id === newTask.client_id) || null,
                };
                setTasks(current => [newFullTask, ...current])
           } else if (payload.eventType === 'UPDATE') {
                const updatedTask = payload.new as Task;
                const updatedFullTask: TaskWithDetails = {
                     ...updatedTask,
                    profiles: profiles.find(p => p.id === updatedTask.assignee_id) || null,
                    projects: projects.find(p => p.id === updatedTask.project_id) || null,
                    clients: clients.find(c => c.id === updatedTask.client_id) || null,
                };
                setTasks(current => current.map(t => t.id === updatedTask.id ? updatedFullTask : t));
           } else if (payload.eventType === 'DELETE') {
               setTasks(current => current.filter(t => t.id !== payload.old.id))
           }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, projects, clients, profiles]);

  const filteredTasks = useMemo(() => {
    let tasksToDisplay = tasks;

    if (canEditTasks && taskView === 'mine') {
      tasksToDisplay = tasks.filter(task => task.assignee_id === currentUserProfile?.id);
    }
    else if (!canEditTasks) {
       tasksToDisplay = tasks.filter(task => task.assignee_id === currentUserProfile?.id);
    }


    if (searchQuery) {
        return tasksToDisplay.filter(task =>
          task.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    return tasksToDisplay;
  }, [tasks, canEditTasks, currentUserProfile?.id, taskView, searchQuery]);

  const activeTasks = useMemo(() => filteredTasks.filter(t => !t.is_deleted && t.status !== 'done'), [filteredTasks]);
  
  const completedTasks = useMemo(() => {
    let tasksToFilter = tasks;
    if (taskView === 'mine') {
      tasksToFilter = tasks.filter(task => task.assignee_id === currentUserProfile?.id);
    }
    
    let completed = tasksToFilter.filter(t => !t.is_deleted && t.status === 'done');

    if (searchQuery) {
      completed = completed.filter(task =>
        task.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return completed;
  }, [tasks, taskView, currentUserProfile?.id, searchQuery]);

  const deletedTasks = useMemo(() => {
    // Deleted tasks should not be filtered by 'my tasks' view
    const allDeleted = tasks.filter(t => t.is_deleted);
    if(searchQuery){
      return allDeleted.filter(task =>
        task.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return allDeleted;
  }, [tasks, searchQuery]);
  
  const handleSaveTask = (newTask: Task) => {
    const project = projects.find(p => p.id === newTask.project_id);
    const client = project ? clients.find(c => c.id === project.client_id) : clients.find(c => c.id === newTask.client_id);

     const newTaskWithDetails = {
        ...newTask,
        profiles: profiles.find(p => p.id === newTask.assignee_id) || null,
        projects: project || null,
        clients: client || null,
     }
    setTasks(prev => [newTaskWithDetails as TaskWithDetails, ...prev]);
    setIsAddingTask(false);
    toast({ title: 'Task created', description: `Task "${newTask.description}" has been successfully created.`})
  }

  const handleTaskUpdated = (updatedTask: TaskWithDetails) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleEditClick = (task: TaskWithDetails) => {
    setTaskToEdit(task);
    setEditTaskOpen(true);
  }

  const handleDeleteClick = (task: TaskWithDetails) => {
    setTaskToDelete(task);
    setDeleteAlertOpen(true);
  }

  const handleDeleteTask = () => {
    if (!taskToDelete) return;
    
    const originalTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === taskToDelete.id ? { ...t, is_deleted: true } : t));
    setDeleteAlertOpen(false);

    startTransition(async () => {
        const { error } = await deleteTask(taskToDelete.id);
        if (error) {
            toast({ title: "Error deleting task", description: error.message, variant: "destructive" });
            setTasks(originalTasks);
        } else {
            toast({ title: "Task moved to bin" });
        }
        setTaskToDelete(null);
    });
  }
  
  const handleRestoreTask = (task: TaskWithDetails) => {
      const originalTasks = [...tasks];
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_deleted: false } : t));
      
      startTransition(async () => {
          const { error } = await restoreTask(task.id);
          if (error) {
              toast({ title: "Error restoring task", description: error.message, variant: "destructive" });
              setTasks(originalTasks);
          } else {
              toast({ title: "Task restored" });
          }
      });
  }

  const handleDeletePermanently = () => {
    if (!taskToDeletePermanently) return;
    
    const originalTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== taskToDeletePermanently!.id));
    setTaskToDeletePermanently(null);

    startTransition(async () => {
        const { error } = await deleteTaskPermanently(taskToDeletePermanently!.id);
        if (error) {
            toast({ title: "Error deleting task", description: error.message, variant: "destructive" });
            setTasks(originalTasks);
        } else {
            toast({ title: "Task permanently deleted" });
        }
    });
  }
  
  const handleStatusChange = (taskId: string, status: 'todo' | 'inprogress' | 'done') => {
    const originalTasks = [...tasks];
    setTasks(prevTasks => 
      prevTasks.map(t => 
        t.id === taskId ? { ...t, status } : t
      )
    );

    startTransition(async () => {
        const { error } = await updateTaskStatus(taskId, status);
        if (error) {
            toast({ title: "Error updating status", description: error.message, variant: "destructive" });
            setTasks(originalTasks); // Revert on error
        }
    });
  }

  const handleSearchClick = () => {
    setIsSearchOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  }

  const mainContent = () => {
    if (showBin) {
      return (
        <div className="mb-4 overflow-x-auto">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Deleted Tasks
              <span className="text-sm font-normal text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 ml-2">{deletedTasks.length}</span>
            </h2>
          </div>
          {deletedTasks.length > 0 ? (
            <table className="w-full text-left mt-2">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[40%]">Task Details</th>
                  <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[20%]">Project</th>
                  <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[20%]">Assignee</th>
                  <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[20%]"></th>
                </tr>
              </thead>
              <tbody>
                {deletedTasks.map(task => (
                  <tr key={task.id} className="border-b group hover:bg-muted/50">
                    <td className="px-4 py-3">{task.description}</td>
                    <td className="px-4 py-3">{task.projects?.name || '-'}</td>
                    <td className="px-4 py-3">{task.profiles?.full_name || '-'}</td>
                    <td className="px-4 py-3 text-right">
                       <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleRestoreTask(task)}>
                              <RefreshCcw className="h-4 w-4 mr-2" /> Restore
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => setTaskToDeletePermanently(task)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete Permanently
                          </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted-foreground mt-4 text-center py-8">The bin is empty.</p>
          )}
        </div>
      );
    }
    
    return view === 'table' ? (
      <>
        <div className="mb-8 overflow-x-auto">
          <Collapsible.Root open={activeTasksOpen} onOpenChange={setActiveTasksOpen}>
            <div className="flex items-center gap-2">
              <Collapsible.Trigger asChild>
                <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                  <div className="flex items-center gap-2">
                    <ChevronDown className={cn("w-5 h-5 transition-transform", !activeTasksOpen && "-rotate-90")} />
                    Active tasks
                    <span className="text-sm font-normal text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{activeTasks.length}</span>
                  </div>
                </Button>
              </Collapsible.Trigger>
            </div>
            <Collapsible.Content asChild>
              <motion.div
                initial="collapsed"
                animate={activeTasksOpen ? "open" : "collapsed"}
                variants={{
                    open: { opacity: 1, height: 'auto' },
                    collapsed: { opacity: 0, height: 0 },
                }}
                transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                className="overflow-hidden"
              >
                  <table className="w-full text-left mt-2">
                      <thead>
                          <tr className="border-b border-gray-200">
                              <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{width: '250px'}}>Task Details</th>
                              <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{width: '150px'}}>Client</th>
                              <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{width: '150px'}}>Project</th>
                              {canEditTasks && <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{width: '180px'}}>Responsible</th>}
                              <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{width: '120px'}}>Type</th>
                              <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{width: '150px'}}>Due date</th>
                              <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{width: '120px'}}>Status</th>
                              <th className="px-4 py-2" style={{width: '50px'}}></th>
                          </tr>
                      </thead>
                      <TaskTableBody
                          isOpen={activeTasksOpen}
                          tasks={activeTasks}
                          isAddingTask={canEditTasks && isAddingTask}
                          onSaveTask={handleSaveTask}
                          onCancelAddTask={() => setIsAddingTask(false)}
                          projects={projects}
                          clients={clients}
                          profiles={profiles}
                          onStatusChange={handleStatusChange}
                          onEdit={handleEditClick}
                          onDelete={handleDeleteClick}
                          canEdit={canEditTasks}
                      />
                  </table>
                 {canEditTasks && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: activeTasksOpen ? 1 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                    <Button
                        variant="ghost"
                        className="mt-2 text-muted-foreground inline-flex p-2 h-auto hover:bg-transparent hover:text-blue-500 focus:ring-0 focus:ring-offset-0"
                        onClick={() => setIsAddingTask(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add task
                    </Button>
                    </motion.div>
                 )}
              </motion.div>
            </Collapsible.Content>
          </Collapsible.Root>
        </div>

        {completedTasks.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <Collapsible.Root open={completedTasksOpen} onOpenChange={setCompletedTasksOpen}>
              <div className="flex items-center gap-2">
                <Collapsible.Trigger asChild>
                  <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                      <div className="flex items-center gap-2">
                          <ChevronDown className={cn("w-5 h-5 transition-transform", !completedTasksOpen && "-rotate-90")} />
                          Completed tasks
                          <span className="text-sm font-normal text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{completedTasks.length}</span>
                      </div>
                  </Button>
                </Collapsible.Trigger>
              </div>
               <Collapsible.Content asChild>
                    <motion.div
                        initial="collapsed"
                        animate={completedTasksOpen ? "open" : "collapsed"}
                        variants={{
                            open: { opacity: 1, height: 'auto' },
                            collapsed: { opacity: 0, height: 0 },
                        }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                    >
                        <table className="w-full text-left mt-2">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{width: '250px'}}>Task Details</th>
                                    <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{width: '150px'}}>Client</th>
                                    <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{width: '150px'}}>Project</th>
                                    {canEditTasks && <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{width: '180px'}}>Responsible</th>}
                                    <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{width: '120px'}}>Type</th>
                                    <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{width: '150px'}}>Due date</th>
                                    <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{width: '120px'}}>Status</th>
                                    <th className="px-4 py-2" style={{width: '50px'}}></th>
                                </tr>
                            </thead>
                            <TaskTableBody
                                isOpen={completedTasksOpen}
                                tasks={completedTasks}
                                onStatusChange={handleStatusChange}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                canEdit={canEditTasks}
                            />
                        </table>
                    </motion.div>
               </Collapsible.Content>
            </Collapsible.Root>
          </div>
        )}
      </>
    ) : (
      <KanbanBoard tasks={filteredTasks} onStatusChange={handleStatusChange} onEdit={handleEditClick} onDelete={handleDeleteClick} canEdit={canEditTasks} />
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg h-full w-full flex flex-col">
      <header className="flex items-center justify-between pb-4 mb-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Tasks</h1>
          {canEditTasks && !isAddingTask && (
            <Button onClick={() => setIsAddingTask(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add new
            </Button>
          )}
          <div className="flex items-center rounded-lg bg-gray-100 p-1">
            <Button
              variant={view === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('table')}
              className={view === 'table' ? 'bg-white shadow' : ''}
            >
              <Table className="mr-2 h-4 w-4" />
              Table view
            </Button>
            <Button
              variant={view === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('kanban')}
              className={view === 'kanban' ? 'bg-white shadow' : ''}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Kanban board
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div
            className="flex items-center"
            onMouseLeave={() => { if (!searchQuery && searchInputRef.current !== document.activeElement) setIsSearchOpen(false) }}
          >
            <AnimatePresence>
              {isSearchOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {if(!searchQuery) setIsSearchOpen(false)}}
                    className="h-9 focus-visible:ring-transparent focus-visible:ring-offset-0"
                  />
                </motion.div>
              )}
            </AnimatePresence>
             <Button variant="ghost" size="icon" onClick={handleSearchClick} className={cn(isSearchOpen && 'rounded-l-none')}>
                <Search className="h-5 w-5" />
            </Button>
          </div>
          {canEditTasks ? (
            <div className="flex items-center rounded-lg bg-gray-100 p-1">
              <Button
                variant={taskView === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTaskView('all')}
                className={taskView === 'all' ? 'bg-white shadow' : ''}
              >
                All Tasks
              </Button>
              <Button
                variant={taskView === 'mine' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTaskView('mine')}
                className={taskView === 'mine' ? 'bg-white shadow' : ''}
              >
                My Tasks
              </Button>
            </div>
          ) : (
            <Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filter</Button>
          )}
          {canEditTasks && (
            <Button variant="destructive" className="bg-red-100 text-red-600 hover:bg-red-200" onClick={() => setShowBin(!showBin)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Bin
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="min-w-full inline-block align-middle">
          {mainContent()}
        </div>
      </main>

      {taskToEdit && canEditTasks && (
        <EditTaskDialog
          isOpen={isEditTaskOpen}
          setIsOpen={setEditTaskOpen}
          task={taskToEdit}
          projects={projects}
          clients={clients}
          profiles={profiles}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
       <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the task "{taskToDelete?.description}" to the bin. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className={cn(buttonVariants({ variant: 'destructive' }))}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <AlertDialog open={!!taskToDeletePermanently} onOpenChange={(open) => !open && setTaskToDeletePermanently(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone and will permanently delete the task "{taskToDeletePermanently?.description}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePermanently}
              className={cn(buttonVariants({ variant: 'destructive' }))}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}





    
