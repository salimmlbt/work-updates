

'use client'

import { useState, useEffect } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Table,
  LayoutGrid,
  Search,
  Users,
  Filter,
  MessageSquare,
  Paperclip,
  CheckSquare,
  Calendar,
  MoreHorizontal,
  PlusCircle,
  Rocket,
  AlertCircle,
  Clock,
  CheckCircle2,
  Save,
  X,
  MoreVertical,
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
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const statusIcons = {
  'In progress': <Rocket className="h-4 w-4 text-purple-600" />,
  Scheduled: <Calendar className="h-4 w-4 text-gray-500" />,
  'New task': <AlertCircle className="h-4 w-4 text-gray-400" />,
  Completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  'todo': <AlertCircle className="h-4 w-4 text-gray-400" />,
  'inprogress': <Rocket className="h-4 w-4 text-purple-600" />,
  'done': <CheckCircle2 className="h-4 w-4 text-green-500" />,
};

const statusLabels = {
    'todo': 'New Task',
    'inprogress': 'In Progress',
    'done': 'Completed'
}

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

    const filteredProjects = clientId ? projects.filter(p => p.client_id === clientId) : projects;

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
        if (taskName && dueDate && assigneeId) {
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
        } else {
            toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
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
                    placeholder="Enter task details" 
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
                <Select onValueChange={setProjectId} value={projectId}>
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
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-4 w-4" /></Button>
                    <Button size="icon" onClick={handleSave}><Save className="h-4 w-4" /></Button>
                </div>
            </td>
        </tr>
    );
};


const TaskRow = ({ task }: { task: TaskWithDetails }) => (
  <tr className="border-b border-gray-200 hover:bg-gray-50 group">
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
      <div className="flex items-center gap-2">
        {statusIcons[task.status]}
        <span>{statusLabels[task.status]}</span>
      </div>
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
  </tr>
);


const TaskSection = ({ title, count, tasks, onAddTask, isAddingTask, onSaveTask, onCancelAddTask, projects, clients, profiles, isLast }: { 
  title: string, 
  count: number, 
  tasks: any[], 
  onAddTask: () => void, 
  isAddingTask: boolean, 
  onSaveTask: (task: any) => void, 
  onCancelAddTask: () => void,
  projects: Project[],
  clients: Client[],
  profiles: Profile[],
  isLast: boolean
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-8">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
        {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        {title}
        <span className="text-sm font-normal text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{count}</span>
      </button>
      {isOpen && (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <tbody>
              {tasks.map(task => <TaskRow key={task.id} task={task} />)}
              {title === "Active tasks" && (
                <>
                  {isAddingTask && isLast && <AddTaskRow onSave={onSaveTask} onCancel={onCancelAddTask} projects={projects} clients={clients} profiles={profiles} />}
                   <tr>
                      <td colSpan={8} className="pt-2 pb-4 px-4">
                          <Button variant="ghost" className="text-gray-500" onClick={onAddTask}>
                              <Plus className="w-4 h-4 mr-2"/>
                              Add task
                          </Button>
                      </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const KanbanCard = ({ task }: { task: any }) => {
  const cardColors: { [key: string]: string } = {
    "todo": "bg-blue-100",
    "inprogress": "bg-yellow-100",
    "done": "bg-gray-100",
  };
  
  return (
    <Card className={`mb-4 ${cardColors[task.status] ?? 'bg-gray-100'}`}>
      <CardHeader className="p-4">
        <CardTitle className="text-sm font-medium">{task.description}</CardTitle>
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


const KanbanBoard = ({ tasks: allTasksProp }: {tasks: any[]}) => {
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
                <KanbanCard key={task.id} task={task} />
              ))}
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm h-full w-full">
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
            <table className="w-full text-left table-fixed">
                <thead>
                    <tr className="border-b border-gray-200">
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[20%]">Task</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[12%]">Client</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[12%]">Project</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[10%]">Due date</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[15%]">Responsible</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[10%]">Type</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[10%]">Status</th>
                        <th className="px-4 py-2 w-[5%]"></th>
                    </tr>
                </thead>
            </table>
            <TaskSection 
                title="Active tasks" 
                count={activeTasks.length} 
                tasks={activeTasks}
                onAddTask={() => setIsAddingTask(true)}
                isAddingTask={isAddingTask}
                onSaveTask={handleSaveTask}
                onCancelAddTask={() => setIsAddingTask(false)}
                projects={projects}
                clients={clients}
                profiles={profiles}
                isLast={true}
            />
            <TaskSection 
                title="Completed tasks" 
                count={completedTasks.length} 
                tasks={completedTasks} 
                onAddTask={() => {}} 
                isAddingTask={false} 
                onSaveTask={() => {}} 
                onCancelAddTask={() => {}} 
                projects={projects}
                clients={clients}
                profiles={profiles}
                isLast={false}
            />
          </>
        ) : (
          <KanbanBoard tasks={tasks} />
        )}
      </main>
    </div>
  );
}
