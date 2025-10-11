
'use client'

import React, { useState, useEffect, useTransition } from 'react';
import {
  ChevronDown,
  Plus,
  Table,
  LayoutGrid,
  Search,
  Users,
  Filter,
  Calendar,
  MoreVertical,
  Save,
  X,
  Rocket,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { format, isToday, isTomorrow } from 'date-fns';
import { Input } from '@/components/ui/input';
import type { Project, Client, Profile, Team, Task } from '@/lib/types';
import { createTask } from '@/app/teams/actions';
import { updateTaskStatus as updateTaskStatusAction } from '@/app/actions';
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


const typeColors = {
  Operational: 'bg-blue-100 text-blue-800',
  Design: 'bg-orange-100 text-orange-800',
  Important: 'bg-red-100 text-red-800',
};


type TaskWithDetails = Task & {
    profiles: Profile | null;
    projects: Project | null;
    clients: Client | null;
}

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
    const { toast } = useToast();

    const selectedAssignee = profiles.find(p => p.id === assigneeId);
    const assigneeTeams = selectedAssignee?.teams?.map(t => t.teams).filter(Boolean) as Team[] || [];
    const availableTaskTypes = assigneeTeams.flatMap(t => t.default_tasks || []);

    const filteredProjects = clientId ? projects.filter(p => p.client_id === clientId) : [];

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
        if (!taskName || !clientId || !dueDate || !assigneeId || !taskType) {
            toast({ title: "Missing fields", description: "Task Name, Client, Due Date, Assignee, and Type are all required.", variant: "destructive" });
            return;
        }

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
    };
    
    const formatDate = (date: Date | undefined) => {
      if (!date) return <span>Pick a date</span>;
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      return format(date, "dd MMM");
    }

    return (
        <tr className="border-b bg-gray-50">
            <td className="px-4 py-3">
                <Input 
                    placeholder="Type Task name" 
                    value={taskName} 
                    onChange={(e) => setTaskName(e.target.value)} 
                    className="bg-white"
                />
            </td>
            <td className="px-4 py-3">
                <Select onValueChange={handleClientChange} value={clientId}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </td>
             <td className="px-4 py-3">
                <Select onValueChange={setProjectId} value={projectId} disabled={!clientId}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="no-project">No project</SelectItem>
                        {filteredProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </td>
            <td className="px-4 py-3">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal bg-white">
                            <Calendar className="mr-2 h-4 w-4" />
                            {formatDate(dueDate)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <CalendarComponent mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                    </PopoverContent>
                </Popover>
            </td>
            <td className="px-4 py-3">
                <Select onValueChange={setAssigneeId} value={assigneeId}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select assignee" /></SelectTrigger>
                    <SelectContent>
                        {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </td>
            <td className="px-4 py-3">
               <Select onValueChange={setTaskType} value={taskType} disabled={!assigneeId || availableTaskTypes.length === 0}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                        {availableTaskTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                {statusIcons['todo']}
                <span>{statusLabels['todo']}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-right">
                <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-4 w-4" /></Button>
                    <Button size="icon" onClick={handleSave}><Save className="h-4 w-4" /></Button>
                </div>
            </td>
        </tr>
    );
};


const TaskRow = ({ task, onStatusChange }: { task: TaskWithDetails, onStatusChange: (taskId: string, status: 'todo' | 'inprogress' | 'done') => void }) => (
  <React.Fragment>
    <td className="px-4 py-3 text-sm font-medium text-gray-800">
      <div className="flex items-center gap-3">
        <Checkbox id={`task-${task.id}`} />
        <label htmlFor={`task-${task.id}`} className="cursor-pointer truncate shrink" title={task.description}>{task.description}</label>
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
    <td className="px-4 py-3 text-sm text-gray-600">{task.clients?.name}</td>
    <td className="px-4 py-3 text-sm text-gray-600">{task.projects?.name}</td>
    <td className="px-4 py-3 text-sm text-gray-600">
      {task.deadline ? (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(task.deadline), 'dd MMM yyyy')}</span>
        </div>
      ) : <div className="flex justify-center">-</div>}
    </td>
    <td className="px-4 py-3 text-sm text-gray-800">
      {task.profiles ? (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={getResponsibleAvatar(task.profiles)} />
            <AvatarFallback>{getInitials(task.profiles.full_name)}</AvatarFallback>
          </Avatar>
          <span>{task.profiles.full_name}</span>
        </div>
      ) : null}
    </td>
     <td className="px-4 py-3 text-sm">
       {task.type && <Badge variant="outline" className={cn(`border-0`, typeColors[task.type as keyof typeof typeColors] || 'bg-gray-100 text-gray-800')}>{task.type}</Badge>}
    </td>
    <td className="px-4 py-3 text-sm text-gray-600">
       <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-left font-normal p-0 h-auto hover:bg-transparent group-hover:bg-accent -m-2 p-2 rounded">
                    <div className="flex items-center gap-2">
                        {statusIcons[task.status]}
                        <span>{statusLabels[task.status]}</span>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {statusOptions.map(status => (
                    <DropdownMenuItem 
                        key={status}
                        disabled={task.status === status}
                        onClick={() => onStatusChange(task.id, status)}
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
    <td className="px-4 py-3">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600 focus:text-red-600">
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </td>
  </React.Fragment>
);

const TaskTableBody = ({
  isOpen,
  tasks,
  isAddingTask,
  onSaveTask,
  onCancelAddTask,
  projects,
  clients,
  profiles,
  onStatusChange
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
}) => {
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
              className="border-b hover:bg-muted/50 group"
            >
              <TaskRow task={task} onStatusChange={onStatusChange} />
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

const KanbanCard = ({ task, onStatusChange }: { task: any, onStatusChange: (taskId: string, status: 'todo' | 'inprogress' | 'done') => void }) => {
  const cardColors: { [key: string]: string } = {
    "todo": "bg-blue-100",
    "inprogress": "bg-yellow-100",
    "done": "bg-gray-100",
  };
  
  return (
    <Card className={`mb-4 ${cardColors[task.status] ?? 'bg-gray-100'}`}>
      <CardHeader className="p-4 flex flex-row items-start justify-between">
        <CardTitle className="text-sm font-medium">{task.description}</CardTitle>
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mt-2 -mr-2">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                 {statusOptions.map(status => (
                    <DropdownMenuItem 
                        key={status}
                        disabled={task.status === status}
                        onClick={() => onStatusChange(task.id, status)}
                    >
                         Change to {statusLabels[status]}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuItem className="text-red-600 focus:text-red-600">Delete</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
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


const KanbanBoard = ({ tasks: allTasksProp, onStatusChange }: {tasks: any[], onStatusChange: (taskId: string, status: 'todo' | 'inprogress' | 'done') => void}) => {
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
                <KanbanCard key={task.id} task={task} onStatusChange={onStatusChange} />
              ))}
              <Button variant="ghost" className="w-full mt-2 text-gray-500">
                <Plus className="w-4 h-4 mr-2"/> Add task
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function TasksPage() {
  const [view, setView] = useState('table');
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  
  const [activeTasksOpen, setActiveTasksOpen] = useState(true)
  const [completedTasksOpen, setCompletedTasksOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient();
    const fetchData = async () => {
      const { data: tasksData } = await supabase.from('tasks').select('*, profiles(*), projects(*), clients(*)');
      const { data: projectsData } = await supabase.from('projects').select('*');
      const { data: clientsData } = await supabase.from('clients').select('*');
      const { data: profilesData } = await supabase.from('profiles').select('*, teams:profile_teams(teams(*))');

      setTasks((tasksData as any) || []);
      setProjects(projectsData || []);
      setClients(clientsData || []);
      setProfiles(profilesData || []);
    };
    fetchData();

    const channel = supabase
      .channel('realtime-tasks-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
           // Just refetch all data for simplicity
           fetchData();
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, []);

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');
  
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
  
  const handleStatusChange = (taskId: string, status: 'todo' | 'inprogress' | 'done') => {
    startTransition(async () => {
        const { error } = await updateTaskStatusAction(taskId, status);
        if (error) {
            toast({ title: "Error updating status", description: error, variant: "destructive" });
        } else {
            toast({ title: "Task status updated" });
            // The listener will update the state
        }
    });
  }

  return (
    <div className="bg-white p-6 rounded-lg h-full w-full">
      <header className="flex items-center justify-between pb-4 mb-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Tasks</h1>
          <Button onClick={() => setIsAddingTask(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add new
          </Button>
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
          <Button variant="ghost" size="icon"><Search className="h-5 w-5" /></Button>
          <Button variant="outline"><Users className="mr-2 h-4 w-4" />Group</Button>
          <Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filter</Button>
        </div>
      </header>

      <main>
        {view === 'table' ? (
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
                    <table className="w-full text-left mt-2 table-fixed">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[20%]">Task Name</th>
                                <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[12%]">Client</th>
                                <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[12%]">Project</th>
                                <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[10%]">Due date</th>
                                <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[15%]">Responsible</th>
                                <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[10%]">Type</th>
                                <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[10%]">Status</th>
                                <th className="px-4 py-2 w-[5%]"></th>
                            </tr>
                        </thead>
                        <TaskTableBody
                            isOpen={activeTasksOpen}
                            tasks={activeTasks}
                            isAddingTask={isAddingTask}
                            onSaveTask={handleSaveTask}
                            onCancelAddTask={() => setIsAddingTask(false)}
                            projects={projects}
                            clients={clients}
                            profiles={profiles}
                            onStatusChange={handleStatusChange}
                        />
                    </table>
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
                            <table className="w-full text-left mt-2 table-fixed">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[20%]">Task Name</th>
                                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[12%]">Client</th>
                                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[12%]">Project</th>
                                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[10%]">Due date</th>
                                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[15%]">Responsible</th>
                                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[10%]">Type</th>
                                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[10%]">Status</th>
                                        <th className="px-4 py-2 w-[5%]"></th>
                                    </tr>
                                </thead>
                                <TaskTableBody
                                    isOpen={completedTasksOpen}
                                    tasks={completedTasks}
                                    onStatusChange={handleStatusChange}
                                />
                            </table>
                        </motion.div>
                   </Collapsible.Content>
                </Collapsible.Root>
              </div>
            )}
          </>
        ) : (
          <KanbanBoard tasks={tasks} onStatusChange={handleStatusChange} />
        )}
      </main>
    </div>
  );
}
