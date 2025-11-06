
'use client';

import { useState, useMemo, useTransition } from 'react';
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
import { Plus, Calendar as CalendarIcon, Loader2, X } from 'lucide-react';
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
import type { Client, ContentSchedule, Task } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { addSchedule } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

type ScheduleWithTask = ContentSchedule & { task: Task | null };

interface SchedulerClientProps {
  clients: Client[];
  initialSchedules: ScheduleWithTask[];
}

const getScheduleStatus = (schedule: ScheduleWithTask): string => {
  if (!schedule.task) return 'Planned';
  
  const task = schedule.task;
  // This logic now matches the updated flow
  if (task.parent_task_id) { // It's a re-assigned posting task
    return task.posting_status || 'Posting';
  }
  
  switch (task.status) {
    case 'todo': return 'Assigned';
    case 'inprogress': return 'On Progress';
    case 'done': return 'Created';
    default: return 'Planned';
  }
};

const AddScheduleCard = ({
  clientId,
  onScheduleAdded,
  onCancel,
}: {
  clientId: string;
  onScheduleAdded: (schedule: ContentSchedule) => void;
  onCancel: () => void;
}) => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!title || !scheduledDate) {
      toast({
        title: 'Missing Fields',
        description: 'Title and Scheduled Date are required.',
        variant: 'destructive',
      });
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.append('client_id', clientId);
      formData.append('title', title);
      if (contentType) formData.append('content_type', contentType);
      formData.append('scheduled_date', format(scheduledDate, 'yyyy-MM-dd'));
      if (notes) formData.append('notes', notes);

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
        onScheduleAdded(result.data);
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
          <div className="space-y-2">
            <Label htmlFor="new-content-type">Content Type</Label>
            <Input id="new-content-type" value={contentType} onChange={(e) => setContentType(e.target.value)} placeholder="e.g., Blog Post" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-notes">Notes</Label>
          <Input id="new-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
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


export default function SchedulerClient({ clients, initialSchedules }: SchedulerClientProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [isAdding, setIsAdding] = useState(false);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [selectedClientId, clients]);

  const filteredSchedules = useMemo(() => {
    if (!selectedClientId) return [];
    return schedules.filter(s => s.client_id === selectedClientId);
  }, [selectedClientId, schedules]);
  
  const groupedSchedules = useMemo(() => {
    return filteredSchedules.reduce((acc, schedule) => {
      const date = format(parseISO(schedule.scheduled_date), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(schedule);
      return acc;
    }, {} as Record<string, ScheduleWithTask[]>);
  }, [filteredSchedules]);

  const sortedDates = Object.keys(groupedSchedules).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const handleScheduleAdded = (newSchedule: ContentSchedule) => {
    setSchedules(prev => [{ ...newSchedule, task: null }, ...prev]);
    setIsAdding(false);
  }

  return (
    <>
      <div className="p-4 md:p-8 lg:p-10 h-full flex flex-col">
        <header className="flex items-center justify-between pb-4 mb-4 border-b">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Content Scheduler</h1>
            <Select onValueChange={setSelectedClientId} value={selectedClientId || undefined}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a client" />
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
            <div className="space-y-8">
              {isAdding && (
                <div>
                  <h2 className="font-semibold text-lg mb-4">New Schedule</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AddScheduleCard 
                      clientId={selectedClientId} 
                      onScheduleAdded={handleScheduleAdded}
                      onCancel={() => setIsAdding(false)}
                    />
                  </div>
                </div>
              )}
              {sortedDates.length > 0 ? (
                  sortedDates.map(date => (
                      <div key={date}>
                          <h2 className="font-semibold text-lg mb-4">{format(parseISO(date), 'EEEE, MMMM d')}</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {groupedSchedules[date].map(schedule => (
                                  <Card key={schedule.id} className="group">
                                      <CardHeader>
                                          <CardTitle className="text-base">{schedule.title}</CardTitle>
                                          <CardDescription>{schedule.content_type || 'No type'}</CardDescription>
                                      </CardHeader>
                                      <CardContent>
                                          <div className="text-sm">
                                              <p><strong>Status:</strong> {getScheduleStatus(schedule)}</p>
                                              {schedule.notes && <p className="text-muted-foreground mt-2">{schedule.notes}</p>}
                                          </div>
                                      </CardContent>
                                  </Card>
                              ))}
                          </div>
                      </div>
                  ))
              ) : (
                !isAdding && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <p className="text-lg font-medium">No schedules for {selectedClient?.name}.</p>
                      <p>Click "Add Schedule" to get started.</p>
                  </div>
                )
              )}
            </div>
          ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <p className="text-lg font-medium">Please select a client to view their schedule.</p>
              </div>
          )}
        </main>
      </div>
    </>
  );
}
