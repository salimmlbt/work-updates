
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Eye,
  MessageSquare,
  Repeat,
  FileX,
  ChevronDown,
  Loader2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { getInitials, cn } from '@/lib/utils';
import { format, parseISO, isToday } from 'date-fns';
import type { Profile, TaskWithDetails, Task, SubmissionHistoryEntry } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/lib/supabase/client';

interface SubmissionTask extends TaskWithDetails {
    submission_type: string;
    submitted_at: string;
}

interface ReportClientProps {
  initialProfiles: Profile[];
  initialTasks: SubmissionTask[];
  selectedDate: string;
}

const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  'review': { icon: <Eye className="h-4 w-4" />, label: 'Review', color: 'text-purple-600', bg: 'bg-purple-100' },
  'under-review': { icon: <Eye className="h-4 w-4" />, label: 'Review', color: 'text-purple-600', bg: 'bg-purple-100' },
  'corrections': { icon: <MessageSquare className="h-4 w-4" />, label: 'Corrections', color: 'text-orange-600', bg: 'bg-orange-100' },
  'recreate': { icon: <Repeat className="h-4 w-4" />, label: 'Recreate', color: 'text-red-600', bg: 'bg-red-100' },
  'approved': { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Approved', color: 'text-green-600', bg: 'bg-green-100' },
  'done': { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Completed', color: 'text-green-600', bg: 'bg-green-100' },
  'completed': { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Completed', color: 'text-green-600', bg: 'bg-green-100' },
  'todo': { icon: <MessageSquare className="h-4 w-4" />, label: 'Correction', color: 'text-orange-600', bg: 'bg-orange-100' },
  'inprogress': { icon: <Clock className="h-4 w-4" />, label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-100' },
};

const postingConfig: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  'scheduled': { icon: <CalendarIcon className="h-4 w-4" />, label: 'Scheduled', color: 'text-blue-600', bg: 'bg-blue-100' },
  'posted': { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Posted', color: 'text-green-600', bg: 'bg-green-100' },
};

const UserReportCard = ({ user, tasks }: { user: Profile; tasks: SubmissionTask[] }) => {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  const totalTasks = tasks.length;
  const approvedTasks = tasks.filter(
    t => t.status === 'approved' || t.status === 'done' || t.submission_type === 'scheduled' || t.submission_type === 'posted'
  ).length;

  const approvalRate =
    totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;

  return (
    <Card className="
      group relative flex flex-col h-fit
      rounded-3xl
      border border-slate-200/60
      bg-gradient-to-br from-white to-slate-50
      shadow-sm hover:shadow-xl
      transition-all duration-300
      overflow-hidden
    ">
      
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-80" />

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
                  {approvalRate}% Completed
                </Badge>
              </div>
            </div>
          </div>

          <div className="w-32">
            <Progress
              value={approvalRate}
              className="h-2 bg-slate-200 [&>div]:bg-gradient-to-r [&>div]:from-emerald-400 [&>div]:to-emerald-600"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className={cn(
          "px-6 pb-6 pt-2",
          tasks.length > 6 ? "h-[480px]" : "h-auto"
        )}>
          <div className="space-y-4 py-2">

            {tasks.map((task) => {
              const isPostingEvent = task.submission_type === 'scheduled' || task.submission_type === 'posted';
              
              // Outcome-based mapping for historical records
              let finalStatus = task.status;
              if (task.status === 'todo' || task.status === 'inprogress') {
                  if (task.revisions?.recreations && task.revisions.recreations > 0) finalStatus = 'recreate' as any;
                  else if (task.revisions?.corrections && task.revisions.corrections > 0) finalStatus = 'corrections' as any;
              }

              const config = isPostingEvent 
                ? postingConfig[task.submission_type]
                : (statusConfig[finalStatus] || statusConfig[task.submission_type] || statusConfig['review']);

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

                        {task.submission_type !== 'original' && !isPostingEvent && (
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
                              : task.submission_type === 'recreate' ? 'Recreated' : 'Work'}
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
  const [allTasks, setAllTasks] = useState<SubmissionTask[]>(initialTasks);
  const supabase = createClient();

  useEffect(() => {
    setAllTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    const channel = supabase
      .channel('report-realtime-v2')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            setAllTasks(prev => prev.filter(t => t.id !== payload.old.id));
            return;
          }

          const { data: updatedTask, error } = await supabase
            .from('tasks')
            .select('*, profiles(*), projects(*), clients(*)')
            .eq('id', payload.new.id)
            .single();

          if (error || !updatedTask) return;

          const task = updatedTask as any;

          let history: SubmissionHistoryEntry[] = [];
          try {
              const rawHistory = task.submission_history;
              if (Array.isArray(rawHistory)) {
                  history = rawHistory;
              } else if (typeof rawHistory === 'string' && rawHistory.trim().startsWith('[')) {
                  history = JSON.parse(rawHistory);
              }
          } catch (e) {}

          const entriesForDate = history.filter(entry => entry.date && entry.date.startsWith(date));
          const hasEntriesOnDate = entriesForDate.length > 0;

          if (hasEntriesOnDate) {
            const latestGlobalEntry = history[history.length - 1];
            const latestEntryOnDate = entriesForDate[entriesForDate.length - 1];
            const isLatestGlobal = latestGlobalEntry.date === latestEntryOnDate.date;
            const isCurrentlyActive = (task.status === 'todo' || task.status === 'inprogress');
            const isPosting = task.posting_status === 'Scheduled' || task.posting_status === 'Posted';

            // Filter out accidental submissions
            const isLegitimateSubmitToday = latestEntryOnDate.type === 'correction' || latestEntryOnDate.type === 'recreate';
            const hasMultipleSubmitsToday = entriesForDate.length > 1;
            const isAccidental = isCurrentlyActive && isLatestGlobal && !isPosting && !isLegitimateSubmitToday && !hasMultipleSubmitsToday;

            if (!isAccidental) {
              const submissionTask: SubmissionTask = {
                ...task,
                submission_type: latestEntryOnDate.type || 'original',
                submitted_at: latestEntryOnDate.date || task.status_updated_at || task.created_at
              };
              
              setAllTasks(prev => {
                const filtered = prev.filter(t => t.id !== submissionTask.id);
                return [submissionTask, ...filtered];
              });
            } else {
              setAllTasks(prev => prev.filter(t => t.id !== task.id));
            }
          } else {
            setAllTasks(prev => prev.filter(t => t.id !== task.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, date]);

  const activeProfiles = useMemo(() => {
    const profilesMap = new Map<string, Profile>();
    allTasks.forEach(task => {
      if (task.profiles) {
        profilesMap.set(task.profiles.id, task.profiles);
      }
    });
    return Array.from(profilesMap.values()).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [allTasks]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    router.push(`/report?date=${newDate}`);
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const formatted = format(selectedDate, 'yyyy-MM-dd');
      handleDateChange(formatted);
    }
  };

  const formattedTitleDate = format(parseISO(date), 'EEEE, dd MMMM yyyy');

  return (
    <div className="p-4 md:p-8 lg:p-10 min-h-screen bg-[#f8fafc]">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Daily Work Report</h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 flex items-center gap-1.5 h-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live
            </Badge>
          </div>
          <p className="text-slate-500 font-medium">{formattedTitleDate}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => handleDateChange(format(new Date(), 'yyyy-MM-dd'))} 
            disabled={isToday(parseISO(date))}
            className="rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50 h-10"
          >
            Today
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-medium rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50 h-10",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                {date ? format(parseISO(date), "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl shadow-xl" align="end">
              <Calendar
                mode="single"
                selected={parseISO(date)}
                onSelect={handleCalendarSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {activeProfiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="bg-slate-50 p-6 rounded-full mb-6">
                <FileX className="h-12 w-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No work submitted yet</h3>
            <p className="text-slate-500 max-w-sm mt-2 font-medium">
                There are no review tasks or posting updates found for {format(parseISO(date), 'MMMM d, yyyy')}.
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
        <div className="columns-1 md:columns-2 xl:columns-3 gap-8">
            {activeProfiles.map((profile) => (
            <div key={profile.id} className="break-inside-avoid mb-8">
              <UserReportCard 
                  user={profile} 
                  tasks={allTasks.filter(t => t.assignee_id === profile.id)}
              />
            </div>
            ))}
        </div>
      )}
    </div>
  );
}
