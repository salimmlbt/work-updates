
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
  const approvedTasks = tasks.filter(
    t => t.status === 'approved' || t.status === 'done'
  ).length;

  const approvalRate =
    totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;

  return (
    <Card className="
      group relative flex flex-col
      rounded-3xl
      border border-slate-200/60
      bg-gradient-to-br from-white to-slate-50
      shadow-sm hover:shadow-xl
      transition-all duration-300
      overflow-hidden
    ">
      
      {/* Top Accent Line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-80" />

      {/* HEADER */}
      <CardHeader className="p-6 pb-4 bg-white/70 backdrop-blur-md">
        <div className="flex items-start justify-between">
          
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 ring-4 ring-white shadow-md">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="bg-slate-200 text-slate-700 font-bold">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>

            <div>
              <h2 className="text-base font-semibold tracking-wide text-slate-900 uppercase">
                {user.full_name}
              </h2>

              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-medium text-blue-600">
                  {totalTasks} Submission{totalTasks !== 1 ? 's' : ''}
                </span>

                <Badge
                  className="
                    rounded-full
                    bg-emerald-50
                    text-emerald-600
                    border-emerald-100
                    text-[11px]
                    px-3 py-0.5
                    font-semibold
                  "
                >
                  {approvalRate}% Approved
                </Badge>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="w-32">
            <Progress
              value={approvalRate}
              className="h-2 bg-slate-200 [&>div]:bg-gradient-to-r [&>div]:from-emerald-400 [&>div]:to-emerald-600"
            />
          </div>
        </div>
      </CardHeader>

      {/* BODY */}
      <CardContent className="flex-1 p-5 pt-3">
        <ScrollArea className="h-[420px] pr-2">
          <div className="space-y-4">

            {tasks.map((task) => {
              const config =
                statusConfig[task.status] || statusConfig['todo'];

              return (
                <div
                  key={`${task.id}-${task.submitted_at}`}
                  className="
                    group/item
                    bg-white/80
                    backdrop-blur-sm
                    border border-slate-200
                    rounded-2xl
                    p-4
                    transition-all duration-200
                    hover:shadow-md
                    hover:-translate-y-[2px]
                  "
                >
                  <div className="flex items-start justify-between gap-4">

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">
                          {task.description}
                        </h3>

                        {task.submission_type !== 'original' && (
                          <Badge
                            className="
                              text-[9px]
                              uppercase
                              tracking-wider
                              px-2 py-0.5
                              rounded-full
                              bg-blue-50
                              text-blue-600
                              border-blue-100
                              font-bold
                            "
                          >
                            {task.submission_type === 'correction'
                              ? 'Correction'
                              : 'Recreated'}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="truncate">
                          {task.clients?.name || 'No Client'}
                        </span>

                        <span>•</span>

                        {hasMounted && (
                          <span className="font-medium text-slate-400">
                            {format(parseISO(task.submitted_at), 'h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div
                      className={cn(
                        "flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full",
                        config.bg,
                        config.color
                      )}
                    >
                      {config.icon}
                      {config.label}
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
