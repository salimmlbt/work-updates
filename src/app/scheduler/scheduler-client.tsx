'use client';

import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getInitials } from '@/lib/utils';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import type { Client, ContentSchedule, Task } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type ScheduleWithTask = ContentSchedule & { task: Task | null };

interface SchedulerClientProps {
  clients: Client[];
  initialSchedules: ScheduleWithTask[];
}

const getScheduleStatus = (schedule: ScheduleWithTask): string => {
  if (!schedule.task) return 'Planned';
  
  const task = schedule.task;
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


export default function SchedulerClient({ clients, initialSchedules }: SchedulerClientProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null);
  const [schedules, setSchedules] = useState(initialSchedules);

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

  return (
    <div className="p-4 md:p-8 lg:p-10 h-full flex flex-col">
      <header className="flex items-center justify-between pb-4 mb-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Content Scheduler</h1>
          <Select onValueChange={setSelectedClientId} value={selectedClientId || undefined}>
            <SelectTrigger className="w-[280px]">
                <div className="flex items-center gap-2">
                    {selectedClient && (
                         <Avatar className="h-6 w-6">
                            <AvatarImage src={selectedClient.avatar} />
                            <AvatarFallback>{getInitials(selectedClient.name)}</AvatarFallback>
                        </Avatar>
                    )}
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
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Schedule
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto">
        {selectedClientId ? (
            sortedDates.length > 0 ? (
                 <div className="space-y-8">
                    {sortedDates.map(date => (
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
                    ))}
                 </div>
            ) : (
                 <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <p className="text-lg font-medium">No schedules for {selectedClient?.name}.</p>
                    <p>Click "Add Schedule" to get started.</p>
                </div>
            )
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <p className="text-lg font-medium">Please select a client to view their schedule.</p>
            </div>
        )}
      </main>
    </div>
  );
}
