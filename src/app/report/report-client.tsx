
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
import type { Profile, TaskWithDetails } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/lib/supabase/client';

interface Submission extends TaskWithDetails {
    submission_type: string;
    final_status: string;
    submitted_at: string;
    taskId: string;
}

interface ReportClientProps {
  initialProfiles: Profile[];
  initialSubmissions: Submission[];
  selectedDate: string;
}

const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  'review': { icon: <Eye className="h-4 w-4" />, label: 'Review', color: 'text-purple-400', bg: 'bg-purple-900/40' },
  'under-review': { icon: <Eye className="h-4 w-4" />, label: 'Review', color: 'text-purple-400', bg: 'bg-purple-900/40' },
  'corrections': { icon: <MessageSquare className="h-4 w-4" />, label: 'Correction', color: 'text-orange-400', bg: 'bg-orange-900/40' },
  'recreate': { icon: <Repeat className="h-4 w-4" />, label: 'Recreate', color: 'text-red-400', bg: 'bg-red-900/40' },
  'approved': { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-900/40' },
  'done': { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-900/40' },
  'completed': { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-900/40' },
  'scheduled': { icon: <CalendarIcon className="h-4 w-4" />, label: 'Scheduled', color: 'text-sky-400', bg: 'bg-sky-900/40' },
  'posted': { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Posted', color: 'text-emerald-400', bg: 'bg-emerald-900/40' },
  'todo': { icon: <Clock className="h-4 w-4" />, label: 'Active', color: 'text-zinc-400', bg: 'bg-zinc-800/40' },
  'inprogress': { icon: <Clock className="h-4 w-4" />, label: 'Active', color: 'text-sky-400', bg: 'bg-sky-900/40' },
};

const UserReportCard = ({ user, submissions }: { user: Profile; submissions: Submission[] }) => {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  const total = submissions.length;
  const approvedCount = submissions.filter(
    s => ['approved', 'done', 'posted'].includes(s.final_status.toLowerCase())
  ).length;

  const progress = total > 0 ? Math.round((approvedCount / total) * 100) : 0;

  return (
    <Card className="
      group relative flex flex-col h-fit
      rounded-3xl
      border border-white/10
      bg-white/[0.03] backdrop-blur-xl
      shadow-2xl hover:shadow-[0_0_40px_rgba(56,189,248,0.1)]
      transition-all duration-500
      overflow-hidden
    ">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-60" />

      <CardHeader className="p-6 pb-4 bg-white/[0.02]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 ring-4 ring-white/5 shadow-2xl">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="bg-zinc-800 text-zinc-400 font-black">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-base font-black tracking-tight text-white uppercase">
                {user.full_name}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">
                  {total} Submission{total !== 1 ? 's' : ''}
                </span>
                <Badge className="rounded-full bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-3 py-0.5 font-black uppercase tracking-tighter">
                  {progress}% Done
                </Badge>
              </div>
            </div>
          </div>
          <div className="w-32">
            <Progress value={progress} className="h-1.5 bg-white/5 [&>div]:bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className={cn("px-6 pb-6 pt-2", submissions.length > 6 ? "h-[480px]" : "h-auto")}>
          <div className="space-y-4 py-2">
            {submissions.map((sub) => {
              const statusKey = sub.final_status.toLowerCase();
              const config = statusConfig[statusKey] || statusConfig['review'];
              return (
                <div key={sub.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 transition-all hover:bg-white/[0.05] hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-zinc-100 truncate tracking-tight">{sub.description}</h3>
                        {sub.submission_type === 'correction' && (
                          <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border-orange-500/20 font-black">
                            Correction
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-tight">
                        <span className="truncate text-zinc-400">{sub.clients?.name || 'No Client'}</span>
                        <span className="text-zinc-700">•</span>
                        {hasMounted && <span className="text-zinc-500">{format(parseISO(sub.submitted_at), 'h:mm a')}</span>}
                      </div>
                    </div>
                    <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/5", config.bg, config.color)}>
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

export default function ReportClient({ initialProfiles, initialSubmissions, selectedDate }: ReportClientProps) {
  const router = useRouter();
  const [date, setDate] = useState(selectedDate);
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const supabase = createClient();

  useEffect(() => {
    setSubmissions(initialSubmissions);
  }, [initialSubmissions]);

  // Real-time update listener for rebuilt architecture
  useEffect(() => {
    const channel = supabase
      .channel('report-system-v6')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'report_entries' },
        async () => {
          // Refetch to get joined data safely
          const { data, error } = await supabase
            .from('report_entries')
            .select(`
                *,
                tasks (
                  *, 
                  projects (*), 
                  clients (*)
                ),
                profiles (*)
            `)
            .gte('submitted_at', `${date}T00:00:00+05:30`)
            .lte('submitted_at', `${date}T23:59:59+05:30`)
            .order('submitted_at', { ascending: false });

          if (!error && data) {
            setSubmissions(data
              .filter((entry: any) => entry.tasks)
              .map((entry: any) => {
                const task = entry.tasks;
                return {
                  ...task,
                  id: entry.id,
                  taskId: entry.task_id,
                  assignee_id: entry.user_id,
                  profiles: entry.profiles,
                  clients: task.clients || task.projects?.clients || null,
                  submission_type: entry.is_correction_cycle ? 'correction' : 'original',
                  final_status: entry.final_status,
                  submitted_at: entry.submitted_at
                };
              }));
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
    submissions.forEach(s => {
      if (s.profiles) profilesMap.set(s.profiles.id, s.profiles);
    });
    return Array.from(profilesMap.values()).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [submissions]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    router.push(`/report?date=${newDate}`);
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      handleDateChange(format(selectedDate, 'yyyy-MM-dd'));
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-10 min-h-screen bg-[#0f0f0f] text-zinc-100">
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tighter text-white">Work Report</h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1.5 h-6 font-bold uppercase tracking-widest text-[10px]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live
            </Badge>
          </div>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px]">{format(parseISO(date), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => handleDateChange(format(new Date(), 'yyyy-MM-dd'))} disabled={isToday(parseISO(date))} className="rounded-full h-10 px-6 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300">
            Today
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-bold rounded-full h-10 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-200">
                <CalendarIcon className="mr-2 h-4 w-4 text-sky-400" />
                {format(parseISO(date), "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-3xl bg-zinc-900 border-zinc-800 shadow-2xl" align="end">
              <Calendar mode="single" selected={parseISO(date)} onSelect={handleCalendarSelect} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {activeProfiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 text-center bg-white/[0.01] rounded-[2.5rem] border-2 border-dashed border-white/5">
            <div className="bg-white/5 p-8 rounded-[2rem] mb-6 shadow-2xl">
                <FileX className="h-16 w-16 text-zinc-700" />
            </div>
            <h3 className="text-2xl font-black text-zinc-500 tracking-tight">No work submitted yet</h3>
            <p className="text-zinc-600 max-w-sm mt-2 font-medium">There are no valid work submissions recorded for this date in the system.</p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 xl:columns-3 gap-10">
            {activeProfiles.map((profile) => (
            <div key={profile.id} className="break-inside-avoid mb-10">
              <UserReportCard user={profile} submissions={submissions.filter(s => s.assignee_id === profile.id)} />
            </div>
            ))}
        </div>
      )}
    </div>
  );
}
