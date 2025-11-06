
'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Plus, Calendar as CalendarIcon, Loader2, MoreVertical, Share2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { getInitials, cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { Client, Team, Profile, Task, TaskWithDetails } from '@/lib/types';
import type { ScheduleWithDetails } from './page';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { addSchedule, createTaskFromSchedule } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ReassignTaskDialog } from '@/app/tasks/reassign-task-dialog';


const AddScheduleCard = ({
  clientId,
  onScheduleAdded,
  onCancel,
  teams,
}: {
  clientId: string;
  onScheduleAdded: (schedule: ScheduleWithDetails) => void;
  onCancel: () => void;
  teams: Team[];
}) => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [contentType, setContentType] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());

  const availableWorkTypes = useMemo(() => {
    if (!teamId) return [];
    const selectedTeam = teams.find(t => t.id === teamId);
    return selectedTeam?.default_tasks || [];
  }, [teamId, teams]);
  
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
        }
        onScheduleAdded(newScheduleWithDetails);
      }
    });
  };

  return (
    <Card className="bg-muted/50">
      <CardHeader>
        <CardTitle className="text-base">New Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-title">Title</Label>
          <Input id="new-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Content Title" />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
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
            </div>
            <div className="space-y-2">
                <Label htmlFor="new-content-type">Content Type</Label>
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
            </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="new-date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !scheduledDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? format(scheduledDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={scheduledDate}
                  onSelect={setScheduledDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </CardFooter>
    </Card>
  );
};

export default function SchedulerClient({ clients, initialSchedules, teams, profiles }: { clients: Client[], initialSchedules: ScheduleWithDetails[], teams: Team[], profiles: Profile[] }) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [isAdding, setIsAdding] = useState(false);
  const [isAssigning, startAssignTransition] = useTransition();
  const { toast } = useToast();
  const [scheduleToReassign, setScheduleToReassign] = useState<ScheduleWithDetails | null>(null);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [selectedClientId, clients]);

  const filteredSchedules = useMemo(() => {
    if (!selectedClientId) return [];
    return schedules
      .filter(s => s.client_id === selectedClientId)
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
  }, [selectedClientId, schedules]);

  const getScheduleStatus = (schedule: ScheduleWithDetails): string => {
    if (!schedule.task) return 'Planned';
    const task = schedule.task;
    
    if (task.parent_task_id) {
        return task.posting_status || 'Posting';
    }
    
    // This logic needs to align with what's in tasks-client.tsx statusLabels
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
    setIsAdding(false);
  }

  const handleAssignTask = (schedule: ScheduleWithDetails) => {
    startAssignTransition(async () => {
      const { error, data } = await createTaskFromSchedule(schedule);
      if (error) {
        toast({ title: "Error assigning task", description: error, variant: "destructive" });
      } else if (data) {
        toast({ title: "Task Assigned", description: "A new task has been created from this schedule."});
        setSchedules(prev => prev.map(s => s.id === schedule.id ? {...s, task: data} : s));
      }
    });
  }

   const handleTaskCreated = (newTask: Task) => {
        // This is called after re-assignment. We need to find the parent schedule and update its task.
        const parentSchedule = schedules.find(s => s.task?.id === newTask.parent_task_id);
        if (parentSchedule) {
            setSchedules(prev => prev.map(s => s.id === parentSchedule.id ? {...s, task: newTask as TaskWithDetails['task'] } : s));
        }
    };


  return (
    <>
      <div className="p-4 md:p-8 lg:p-10 h-full flex flex-col">
        <header className="flex items-center justify-between pb-4 mb-4 border-b">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Content Scheduler</h1>
            <Select onValueChange={setSelectedClientId} value={selectedClientId || undefined}>
              <SelectTrigger className="w-[280px]">
                <div className="flex items-center gap-2">
                  {selectedClient && <Avatar className="h-6 w-6">
                      <AvatarImage src={selectedClient.avatar} />
                      <AvatarFallback>{getInitials(selectedClient.name)}</AvatarFallback>
                  </Avatar>}
                  <SelectValue placeholder="Select a client" />
                </div>
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
          <Button onClick={() => setIsAdding(true)} disabled={!selectedClientId}>
            <Plus className="mr-2 h-4 w-4" /> Add Schedule
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto">
          {selectedClientId ? (
            isAdding ? (
              <div className="max-w-2xl mx-auto">
                <AddScheduleCard 
                  clientId={selectedClientId} 
                  onScheduleAdded={handleScheduleAdded}
                  onCancel={() => setIsAdding(false)}
                  teams={teams}
                />
              </div>
            ) : (
              filteredSchedules.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Schedule Date</TableHead>
                        <TableHead>Schedule Detail</TableHead>
                        <TableHead>Schedule Team</TableHead>
                        <TableHead>Schedule Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[5%] text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSchedules.map(schedule => (
                          <TableRow key={schedule.id} className="group">
                            <TableCell>{format(parseISO(schedule.scheduled_date), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="font-medium">{schedule.title}</TableCell>
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
                                      disabled={!!schedule.task || isAssigning}
                                      onClick={() => handleAssignTask(schedule)}
                                    >
                                      {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      Assign as Task
                                    </DropdownMenuItem>
                                     {(schedule.task?.status === 'done' || schedule.task?.status === 'approved') && !schedule.task.parent_task_id && (
                                        <DropdownMenuItem onClick={() => setScheduleToReassign(schedule)}>
                                            <Share2 className="mr-2 h-4 w-4" /> Re-assign for Posting
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem>Edit</DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <p className="text-lg font-medium">No schedules for {selectedClient?.name}.</p>
                    <p>Click "Add Schedule" to get started.</p>
                </div>
              )
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
    </>
  );
}
