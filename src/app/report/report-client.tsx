
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  MessageSquare,
  Repeat,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getInitials, cn } from '@/lib/utils';
import { format, parseISO, isToday } from 'date-fns';
import type { Profile, TaskWithDetails, Task } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SubmissionTask extends TaskWithDetails {
    submission_type: string;
    submitted_at: string;
}

interface ReportClientProps {
  initialProfiles: Profile[];
  initialTasks: SubmissionTask[];
  selectedDate: string;
}

const statusIcons: Record<Task['status'], React.ReactNode> = {
  'todo': <AlertCircle className="h-3 w-3" />,
  'inprogress': <Clock className="h-3 w-3" />,
  'review': <Eye className="h-3 w-3" />,
  'under-review': <Eye className="h-3 w-3" />,
  'corrections': <MessageSquare className="h-3 w-3" />,
  'recreate': <Repeat className="h-3 w-3" />,
  'approved': <CheckCircle2 className="h-3 w-3" />,
  'done': <CheckCircle2 className="h-3 w-3" />,
};

const statusColors: Record<Task['status'], string> = {
  'todo': 'bg-gray-100 text-gray-700',
  'inprogress': 'bg-blue-100 text-blue-700',
  'review': 'bg-purple-100 text-purple-700',
  'under-review': 'bg-purple-100 text-purple-700',
  'corrections': 'bg-orange-100 text-orange-700',
  'recreate': 'bg-red-100 text-red-700',
  'approved': 'bg-green-100 text-green-700',
  'done': 'bg-green-100 text-green-700',
};

const UserReportCard = ({ user, tasks }: { user: Profile; tasks: SubmissionTask[] }) => {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  const totalTasks = tasks.length;
  const approvedTasks = tasks.filter(t => t.status === 'approved' || t.status === 'done').length;
  const approvalRate = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;

  return (
    <Card className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{user.full_name}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span className="font-medium text-primary">{totalTasks} Submissions</span>
              {totalTasks > 0 && (
                <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">
                  {approvalRate}% Approved
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {totalTasks > 0 ? (
          <ScrollArea className="h-[300px]">
            <ul className="divide-y border-t">
              {tasks.map((task) => (
                <li key={`${task.id}-${task.submitted_at}`} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight mb-1 line-clamp-2">{task.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{task.projects?.name || 'No project'}</span>
                        {hasMounted && (
                          <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                            • {format(parseISO(task.submitted_at), 'h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge className={cn("px-2 py-0 h-5 text-[10px] border-0", statusColors[task.status])}>
                            <span className="flex items-center gap-1">
                                {statusIcons[task.status]}
                                {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ')}
                            </span>
                        </Badge>
                        {task.submission_type !== 'original' && (
                            <Badge variant="outline" className="px-1.5 py-0 h-4 text-[9px] border-blue-200 text-blue-600 bg-blue-50/50 uppercase tracking-wider">
                                {task.submission_type}
                            </Badge>
                        )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground p-6 text-center border-t italic text-sm">
            <p>No submissions for this date.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function ReportClient({ initialProfiles, initialTasks, selectedDate }: ReportClientProps) {
  const router = useRouter();
  const [date, setDate] = useState(selectedDate);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    router.push(`/report?date=${newDate}`);
  };

  const formattedTitleDate = format(parseISO(date), 'EEEE, dd MMMM yyyy');

  return (
    <div className="p-4 md:p-8 lg:p-10 min-h-screen bg-slate-50/50">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Daily Work Report</h1>
          <p className="text-muted-foreground mt-1">{formattedTitleDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleDateChange(format(new Date(), 'yyyy-MM-dd'))} disabled={isToday(parseISO(date))}>
            Today
          </Button>
          <div className="flex items-center border rounded-md bg-white shadow-sm px-3 h-10">
            <CalendarIcon className="h-4 w-4 text-muted-foreground mr-2" />
            <Input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="border-0 p-0 h-auto w-32 focus-visible:ring-0 text-sm"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {initialProfiles.map((profile) => (
          <UserReportCard 
            key={profile.id} 
            user={profile} 
            tasks={initialTasks.filter(t => t.assignee_id === profile.id)}
          />
        ))}
      </div>
    </div>
  );
}
