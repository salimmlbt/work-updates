
'use client';

import React, { useState, useMemo, useTransition, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Plus, Calendar as CalendarIcon, Loader2, MoreVertical, Share2, Trash2, Pencil, RefreshCcw, ChevronDown, Search, Rocket, AlertCircle, CheckCircle2, Eye, MessageSquare, Repeat, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getInitials, cn } from '@/lib/utils';
import { format, parseISO, isToday, isTomorrow, isYesterday, addMonths, subMonths } from 'date-fns';
import type { Client, Team, Profile, Task, TaskWithDetails, Project } from '@/lib/types';
import type { ScheduleWithDetails } from './page';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { addSchedule, deleteSchedule, restoreSchedule, deleteSchedulePermanently, updateSchedule } from '@/app/actions';
import { createTask } from '@/app/teams/actions';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ReassignTaskDialog } from '@/app/tasks/reassign-task-dialog';
import { EditScheduleDialog } from './edit-schedule-dialog';
import { createClient } from '@/lib/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';


const statusIcons: Record<Task['status'], React.ReactNode> = {
  'todo': <AlertCircle className="h-4 w-4 text-gray-400" />,
  'inprogress': <Rocket className="h-4 w-4 text-purple-600" />,
  'review': <Eye className="h-4 w-4 text-yellow-600" />,
  'corrections': <MessageSquare className="h-4 w-4 text-orange-600" />,
  'recreate': <Repeat className="h-4 w-4 text-blue-600" />,
  'approved': <CheckCircle2 className="h-4 w-4 text-green-500" />,
  'done': <CheckCircle2 className="h-4 w-4 text-green-500" />,
  'under-review': <Eye className="h-4 w-4 text-yellow-600" />,
};

const statusLabels: Record<Task['status'], string> = {
    'todo': 'Assigned',
    'inprogress': 'In Progress',
    'review': 'Review',
    'corrections': 'Corrections',
    'recreate': 'Recreate',
    'approved': 'Approved',
    'done': 'Created',
    'under-review': 'Under Review'
}

const postingStatusIcons = {
    'Planned': <AlertCircle className="h-4 w-4 text-gray-400" />,
    'Scheduled': <CalendarIcon className="h-4 w-4 text-blue-500" />,
    'Posted': <CheckCircle2 className="h-4 w-4 text-green-500" />,
};

const postingStatusLabels = {
    'Planned': 'Planned',
    'Scheduled': 'Scheduled',
    'Posted': 'Posted',
};


