
'use client';

import React, { useState, useMemo, useTransition, useEffect, useRef } from 'react';
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
import { Plus, Calendar as CalendarIcon, Loader2, MoreVertical, Share2, Trash2, Pencil, RefreshCcw } from 'lucide-react';
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
import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns';
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
  
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

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
     <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell>
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, 'MMM d, yyyy') : 'Pick a date'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus />
                </PopoverContent>
            </Popover>
        </TableCell>
        <TableCell>
            <Input ref={titleInputRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Content Title" />
        </TableCell>
         <TableCell>
             <Select onValueChange={setProjectId} value={projectId || 'no-project'}>
                <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="no-project">No project</SelectItem>
                    {clientProjects.map(project => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </TableCell>
        <TableCell>
             <Select onValueChange={setTeamId}>
                <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                    {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </TableCell>
        <TableCell>
            <Select onValueChange={setContentType} value={contentType} disabled={!teamId}>
                <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                    {availableWorkTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </TableCell>
        <TableCell>
           <span className="text-muted-foreground italic">Planned</span>
        </TableCell>
        <TableCell className="text-right">
           <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending}>
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
    <tr className="bg-muted/30">
      <TableCell colSpan={3} className="py-2 pl-12">
        <p className="font-medium text-xs text-muted-foreground">Assigning Task...</p>
      </TableCell>
      <TableCell className="py-2">
        <Select onValueChange={setAssigneeId} value={assigneeId}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select Assignee" />
          </SelectTrigger>
          <SelectContent>
            {teamMembers.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDate(dueDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell colSpan={2} className="py-2 text-right">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Task
          </Button>
        </div>
      </TableCell>
    </tr>
  );
};

export default function SchedulerClient({ clients, initialSchedules, teams, profiles, projects }: { clients: Client[], initialSchedules: ScheduleWithDetails[], teams: Team[], profiles: Profile[], projects: Project[] }) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const { toast } = useToast();
  const [scheduleToReassign, setScheduleToReassign] = useState<ScheduleWithDetails | null>(null);
  const [assigningScheduleId, setAssigningScheduleId] = useState<string | null>(null);
  const [showBin, setShowBin] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleWithDetails | null>(null);
  const [scheduleToEdit, setScheduleToEdit] = useState<ScheduleWithDetails | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [scheduleToDeletePermanently, setScheduleToDeletePermanently] = useState<ScheduleWithDetails | null>(null);
  
  useEffect(() => {
    // Set initial client ID on the client to avoid hydration mismatch
    if (!selectedClientId && clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [selectedClientId, clients]);
  
  const activeSchedules = useMemo(() => {
    if (!selectedClientId) return [];
    return schedules
      .filter(s => s.client_id === selectedClientId && !s.is_deleted)
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
  }, [selectedClientId, schedules]);

  const deletedSchedules = useMemo(() => {
    if (!selectedClientId) return [];
    return schedules
      .filter(s => s.client_id === selectedClientId && s.is_deleted)
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
  }, [selectedClientId, schedules]);

  const getScheduleStatus = (schedule: ScheduleWithDetails): string => {
    if (!schedule.task) return 'Planned';
    const task = schedule.task;
    
    if (task.parent_task_id) {
        return task.posting_status || 'Posting';
    }
    
    const statusMap: Record<Task['status'], string> = {
        'todo': 'Assigned',
        'inprogress': 'In Progress',
        'done': 'Created',
        'under-review': 'Under Review',
        'review': 'Review',
        'corrections': 'Corrections',
        'recreate': 'Recreate',
        'approved': 'Approved',
    };
    return statusMap[task.status] || 'Planned';
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
    <>
      <div className="p-4 md:p-8 lg:p-10 h-full flex flex-col">
        <header className="flex items-center justify-between pb-4 mb-4 border-b">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Content Scheduler</h1>
             <Select onValueChange={(value) => { setSelectedClientId(value); setShowBin(false); }} value={selectedClientId || undefined}>
              <SelectTrigger className="w-[280px]">
                 {selectedClient ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedClient.avatar} />
                          <AvatarFallback>{getInitials(selectedClient.name)}</AvatarFallback>
                      </Avatar>
                      {selectedClient.name}
                    </div>
                  ) : (
                    <SelectValue placeholder="Select a client" />
                  )}
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                          <AvatarImage src={client.avatar} />
                          <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                      </Avatar>
                      {client.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {showBin ? (
              <Button onClick={() => setShowBin(false)} variant="outline">Back to Schedules</Button>
            ) : (
              <>
                <Button onClick={() => setIsAddingSchedule(true)} disabled={!selectedClientId}>
                  <Plus className="mr-2 h-4 w-4" /> Add Schedule
                </Button>
                <Button variant="destructive" className="bg-red-100 text-red-600 hover:bg-red-200" onClick={() => setShowBin(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Bin
                </Button>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {selectedClientId ? (
            showBin ? (
                 <div className="border-y">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Schedule Date</TableHead>
                                <TableHead>Schedule Detail</TableHead>
                                <TableHead className="w-[20%] text-right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {deletedSchedules.map(schedule => (
                                <TableRow key={schedule.id} className="group">
                                    <TableCell>{format(parseISO(schedule.scheduled_date), 'MMM d, yyyy')}</TableCell>
                                    <TableCell className="font-medium">{schedule.title}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleRestore(schedule.id)}>
                                                <RefreshCcw className="mr-2 h-4 w-4" /> Restore
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => setScheduleToDeletePermanently(schedule)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </div>
            ) : (
                <div className="border-y">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-t-0">
                        <TableHead>Schedule Date</TableHead>
                        <TableHead>Schedule Detail</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Schedule Team</TableHead>
                        <TableHead>Schedule Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[5%] text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {isAddingSchedule && (
                            <AddScheduleRow
                                clientId={selectedClientId}
                                onScheduleAdded={handleScheduleAdded}
                                onCancel={() => setIsAddingSchedule(false)}
                                teams={teams}
                                projects={projects}
                            />
                        )}
                      {activeSchedules.map(schedule => (
                        <React.Fragment key={schedule.id}>
                          <TableRow className="group">
                            <TableCell>{format(parseISO(schedule.scheduled_date), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="font-medium">{schedule.title}</TableCell>
                            <TableCell>{schedule.projects?.name || 'N/A'}</TableCell>
                            <TableCell>{schedule.teams?.name || 'N/A'}</TableCell>
                            <TableCell>{schedule.content_type || 'N/A'}</TableCell>
                            <TableCell>{getScheduleStatus(schedule)}</TableCell>
                            <TableCell className="text-right">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem 
                                      disabled={!!schedule.task}
                                      onClick={() => handleAssignTask(schedule.id)}
                                    >
                                      Assign as Task
                                    </DropdownMenuItem>
                                     {(schedule.task?.status === 'done' || schedule.task?.status === 'approved') && !schedule.task.parent_task_id && (
                                        <DropdownMenuItem onClick={() => setScheduleToReassign(schedule)}>
                                            <Share2 className="mr-2 h-4 w-4" /> Re-assign for Posting
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => { setScheduleToEdit(schedule); setIsEditOpen(true); }}>
                                      <Pencil className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600 focus:text-red-500" onClick={() => handleDeleteClick(schedule)}>
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
                      ))}
                      {(activeSchedules.length === 0 && !isAddingSchedule) && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                              No schedules for {selectedClient?.name}. Click "Add Schedule" to get started.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <p className="text-lg font-medium">Please select a client to view their schedule.</p>
            </div>
          )}
        </main>
      </div>
      {scheduleToReassign && scheduleToReassign.task && (
          <ReassignTaskDialog
              isOpen={!!scheduleToReassign}
              setIsOpen={() => setScheduleToReassign(null)}
              task={scheduleToReassign.task as TaskWithDetails}
              profiles={profiles}
              onTaskCreated={handleTaskCreated}
          />
      )}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the schedule for "{scheduleToDelete?.title}" to the bin. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className={buttonVariants({ variant: 'destructive' })}
              disabled={isPending}
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!scheduleToDeletePermanently} onOpenChange={(open) => !open && setScheduleToDeletePermanently(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone and will permanently delete the schedule "{scheduleToDeletePermanently?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePermanently}
              className={buttonVariants({ variant: 'destructive' })}
              disabled={isPending}
            >
              {isPending ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
