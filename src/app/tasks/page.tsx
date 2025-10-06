

'use client'

import { useState } from 'react';
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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { getInitials } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const teamMembers = [
  { name: 'Sofia Brown', avatar: 'https://i.pravatar.cc/150?u=sofia-brown' },
  { name: 'Anastasia Novak', avatar: 'https://i.pravatar.cc/150?u=anastasia-novak' },
  { name: 'Michael Martinez', avatar: 'https://i.pravatar.cc/150?u=michael-martinez' },
  { name: 'Marry Williams', avatar: 'https://i.pravatar.cc/150?u=marry-williams' },
  { name: 'David Thomas', avatar: 'https://i.pravatar.cc/150?u=david-thomas' },
];

const allTasks = [
  {
    id: 'TASK-1',
    name: 'Develop a wireframe',
    status: 'In progress',
    type: 'Operational',
    dueDate: '',
    responsible: 'Sofia Brown',
    comments: 3,
    attachments: 1,
  },
  {
    id: 'TASK-2',
    name: 'Write website copy',
    status: 'In progress',
    type: 'Operational',
    dueDate: '19 Apr 2024',
    responsible: 'Anastasia Novak',
    checklist: { completed: 1, total: 3 },
  },
  {
    id: 'TASK-3',
    name: 'Write meta title & meta description for each page',
    status: 'Scheduled',
    type: 'Operational',
    dueDate: '',
    responsible: 'Anastasia Novak',
  },
  {
    id: 'TASK-4',
    name: 'Design drafts in 3 different styles',
    status: 'In progress',
    type: 'Design',
    dueDate: '17 Apr 2024',
    responsible: 'Michael Martinez',
    tags: ['ASAP'],
    comments: 7,
  },
  {
    id: 'TASK-5',
    name: 'Design the entire website in a chosen style',
    status: 'Scheduled',
    type: 'Design',
    dueDate: '24 Apr 2024',
    responsible: 'Michael Martinez',
  },
  {
    id: 'TASK-6',
    name: 'Review and comment on website design',
    status: 'New task',
    type: 'Important',
    dueDate: '',
    responsible: 'Marry Williams',
    tags: ['Feedback'],
  },
  {
    id: 'TASK-7',
    name: 'Prepare design files for web developer',
    status: 'New task',
    type: 'Design',
    dueDate: '',
    responsible: 'Michael Martinez',
    checklist: { completed: 0, total: 2 },
  },
  {
    id: 'TASK-8',
    name: 'Develop the website using the chosen CMS platform',
    status: 'Scheduled',
    type: 'Operational',
    dueDate: '19 Apr 2024',
    responsible: 'David Thomas',
    tags: ['blocked'],
    checklist: { completed: 0, total: 4 },
  },
  {
    id: 'TASK-9',
    name: 'Implement responsive design',
    status: 'Scheduled',
    type: 'Operational',
    dueDate: '',
    responsible: 'David Thomas',
  },
  {
    id: 'TASK-10',
    name: 'Deploy the website to the development hosting server',
    status: 'New task',
    type: 'Operational',
    dueDate: '',
    responsible: 'David Thomas',
  },
  {
    id: 'TASK-11',
    name: 'Send new website link to the team',
    status: 'New task',
    type: 'Operational',
    dueDate: '',
    responsible: 'David Thomas',
  },
  {
    id: 'TASK-12',
    name: 'Fix all the bugs reported by the team',
    status: 'New task',
    type: 'Operational',
    dueDate: '',
    responsible: 'David Thomas',
  },
  {
    id: 'TASK-13',
    name: 'Deploy the website to the production environment',
    status: 'New task',
    type: 'Operational',
    dueDate: '',
    responsible: 'David Thomas',
  },
  {
    id: 'TASK-14',
    name: 'Research potential CMS platforms for website development',
    status: 'Completed',
    type: 'Operational',
    dueDate: '',
    responsible: 'David Thomas',
  },
  {
    id: 'TASK-15',
    name: 'Develop a structure for a new website',
    status: 'Completed',
    type: 'Operational',
    dueDate: '',
    responsible: 'Sofia Brown',
    checklist: { completed: 4, total: 4 },
    comments: 2,
  },
  {
    id: 'TASK-16',
    name: 'Final check of the website',
    status: 'New task',
    type: 'Operational',
    dueDate: '',
    responsible: 'Sofia Brown',
    checklist: { completed: 0, total: 7 },
  }
];

const activeTasks = allTasks.filter(t => t.status !== 'Completed');
const completedTasks = allTasks.filter(t => t.status === 'Completed');

const statusIcons = {
  'In progress': <Rocket className="h-4 w-4 text-purple-600" />,
  Scheduled: <Calendar className="h-4 w-4 text-gray-500" />,
  'New task': <AlertCircle className="h-4 w-4 text-gray-400" />,
  Completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
};

const typeColors = {
  Operational: 'bg-blue-100 text-blue-800',
  Design: 'bg-orange-100 text-orange-800',
  Important: 'bg-red-100 text-red-800',
};

const getResponsibleAvatar = (name: string) => {
  const member = teamMembers.find(m => m.name === name);
  return member ? member.avatar : undefined;
}