const AddScheduleRow = ({
  clientId,
  onScheduleAdded,
  onCancel,
  teams,
  projects,
}: {
  clientId: string;
  onScheduleAdded: (schedule: ScheduleWithDetails) => void;
  onCancel: () => void;
  teams: Team[];
  projects: Project[];
}) => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [contentType, setContentType] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(true); // Open calendar first as requested
  
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Focus title input when calendar closes
  useEffect(() => {
    if (!isCalendarOpen) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
    }
  }, [isCalendarOpen]);

  const availableWorkTypes = useMemo(() => {
    if (!teamId) return [];
    const selectedTeam = teams.find(t => t.id === teamId);
    return selectedTeam?.default_tasks || [];
  }, [teamId, teams]);
  
  const clientProjects = useMemo(() => {
    return projects.filter(p => p.client_id === clientId);
  }, [projects, clientId]);

  useEffect(() => {
    setContentType('');
  }, [teamId]);

  const handleSave = () => {
    if (!title || !scheduledDate || !teamId || !contentType) {
      toast({
        title: 'Missing Fields',
        description: 'All fields are required to create a schedule.',
        variant: 'destructive',
      });
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.append('client_id', clientId);
      formData.append('title', title);
      formData.append('content_type', contentType);
      formData.append('scheduled_date', format(scheduledDate, 'yyyy-MM-dd'));
      formData.append('team_id', teamId);
      if (projectId) formData.append('project_id', projectId);

      const result = await addSchedule(formData);

      if (result.error) {
        toast({
          title: 'Error adding schedule',
          description: result.error,
          variant: 'destructive',
        });
      } else if (result.data) {
        toast({
          title: 'Schedule Added',
          description: 'The new schedule has been added successfully.',
        });
        const newScheduleWithDetails: ScheduleWithDetails = {
          ...result.data,
          task: null,
          teams: teams.find(t => t.id === teamId) || null,
          projects: projects.find(p => p.id === projectId) || null,
        }
        onScheduleAdded(newScheduleWithDetails);
      }
    });
  };

  return (
     <TableRow className="bg-white/[0.04] hover:bg-white/[0.06] border-b border-white/5">
        <TableCell className="border-r border-white/5">
             <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start font-normal text-zinc-200 hover:bg-white/5">
                    <CalendarIcon className="mr-2 h-4 w-4 text-sky-400" />
                    {scheduledDate ? format(scheduledDate, 'MMM d, yyyy') : 'Pick a date'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800">
                    <CalendarComponent 
                      mode="single" 
                      selected={scheduledDate} 
                      onSelect={(date) => {
                        setScheduledDate(date);
                        setIsCalendarOpen(false);
                      }} 
                      initialFocus 
                    />
                </PopoverContent>
            </Popover>
        </TableCell>
        <TableCell className="border-r border-white/5">
            <Input ref={titleInputRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Content Title" className="bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-zinc-600" />
        </TableCell>
         <TableCell className="border-r border-white/5">
             <Select onValueChange={setProjectId} value={projectId || 'no-project'}>
                <SelectTrigger className="bg-transparent border-0 hover:bg-white/5 text-zinc-200">
                    <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="no-project">No project</SelectItem>
                    {clientProjects.map(project => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </TableCell>
        <TableCell className="border-r border-white/5">
             <Select onValueChange={setTeamId}>
                <SelectTrigger className="bg-transparent border-0 hover:bg-white/5 text-zinc-200">
                    <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </TableCell>
        <TableCell className="border-r border-white/5">
            <Select onValueChange={setContentType} value={contentType} disabled={!teamId}>
                <SelectTrigger className="bg-transparent border-0 hover:bg-white/5 text-zinc-200 disabled:opacity-30">
                    <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    {availableWorkTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </TableCell>
        <TableCell>
           <div className="flex items-center gap-2 text-zinc-500 italic text-xs">
                {postingStatusIcons['Planned']}
                <span>Planned</span>
            </div>
        </TableCell>
        <TableCell className="text-right">
           <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending} className="text-zinc-400 hover:text-white">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isPending} className="bg-sky-600 hover:bg-sky-500 text-white">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </TableCell>
     </TableRow>
  );
};

const AssignTaskRow = ({
  schedule,
  profiles,
  onSave,
  onCancel,
}: {
  schedule: ScheduleWithDetails;
  profiles: Profile[];
  onSave: (task: any) => void;
  onCancel: () => void;
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date(schedule.scheduled_date));
  const { toast } = useToast();

  const teamMembers = useMemo(() => {
    if (!schedule.team_id || !profiles) return [];
    return profiles.filter(p => p.teams && p.teams.some(t => t.teams?.id === schedule.team_id));
  }, [profiles, schedule.team_id]);

  const handleSave = async () => {
    if (!assigneeId || !dueDate) {
      toast({
        title: 'Missing fields',
        description: 'Assignee and Due Date are required.',
        variant: 'destructive',
      });
      return;
    }
    setIsSaving(true);
    const result = await createTask({
      description: schedule.title,
      project_id: schedule.project_id,
      client_id: schedule.client_id,
      deadline: dueDate.toISOString(),
      assignee_id: assigneeId,
      type: schedule.content_type,
      schedule_id: schedule.id,
      status: 'todo',
    });

    if (result.error) {
      toast({ title: 'Error creating task', description: result.error, variant: 'destructive' });
      setIsSaving(false);
    } else if (result.data) {
      onSave(result.data); // This will trigger a re-render via Supabase realtime
      toast({ title: 'Task created successfully!' });
      onCancel();
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return <span>Pick a date</span>;
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, "dd MMM");
  };

  return (
    <tr className="bg-sky-500/5">
      <TableCell colSpan={3} className="py-2 pl-12 border-r border-white/5">
        <p className="font-bold text-[10px] uppercase tracking-widest text-sky-400">Assigning Task...</p>
      </TableCell>
      <TableCell className="py-2 border-r border-white/5">
        <Select onValueChange={setAssigneeId} value={assigneeId}>
          <SelectTrigger className="h-8 bg-transparent border-white/10 text-white">
            <SelectValue placeholder="Select Assignee" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
            {teamMembers.map(p => (
              <SelectItem key={p.id} value={p.id}>
                <div className="flex items-center gap-2">
                    <Avatar className="h-4 w-4"><AvatarImage src={p.avatar_url ?? undefined} /><AvatarFallback className="text-[6px]">{getInitials(p.full_name)}</AvatarFallback></Avatar>
                    {p.full_name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2 border-r border-white/5">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 w-full justify-start text-left font-normal bg-transparent border-white/10 text-zinc-300">
              <CalendarIcon className="mr-2 h-4 w-4 text-sky-400" />
              {formatDate(dueDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800">
            <CalendarComponent mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell colSpan={2} className="py-2 text-right">
        <div className="flex justify-end gap-2 pr-4">
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-zinc-500 hover:text-white">Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-sky-600 hover:bg-sky-500 text-white">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Task
          </Button>
        </div>
      </TableCell>
    </tr>
  );
};

const monthsList = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const yearsList = Array.from({ length: 8 }, (_, i) => 2023 + i);

export default function SchedulerClient({ clients, initialSchedules, teams, profiles, projects, selectedMonth }: { clients: Client[], initialSchedules: ScheduleWithDetails[], teams: Team[], profiles: Profile[], projects: Project[], selectedMonth: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(searchParams.get('client'));
  const [schedules, setSchedules] = useState(initialSchedules);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const { toast } = useToast();
  const [assigningScheduleId, setAssigningScheduleId] = useState<string | null>(null);
  const [showBin, setShowBin] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleWithDetails | null>(null);
  const [scheduleToEdit, setScheduleToEdit] = useState<ScheduleWithDetails | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [scheduleToDeletePermanently, setScheduleToDeletePermanently] = useState<ScheduleWithDetails | null>(null);
  const [scheduleToReassign, setScheduleToReassign] = useState<ScheduleWithDetails | null>(null);
  
  const [isClientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const clientSearchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+Enter to add new schedule
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (selectedClientId && !showBin && !isAddingSchedule) {
          e.preventDefault();
          setIsAddingSchedule(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClientId, showBin, isAddingSchedule]);

  useEffect(() => {
    // Set initial client ID on the client to avoid hydration mismatch
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
      router.replace(`/scheduler?client=${clients[0].id}&month=${selectedMonth}`);
    }
  }, [clients, selectedClientId, router, selectedMonth]);

  useEffect(() => {
    setSchedules(initialSchedules);
  }, [initialSchedules]);

  useEffect(() => {
    const supabase = createClient();
    const schedulesChannel = supabase
      .channel('realtime-scheduler')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_schedules' },
        (payload) => {
           const newRecord = payload.new as ScheduleWithDetails;
           const oldRecord = payload.old as ScheduleWithDetails;
           const recordId = newRecord?.id || oldRecord?.id;
          
           if (payload.eventType === 'INSERT') {
             setSchedules((prev) => [newRecord, ...prev]);
           } else if (payload.eventType === 'UPDATE') {
             setSchedules((prev) => prev.map((s) => (s.id === newRecord.id ? newRecord : s)));
           } else if (payload.eventType === 'DELETE') {
             setSchedules((prev) => prev.filter((s) => s.id !== recordId));
           }
        }
      )
      .subscribe();
      
    const tasksChannel = supabase
        .channel('realtime-scheduler-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' },
          (payload) => {
            const updatedTask = payload.new as Task;
            const scheduleId = payload.eventType === 'DELETE' ? payload.old.schedule_id : updatedTask.schedule_id;
            
            if (scheduleId) {
              setSchedules(prevSchedules => 
                prevSchedules.map(schedule => {
                  if (schedule.id === scheduleId) {
                    const taskToUpdate = payload.eventType === 'DELETE' ? null : { ...schedule.task, ...updatedTask } as Task;
                    return { ...schedule, task: taskToUpdate };
                  }
                  return schedule;
                })
              );
            }
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(schedulesChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, []);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [selectedClientId, clients]);
  
  const activeSchedules = useMemo(() => {
    if (!selectedClientId) return [];
    return schedules
      .filter(s => 
        s.client_id === selectedClientId && 
        !s.is_deleted && 
        s.scheduled_date.startsWith(selectedMonth)
      )
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
  }, [selectedClientId, schedules, selectedMonth]);

  const deletedSchedules = useMemo(() => {
    if (!selectedClientId) return [];
    return schedules
      .filter(s => 
        s.client_id === selectedClientId && 
        s.is_deleted && 
        s.scheduled_date.startsWith(selectedMonth)
      )
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
  }, [selectedClientId, schedules, selectedMonth]);

  const [currentYearPart, currentMonthPart] = useMemo(() => {
    const parts = selectedMonth.split('-');
    return [parts[0], parts[1]];
  }, [selectedMonth]);

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery) return clients;
    return clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()));
  }, [clients, clientSearchQuery]);

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    setClientSearchQuery("");
    setClientSearchOpen(false);
    router.push(`/scheduler?client=${clientId}&month=${selectedMonth}`);
  };

  const handleMonthChange = (newDate: Date) => {
    const monthStr = format(newDate, 'yyyy-MM');
    router.push(`/scheduler?client=${selectedClientId}&month=${monthStr}`);
  };

  const handlePartChange = (m: string, y: string) => {
    const monthStr = `${y}-${m}`;
    router.push(`/scheduler?client=${selectedClientId}&month=${monthStr}`);
  };
  
  const handleClientSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (filteredClients.length > 0) {
        handleClientSelect(filteredClients[0].id);
      }
    }
  };

  const getScheduleStatus = (schedule: ScheduleWithDetails): { status: Task['status'] | 'Planned' | 'Posting', isPosting: boolean, postingStatus?: 'Planned' | 'Scheduled' | 'Posted' | null } => {
    if (!schedule.task) return { status: 'Planned', isPosting: false };
    const task = schedule.task;
    
    if (task.parent_task_id) {
        return { status: 'Posting', isPosting: true, postingStatus: task.posting_status };
    }
    
    return { status: task.status, isPosting: false };
  };


  const handleScheduleAdded = (newSchedule: ScheduleWithDetails) => {
    setSchedules(prev => [newSchedule, ...prev]);
    setIsAddingSchedule(false);
  }
  
  const handleScheduleUpdated = (updatedSchedule: ScheduleWithDetails) => {
    setSchedules(prev => prev.map(s => s.id === updatedSchedule.id ? updatedSchedule : s));
  }

  const handleAssignTask = (scheduleId: string) => {
    setAssigningScheduleId(prev => (prev === scheduleId ? null : scheduleId));
  };

   const handleTaskCreated = (newTask: Task) => {
        setSchedules(prev => prev.map(s => s.id === newTask.schedule_id ? {
            ...s,
            task: newTask as TaskWithDetails['task']
        } : s));
        setAssigningScheduleId(null);
    };
    
    const handleDeleteClick = (schedule: ScheduleWithDetails) => {
      setScheduleToDelete(schedule);
    };

    const handleDelete = () => {
      if (!scheduleToDelete) return;
      startTransition(async () => {
        const { error } = await deleteSchedule(scheduleToDelete.id);
        if (error) {
          toast({ title: 'Error deleting schedule', description: error, variant: 'destructive' });
        } else {
          toast({ title: 'Schedule moved to bin' });
          setSchedules(prev => prev.map(s => s.id === scheduleToDelete.id ? { ...s, is_deleted: true } : s));
        }
        setScheduleToDelete(null);
      });
    };

    const handleRestore = (scheduleId: string) => {
      startTransition(async () => {
        const { error } = await restoreSchedule(scheduleId);
        if (error) {
          toast({ title: 'Error restoring schedule', description: error, variant: 'destructive' });
        } else {
          toast({ title: 'Schedule restored' });
          setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, is_deleted: false } : s));
        }
      });
    };

    const handleDeletePermanently = () => {
      if (!scheduleToDeletePermanently) return;
      startTransition(async () => {
        const { error } = await deleteSchedulePermanently(scheduleToDeletePermanently.id);
        if (error) {
          toast({ title: 'Error permanently deleting schedule', description: error, variant: 'destructive' });
        } else {
          toast({ title: 'Schedule permanently deleted' });
          setSchedules(prev => prev.filter(s => s.id !== scheduleToDeletePermanently.id));
        }
        setScheduleToDeletePermanently(null);
      });
    };


  return (
    <div className="bg-[#0f0f0f] p-4 md:p-8 lg:p-10 h-full w-full flex flex-col text-zinc-100">
        <header className="flex items-center justify-between pb-6 mb-2 border-b border-white/10">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-white">Scheduler</h1>
            
            <div className="flex items-center gap-2 bg-white/5 rounded-full p-1 border border-white/10">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-400 hover:text-white" onClick={() => handleMonthChange(subMonths(new Date(`${selectedMonth}-01T00:00:00Z`), 1))}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {/* Month Selector */}
                <Select value={currentMonthPart} onValueChange={(m) => handlePartChange(m, currentYearPart)}>
                    <SelectTrigger className="h-8 border-0 bg-transparent focus:ring-0 focus:ring-offset-0 px-2 w-auto min-w-[100px] text-sm font-black shadow-none hover:bg-white/5 rounded-full text-zinc-200">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        {monthsList.map((m, i) => (
                            <SelectItem key={m} value={String(i + 1).padStart(2, '0')}>
                                {m}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Year Selector */}
                <Select value={currentYearPart} onValueChange={(y) => handlePartChange(currentMonthPart, y)}>
                    <SelectTrigger className="h-8 border-0 bg-transparent focus:ring-0 focus:ring-offset-0 px-2 w-auto min-w-[80px] text-sm font-black shadow-none hover:bg-white/5 rounded-full text-zinc-200">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        {yearsList.map((y) => (
                            <SelectItem key={y} value={String(y)}>
                                {y}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-400 hover:text-white" onClick={() => handleMonthChange(addMonths(new Date(`${selectedMonth}-01T00:00:00Z`), 1))}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <Popover open={isClientSearchOpen} onOpenChange={setClientSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="w-[280px] h-10 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 group justify-start px-4">
                   {selectedClient ? (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-6 w-6 border border-white/10">
                          <AvatarImage src={selectedClient.avatar} />
                          <AvatarFallback className="bg-zinc-800 text-zinc-400">{getInitials(selectedClient.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-sm tracking-tight">{selectedClient.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-500 font-medium">Select a client</span>
                    )}
                    <ChevronDown className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity ml-auto" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0 bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl" align="start">
                <div className="p-2 border-b border-white/5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      ref={clientSearchInputRef}
                      placeholder="Search clients..."
                      className="pl-9 h-9 bg-black/20 border-white/10 text-white rounded-lg focus-visible:ring-sky-500/50"
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      onKeyDown={handleClientSearchKeyDown}
                    />
                  </div>
                </div>
                <ScrollArea className="h-60">
                   {filteredClients.map(client => (
                    <div
                      key={client.id}
                      role="button"
                      className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                      onClick={() => handleClientSelect(client.id)}
                    >
                      <Avatar className="h-7 w-7 border border-white/10">
                          <AvatarImage src={client.avatar} />
                          <AvatarFallback className="bg-zinc-800 text-zinc-400">{getInitials(client.name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-semibold tracking-tight">{client.name}</span>
                    </div>
                  ))}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            {showBin ? (
              <Button onClick={() => setShowBin(false)} variant="outline" className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white">Back to Schedules</Button>
            ) : (
              <>
                <Button onClick={() => setIsAddingSchedule(true)} disabled={!selectedClientId} className="rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                  <Plus className="mr-2 h-4 w-4" /> Add Schedule
                </Button>
                <Button variant="destructive" className={cn("rounded-full h-10 px-4 transition-all", showBin ? "bg-zinc-800 text-white border-zinc-700" : "bg-red-950/30 text-red-400 hover:bg-red-900/40 border-red-900/30")} onClick={() => setShowBin(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Bin
                </Button>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar pt-4">
          {selectedClientId ? (
            <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02] backdrop-blur-xl shadow-2xl shadow-black/50">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-b border-white/10 hover:bg-transparent">
                    <TableHead className="border-r border-white/10 w-[15%] text-xs font-semibold uppercase tracking-wider text-zinc-500">Schedule Date</TableHead>
                    <TableHead className="border-r border-white/10 w-[25%] text-xs font-semibold uppercase tracking-wider text-zinc-500">Schedule Detail</TableHead>
                    <TableHead className="border-r border-white/10 w-[15%] text-xs font-semibold uppercase tracking-wider text-zinc-500">Project</TableHead>
                    <TableHead className="border-r border-white/10 w-[15%] text-xs font-semibold uppercase tracking-wider text-zinc-500">Team</TableHead>
                    <TableHead className="border-r border-white/10 w-[15%] text-xs font-semibold uppercase tracking-wider text-zinc-500">Type</TableHead>
                    <TableHead className="w-[10%] text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</TableHead>
                    <TableHead className="w-[5%] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showBin ? (
                    <>
                      {deletedSchedules.map(schedule => (
                        <TableRow key={schedule.id} className="group border-b border-white/5 hover:bg-white/[0.04]">
                           <TableCell className="border-r border-white/5 text-zinc-300">{format(parseISO(schedule.scheduled_date), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="font-medium border-r border-white/5 text-zinc-100">{schedule.title}</TableCell>
                            <TableCell className="border-r border-white/5 text-zinc-400">{schedule.projects?.name || 'N/A'}</TableCell>
                            <TableCell className="border-r border-white/5 text-zinc-400">{schedule.teams?.name || 'N/A'}</TableCell>
                            <TableCell className="border-r border-white/5 text-zinc-400">{schedule.content_type || 'N/A'}</TableCell>
                            <TableCell><Badge variant="outline" className="bg-red-950/20 text-red-400 border-red-900/30">Deleted</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleRestore(schedule.id)} className="text-sky-400 hover:bg-sky-500/10">
                                <RefreshCcw className="mr-2 h-4 w-4" /> Restore
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setScheduleToDeletePermanently(schedule)} className="text-red-400 hover:bg-red-500/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {deletedSchedules.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center text-zinc-600 italic text-sm">
                            The bin is empty for {selectedClient?.name} in {format(new Date(`${selectedMonth}-01T00:00:00Z`), 'MMMM')}.
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ) : (
                    <>
                      {isAddingSchedule && (
                        <AddScheduleRow
                          clientId={selectedClientId}
                          onScheduleAdded={handleScheduleAdded}
                          onCancel={() => setIsAddingSchedule(false)}
                          teams={teams}
                          projects={projects}
                        />
                      )}
                      {activeSchedules.map(schedule => {
                        const statusInfo = getScheduleStatus(schedule);
                        let icon, label;

                        if (statusInfo.isPosting) {
                          const postStatus = schedule.task?.posting_status || 'Planned';
                          icon = postingStatusIcons[postStatus];
                          label = postingStatusLabels[postStatus];
                        } else {
                          const taskStatus = statusInfo.status as Task['status'];
                          icon = statusIcons[taskStatus] || postingStatusIcons['Planned'];
                          label = statusLabels[taskStatus] || 'Planned';
                        }
                        return (
                          <React.Fragment key={schedule.id}>
                            <TableRow className="group border-b border-white/5 hover:bg-white/[0.04]">
                              <TableCell className="border-r border-white/5 text-zinc-300">{format(parseISO(schedule.scheduled_date), 'MMM d, yyyy')}</TableCell>
                              <TableCell className="font-medium border-r border-white/5 text-zinc-100">{schedule.title}</TableCell>
                              <TableCell className="border-r border-white/5 text-zinc-400">{schedule.projects?.name || 'N/A'}</TableCell>
                              <TableCell className="border-r border-white/5 text-zinc-400">{schedule.teams?.name || 'N/A'}</TableCell>
                              <TableCell className="border-r border-white/5 text-zinc-400">{schedule.content_type || 'N/A'}</TableCell>
                              <TableCell>
                                {schedule.task ? (
                                  <div className="flex items-center gap-2 text-zinc-200">
                                    {icon}
                                    <span className="text-sm font-medium">{label}</span>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-[10px] uppercase font-black px-3 rounded-full border-sky-500/20 text-sky-400 hover:bg-sky-500/10"
                                    onClick={() => handleAssignTask(schedule.id)}
                                  >
                                    Assign as task
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-sky-400">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-100">
                                      {(schedule.task?.status === 'done' || schedule.task?.status === 'approved') && !schedule.task.parent_task_id && (
                                        <DropdownMenuItem onClick={() => setScheduleToReassign(schedule)}>
                                          <Share2 className="mr-2 h-4 w-4" /> Re-assign for Posting
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => { setScheduleToEdit(schedule); setIsEditOpen(true); }}>
                                        <Pencil className="mr-2 h-4 w-4" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-red-400 focus:text-red-500" onClick={() => handleDeleteClick(schedule)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                            {assigningScheduleId === schedule.id && (
                              <AssignTaskRow
                                schedule={schedule}
                                profiles={profiles}
                                onSave={handleTaskCreated}
                                onCancel={() => setAssigningScheduleId(null)}
                              />
                            )}
                          </React.Fragment>
                        )
                      })}
                      {(activeSchedules.length === 0 && !isAddingSchedule) && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center text-zinc-600 italic text-sm">
                            No schedules for {selectedClient?.name} in {format(new Date(`${selectedMonth}-01T00:00:00Z`), 'MMMM')}.
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-zinc-600 bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[2rem] py-24">
              <CalendarIcon className="h-16 w-16 opacity-10 mb-6" />
              <h3 className="text-xl font-bold text-zinc-500">Ready to Schedule?</h3>
              <p className="max-w-xs mt-2 font-medium">Please select a client from the top menu to view or manage their content schedule.</p>
            </div>
          )}
        </main>

        <ReassignTaskDialog
            isOpen={!!scheduleToReassign}
            setIsOpen={() => setScheduleToReassign(null)}
            task={scheduleToReassign?.task as TaskWithDetails}
            profiles={profiles}
            onTaskCreated={handleTaskCreated}
        />
        {scheduleToEdit && (
            <EditScheduleDialog
            isOpen={isEditOpen}
            setIsOpen={setIsEditOpen}
            schedule={scheduleToEdit}
            onScheduleUpdated={handleScheduleUpdated}
            teams={teams}
            projects={projects}
            />
        )}
        
        <AlertDialog open={!!scheduleToDelete} onOpenChange={(open) => !open && setScheduleToDelete(null)}>
            <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <AlertDialogHeader>
                <AlertDialogTitle>Move to bin?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">
                The schedule for "{scheduleToDelete?.title}" will be moved to the bin. You can restore it later.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700">Cancel</AlertDialogCancel>
                <AlertDialogAction
                onClick={handleDelete}
                className={cn(buttonVariants({ variant: 'destructive' }))}
                disabled={isPending}
                >
                {isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!scheduleToDeletePermanently} onOpenChange={(open) => !open && setScheduleToDeletePermanently(null)}>
            <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <AlertDialogHeader>
                <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">
                    This action is irreversible. All data for the schedule "{scheduleToDeletePermanently?.title}" will be removed.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700">Cancel</AlertDialogCancel>
                <AlertDialogAction
                onClick={handleDeletePermanently}
                className={cn(buttonVariants({ variant: 'destructive' }))}
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
