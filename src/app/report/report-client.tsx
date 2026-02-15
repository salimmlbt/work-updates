
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  MessageSquare,
  Repeat,
  Clock,
  FileX,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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

const statusConfig: Record<Task['status'], { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  'todo': { icon: <AlertCircle className="h-4 w-4" />, label: 'Todo', color: 'text-gray-600', bg: 'bg-gray-100' },
  'inprogress': { icon: <Clock className="h-4 w-4" />, label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-100' },
  'review': { icon: <Eye className="h-4 w-4" />, label: 'Review', color: 'text-purple-600', bg: 'bg-purple-100' },
  'under-review': { icon: <Eye className="h-4 w-4" />, label: 'Review', color: 'text-purple-600', bg: 'bg-purple-100' },
  'corrections': { icon: <MessageSquare className="h-4 w-4" />, label: 'Corrections', color: 'text-orange-600', bg: 'bg-orange-100' },
  'recreate': { icon: <Repeat className="h-4 w-4" />, label: 'Recreate', color: 'text-red-600', bg: 'bg-red-100' },
  'approved': { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Approved', color: 'text-green-600', bg: 'bg-green-100' },
  'done': { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Approved', color: 'text-green-600', bg: 'bg-green-100' },
};

const UserReportCard = ({ user, tasks }: { user: Profile; tasks: SubmissionTask[] }) => {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  const totalTasks = tasks.length;
  const approvedTasks = tasks.filter(t => t.status === 'approved' || t.status === 'done').length;
  const approvalRate = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;

  return (
    <Card className="flex flex-col shadow-lg border-0 bg-slate-50/50 rounded-2xl overflow-hidden">
      <CardHeader className="bg-white p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-slate-100">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="bg-slate-100 text-slate-600 font-semibold">{getInitials(user.full_name)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 uppercase">
                {user.full_name}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-600">
                  {totalTasks} Submission{totalTasks !== 1 ? 's' : ''}
                </span>
                <Badge variant="outline" className="bg-green-50 text-green-600 border-green-100 px-2 py-0 h-5 text-[11px] font-semibold">
                  {approvalRate}% Approved
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2 w-1/3">
            <div className="flex items-center gap-3 w-full">
                <div className="flex-1">
                    <Progress value={approvalRate} className="h-2 bg-slate-100 [&>div]:bg-green-500" />
                </div>
                <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">{approvalRate}% Approved</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 pt-2">
        <ScrollArea className="h-[450px] pr-2">
          <div className="space-y-3">
            {tasks.map((task) => {
              const config = statusConfig[task.status] || statusConfig['todo'];
              return (
                <div 
                  key={`${task.id}-${task.submitted_at}`} 
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {task.description}
                        </h3>
                        {task.submission_type !== 'original' && (
                          <Badge variant="outline" className="px-1.5 py-0 h-4 text-[9px] border-blue-200 text-blue-600 bg-blue-50 uppercase tracking-wider font-bold shrink-0">
                            {task.submission_type === 'correction' ? 'Correction' : 'Recreated'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[13px] text-slate-500">
                        <span className="truncate">{task.clients?.name || 'No Client'}</span>
                        <span>•</span>
                        {hasMounted && (
                          <span className="whitespace-nowrap font-medium text-slate-400">
                            {format(parseISO(task.submitted_at), 'h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="shrink-0">
                      <div className={cn(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-sm",
                        config.bg,
                        config.color
                      )}>
                        {config.icon}
                        <span>{config.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
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
    <div className="p-4 md:p-8 lg:p-10 min-h-screen bg-[#f8fafc]">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Daily Work Report</h1>
          <p className="text-slate-500 font-medium">{formattedTitleDate}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => handleDateChange(format(new Date(), 'yyyy-MM-dd'))} 
            disabled={isToday(parseISO(date))}
            className="rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50"
          >
            Today
          </Button>
          <div className="flex items-center border border-slate-200 rounded-xl bg-white shadow-sm px-4 h-10">
            <CalendarIcon className="h-4 w-4 text-slate-400 mr-2" />
            <Input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="border-0 p-0 h-auto w-32 focus-visible:ring-0 text-sm font-medium text-slate-700 bg-transparent"
            />
          </div>
        </div>
      </header>

      {initialProfiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="bg-slate-50 p-6 rounded-full mb-6">
                <FileX className="h-12 w-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No work submitted yet</h3>
            <p className="text-slate-500 max-w-sm mt-2 font-medium">
                There are no review tasks found for {format(parseISO(date), 'MMMM d, yyyy')}.
            </p>
            <Button 
              variant="outline" 
              onClick={() => handleDateChange(format(new Date(), 'yyyy-MM-dd'))} 
              className="mt-8 rounded-xl"
            >
                View Today
            </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {initialProfiles.map((profile) => (
            <UserReportCard 
                key={profile.id} 
                user={profile} 
                tasks={initialTasks.filter(t => t.assignee_id === profile.id)}
            />
            ))}
        </div>
      )}
    </div>
  );
}