const TaskRow = ({ task }: { task: (typeof activeTasks)[0] }) => (
  <tr className="border-b border-gray-200 hover:bg-gray-50">
    <td className="px-4 py-3 text-sm font-medium text-gray-800">
      <div className="flex items-center gap-3">
        <Checkbox id={`task-${task.id}`} />
        <label htmlFor={`task-${task.id}`} className="cursor-pointer truncate shrink" title={task.name}>{task.name}</label>
        {task.tags?.map(tag => (
          <Badge 
            key={tag} 
            variant="secondary" 
            className={`${tag === 'ASAP' ? 'bg-red-100 text-red-700' : tag === 'Feedback' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'} font-medium`}
          >
            {tag}
          </Badge>
        ))}
        {task.comments && <span className="flex items-center gap-1 text-gray-500 text-xs"><MessageSquare className="w-4 h-4"/>{task.comments}</span>}
        {task.attachments && <span className="flex items-center gap-1 text-gray-500 text-xs"><Paperclip className="w-4 h-4"/>{task.attachments}</span>}
        {task.checklist && <span className="flex items-center gap-1 text-gray-500 text-xs"><CheckSquare className="w-4 h-4"/>{task.checklist.completed}/{task.checklist.total}</span>}
      </div>
    </td>
    <td className="px-4 py-3 text-sm text-gray-600">
      <div className="flex items-center gap-2">
        {statusIcons[task.status as keyof typeof statusIcons]}
        <span>{task.status}</span>
      </div>
    </td>
    <td className="px-4 py-3 text-sm">
       <Badge variant="outline" className={`border-0 ${typeColors[task.type as keyof typeof typeColors]}`}>{task.type}</Badge>
    </td>
    <td className="px-4 py-3 text-sm text-gray-600">
      {task.dueDate ? (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{task.dueDate}</span>
        </div>
      ) : <div className="flex justify-center">-</div>}
    </td>
    <td className="px-4 py-3 text-sm text-gray-800">
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={getResponsibleAvatar(task.responsible)} />
          <AvatarFallback>{getInitials(task.responsible)}</AvatarFallback>
        </Avatar>
        <span>{task.responsible}</span>
      </div>
    </td>
    <td className="px-4 py-3">
        <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
        </Button>
    </td>
  </tr>
);


const TaskSection = ({ title, count, tasks, defaultOpen = true }: { title: string, count: number, tasks: any[], defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

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
                <tr className="border-b-0">
                    <td colSpan={6} className="pt-2 pb-4 px-4">
                        <Button variant="ghost" className="text-gray-500">
                            <Plus className="w-4 h-4 mr-2"/>
                            Add task
                        </Button>
                    </td>
                </tr>
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
    "New task": "bg-blue-100",
    "Scheduled": "bg-red-100",
    "In progress": "bg-yellow-100",
    "Completed": "bg-gray-100",
  };
  
  return (
    <Card className={`mb-4 ${cardColors[task.status] ?? 'bg-gray-100'}`}>
      <CardHeader className="p-4">
        <CardTitle className="text-sm font-medium">{task.name}</CardTitle>
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
        {task.dueDate && <p className="text-xs text-gray-600">{task.dueDate}</p>}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="flex items-center">
          {task.checklist && (
            <span className="flex items-center gap-1 text-gray-500 text-xs mr-2">
              <CheckSquare className="w-4 h-4" />
              {task.checklist.completed}/{task.checklist.total}
            </span>
          )}
          {task.comments && (
            <span className="flex items-center gap-1 text-gray-500 text-xs">
              <MessageSquare className="w-4 h-4" />
              {task.comments}
            </span>
          )}
        </div>
        <Avatar className="h-6 w-6">
          <AvatarImage src={getResponsibleAvatar(task.responsible)} />
          <AvatarFallback>{getInitials(task.responsible)}</AvatarFallback>
        </Avatar>
      </CardFooter>
    </Card>
  );
};


const KanbanBoard = () => {
  const statuses = ['New task', 'Scheduled', 'In progress', 'Completed'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statuses.map(status => {
        const tasksInStatus = allTasks.filter(task => task.status === status);
        return (
          <div key={status}>
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              {status}
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm h-full w-full">
      <header className="flex items-center justify-between pb-4 mb-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Tools</h1>
          <Button>
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
          <div className="flex items-center -space-x-2">
            {teamMembers.slice(0, 3).map(member => (
              <Avatar key={member.name} className="h-8 w-8 border-2 border-white">
                <AvatarImage src={member.avatar} />
                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
              </Avatar>
            ))}
            {teamMembers.length > 3 && (
              <Avatar className="h-8 w-8 border-2 border-white">
                <AvatarFallback>+{teamMembers.length - 3}</AvatarFallback>
              </Avatar>
            )}
          </div>
          <Avatar className="h-9 w-9">
            <AvatarImage src="/avatars/user-profile.png" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <main>
        {view === 'table' ? (
          <>
            <table className="w-full text-left table-fixed">
                <thead>
                    <tr className="border-b border-gray-200">
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-2/5">Active tasks</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[15%]">Status</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[15%]">Type</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[15%]">Due date</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[15%]">Responsible</th>
                        <th className="px-4 py-2 w-[5%]"></th>
                    </tr>
                </thead>
            </table>
            <TaskSection title="Active tasks" count={activeTasks.length} tasks={activeTasks} />
            <TaskSection title="Completed tasks" count={completedTasks.length} tasks={completedTasks} />
          </>
        ) : (
          <KanbanBoard />
        )}
      </main>
    </div>
  );
}
