'use client'

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell
} from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials, cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Clock, Calendar, Eye, Briefcase, Rocket, Activity, Send, Sparkles, BrainCircuit } from 'lucide-react';
import type { Profile } from '@/lib/types';
import { format, eachDayOfInterval, isBefore, startOfMonth, endOfMonth, startOfToday, parseISO, addDays, getDay } from 'date-fns';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedBackground } from '@/components/dashboard/animated-background';
import { GlassCard } from '@/components/dashboard/glass-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { askAIHelp } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

interface DashboardClientProps {
  profile: Profile | null;
  initialTasks: any[];
  initialAttendance: any[];
  initialHolidays: any[];
}

function TaskStatCard({ 
  title, 
  value, 
  desc, 
  icon: Icon, 
  colorClass,
  gradient,
  delay,
  onClick
}: { 
  title: string; 
  value: number; 
  desc: string; 
  icon: any; 
  colorClass: string;
  gradient: string;
  delay: number;
  onClick: () => void;
}) {
  return (
    <GlassCard delay={delay} className="h-full group" onClick={onClick}>
      <div className="p-8 h-full flex flex-col justify-between">
        <div className="flex flex-row items-center justify-between pb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 group-hover:text-white/80 transition-colors">
            {title}
            </h3>
            <div className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/10 shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-white/[0.08]",
              colorClass
            )}>
            <Icon className="h-5 w-5" />
            </div>
        </div>
        <div className="mt-4">
            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-tighter drop-shadow-sm">
            {value}
            </div>
            <p className="mt-3 text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <span className={cn("h-1.5 w-1.5 rounded-full shadow-lg", gradient)} />
              {desc}
            </p>
        </div>
      </div>
    </GlassCard>
  );
}

export default function DashboardClient({
  profile,
  initialTasks,
  initialAttendance,
  initialHolidays,
}: DashboardClientProps) {
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [attendance, setAttendance] = useState<any[]>(initialAttendance);
  const [holidays, setHolidays] = useState<any[]>(initialHolidays);

  const [aiSelectedTaskId, setAiSelectedTaskId] = useState<string>("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const tasksChannel = supabase
      .channel('dashboard-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `assignee_id=eq.${profile.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (!payload.new.is_deleted) {
            setTasks(prev => [payload.new, ...prev]);
          }
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.is_deleted) {
            setTasks(prev => prev.filter(t => t.id !== payload.new.id));
          } else {
            setTasks(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
          }
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();

    const attendanceChannel = supabase
      .channel('dashboard-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `user_id=eq.${profile.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setAttendance(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setAttendance(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
        } else if (payload.eventType === 'DELETE') {
          setAttendance(prev => prev.filter(a => a.id !== payload.old.id));
        }
      })
      .subscribe();

    const holidaysChannel = supabase
      .channel('dashboard-holidays')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'official_holidays' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (!payload.new.is_deleted) setHolidays(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.is_deleted) setHolidays(prev => prev.filter(h => h.id !== payload.new.id));
          else setHolidays(prev => prev.map(h => h.id === payload.new.id ? payload.new : h));
        } else if (payload.eventType === 'DELETE') {
          setHolidays(prev => prev.filter(h => h.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(holidaysChannel);
    };
  }, [profile, supabase]);

  const stats = useMemo(() => {
    const isTaskCompleted = (t: any) => {
        return ['Posted', 'Scheduled'].includes(t.posting_status) || ['done', 'approved'].includes(t.status);
    };

    const isTaskReview = (t: any) => {
        if (isTaskCompleted(t)) return false;
        return ['review', 'under-review'].includes(t.status);
    };

    const isTaskPending = (t: any) => {
        if (isTaskCompleted(t) || isTaskReview(t)) return false;
        return t.posting_status === 'Planned' || ['todo', 'inprogress', 'corrections', 'recreate'].includes(t.status);
    };

    const pendingTasks = tasks.filter(isTaskPending);
    const pending = pendingTasks.length;
    const review = tasks.filter(isTaskReview).length;
    const completed = tasks.filter(isTaskCompleted).length;

    const todayStart = startOfToday();
    const threeDaysFromNow = addDays(todayStart, 3);
    
    const activeTasksList = tasks.filter(t => !isTaskCompleted(t));

    const overdue = activeTasksList
      .filter(t => t.deadline && isBefore(parseISO(t.deadline), todayStart))
      .map(t => ({ ...t, isOverdue: true }));

    const upcoming = activeTasksList
      .filter(t => t.deadline && !isBefore(parseISO(t.deadline), todayStart) && isBefore(parseISO(t.deadline), threeDaysFromNow))
      .map(t => ({ ...t, isOverdue: false }));

    const deadlines = [...overdue, ...upcoming]
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 5);

    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const allMonthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const attendanceChartData = allMonthDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const record = attendance.find(a => a.date === dayStr);
      return { name: format(day, 'd'), hours: record?.total_hours ?? 0 };
    });

    const leaveDates = new Set(holidays.filter(h => h.falaq_event_type === 'leave').map(h => h.date));
    const workingSundays = new Set(holidays.filter(h => h.falaq_event_type === 'working_sunday').map(h => h.date));
    
    const totalWorkingDays = allMonthDays.filter(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const isSun = getDay(day) === 0;
      if (leaveDates.has(dayStr)) return false;
      if (isSun && !workingSundays.has(dayStr)) return false;
      return true;
    }).length;

    const now = new Date();
    const presentDaysSoFar = attendance.filter(a => parseISO(a.date) <= now && !!a.check_in).length;
    const workingDaysSoFar = allMonthDays.filter(day => {
      if (day > now) return false;
      const dayStr = format(day, 'yyyy-MM-dd');
      const isSun = getDay(day) === 0;
      if (leaveDates.has(dayStr)) return false;
      if (isSun && !workingSundays.has(dayStr)) return false;
      return true;
    }).length;

    const absentDays = Math.max(0, workingDaysSoFar - presentDaysSoFar);
    const totalMonthlyHours = attendanceChartData.reduce((sum, item) => sum + (item.hours || 0), 0);
    const averageDailyHours = attendanceChartData.filter(d => d.hours > 0).length > 0 
      ? totalMonthlyHours / attendanceChartData.filter(d => d.hours > 0).length 
      : 0;

    const efficiencyScore = totalWorkingDays > 0 ? (presentDaysSoFar / totalWorkingDays) * 100 : 0;

    return {
      pending,
      pendingTasks,
      review,
      completed,
      deadlines,
      attendanceChartData,
      totalWorkingDays,
      presentDaysSoFar,
      absentDays,
      totalMonthlyHours,
      averageDailyHours,
      efficiencyScore
    };
  }, [tasks, attendance, holidays]);

  const handleTaskCardClick = (tab: string) => {
    setIsTasksLoading(true);
    setTimeout(() => {
        router.push(`/tasks?tab=${tab}`);
    }, 1000);
  };

  const handleAskAI = async () => {
    if (!aiSelectedTaskId || !aiQuestion.trim()) return;
    
    setIsAiLoading(true);
    setAiAnswer("");
    
    const selectedTask = tasks.find(t => t.id === aiSelectedTaskId);
    const taskDescription = selectedTask?.description || "";
    const projectTitle = selectedTask?.projects?.name || "";
    const clientName = selectedTask?.clients?.name || "";

    const result = await askAIHelp(taskDescription, projectTitle, clientName, aiQuestion.trim());
    
    setIsAiLoading(false);
    if (result.error) {
        toast({ title: "AI Assistant Error", description: result.error, variant: "destructive" });
    } else if (result.data) {
        setAiAnswer(result.data);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-white/10 bg-black/60 p-3 shadow-xl backdrop-blur-md">
          <p className="text-[10px] font-bold uppercase text-white/60 mb-1">Day {label}</p>
          <p className="text-lg font-black text-white">{payload[0].value} <span className="text-xs text-white/50">hrs</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative min-h-screen font-sans selection:bg-sky-500/30">
      <AnimatedBackground />

      <AnimatePresence>
        {isTasksLoading && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(16px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[#05050a]/70"
          >
            <div className="flex flex-col items-center gap-8">
              <div className="relative flex items-center justify-center">
                <motion.div 
                  className="absolute w-24 h-24 rounded-full border border-sky-400/20"
                  animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div 
                  className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 shadow-[0_0_40px_rgba(14,165,233,0.8)] flex items-center justify-center"
                  animate={{ scale: [1, 0.8, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                    <Activity className="text-white h-5 w-5 animate-pulse" />
                </motion.div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] text-slate-300 font-bold tracking-[0.4em] uppercase">Syncing Workspace</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full p-4 md:p-8 lg:p-10 text-white">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 blur-md opacity-40 group-hover:opacity-100 transition-opacity duration-700" />
              <Avatar className="h-16 w-16 border-2 border-white/20 shadow-2xl transition-transform duration-700 group-hover:scale-105 group-hover:rotate-3">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-sky-500/20 text-sky-300 text-xl font-bold">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white mb-0.5">
                Good morning, {profile?.full_name?.split(' ')[0]}.
              </h1>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.25em]">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md items-center gap-3 shadow-lg">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_10px_#10b981]" />
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Atmospheric Link Active</span>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <TaskStatCard 
                  title="Pending Tasks"
                  value={stats.pending}
                  desc="Awaiting Action"
                  icon={AlertCircle}
                  colorClass="text-sky-400"
                  gradient="bg-sky-400 shadow-[0_0_8px_#38bdf8]"
                  delay={100}
                  onClick={() => handleTaskCardClick('active')}
                />

                <TaskStatCard 
                  title="Review Tasks"
                  value={stats.review}
                  desc="Audit Required"
                  icon={Eye}
                  colorClass="text-indigo-400"
                  gradient="bg-indigo-400 shadow-[0_0_8px_#818cf8]"
                  delay={200}
                  onClick={() => handleTaskCardClick('under-review')}
                />

                <TaskStatCard 
                  title="Completed"
                  value={stats.completed}
                  desc="History Statement"
                  icon={CheckCircle2}
                  colorClass="text-emerald-400"
                  gradient="bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  delay={300}
                  onClick={() => handleTaskCardClick('completed')}
                />
            </div>

            <GlassCard delay={400} className="p-8">
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-6">
                    <div>
                    <h3 className="flex items-center gap-3 text-2xl text-white font-black tracking-tight uppercase">
                        <div className="p-2.5 rounded-2xl bg-white/[0.05] border border-white/10 shadow-inner">
                        <Clock className="h-5 w-5 text-sky-400" />
                        </div>
                        Monthly Yield
                    </h3>
                    <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-3">Log of organizational performance.</p>
                    </div>
                    <div className="text-left md:text-right">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600 mb-1">Total Aggregate</p>
                    <p className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">
                        {stats.totalMonthlyHours.toFixed(1)}<span className="text-2xl text-zinc-700 font-bold ml-1">h</span>
                    </p>
                    <p className="text-[10px] text-sky-400 font-black uppercase tracking-widest mt-2">Avg: {stats.averageDailyHours.toFixed(1)}h/day</p>
                    </div>
                </div>
                
                <div className="h-[280px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.attendanceChartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                        <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2} />
                        </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="name" stroke="#334155" fontSize={10} tickLine={false} axisLine={false} tickMargin={12} fontWeight="bold" />
                        <YAxis stroke="#334155" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}h`} fontWeight="bold" />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                        <Bar dataKey="hours" fill="url(#barGrad)" radius={[4, 4, 0, 0]} barSize={12}>
                           {stats.attendanceChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fillOpacity={entry.hours > 0 ? 1 : 0.2} />
                           ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </GlassCard>

            <GlassCard delay={450} className="p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <BrainCircuit className="h-32 w-32 text-indigo-400" />
                </div>
                <div className="mb-8">
                    <h3 className="flex items-center gap-3 text-2xl text-white font-black tracking-tight uppercase">
                    <div className="p-2.5 rounded-2xl bg-white/[0.05] border border-white/10 shadow-inner">
                        <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
                    </div>
                    AI Oracle Help
                    </h3>
                    <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-3">Synthesize actionable insights from your active tasks.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Context Target</Label>
                            <Select onValueChange={setAiSelectedTaskId} value={aiSelectedTaskId}>
                                <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-bold text-white shadow-inner">
                                    <SelectValue placeholder="Select active task" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                                    {stats.pendingTasks.map(t => (
                                        <SelectItem key={t.id} value={t.id} className="text-xs truncate">{t.description}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Ask Question</Label>
                            <div className="relative group">
                                <Input 
                                    placeholder="How should I start?"
                                    value={aiQuestion}
                                    onChange={(e) => setAiQuestion(e.target.value)}
                                    className="h-12 bg-white/5 border-white/10 rounded-xl pr-12 focus-visible:ring-indigo-500/50"
                                />
                                <Button 
                                    size="icon"
                                    onClick={handleAskAI}
                                    disabled={isAiLoading || !aiSelectedTaskId || !aiQuestion.trim()}
                                    className="absolute right-1 top-1 h-10 w-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-95 shadow-lg"
                                >
                                    {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <div className="h-full min-h-[160px] bg-white/[0.01] border border-white/5 rounded-2xl p-6 relative group">
                            {isAiLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-2xl">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="relative flex items-center justify-center">
                                            <motion.div 
                                                className="absolute h-10 w-10 bg-indigo-500/20 rounded-full"
                                                animate={{ scale: [1, 2], opacity: [1, 0] }}
                                                transition={{ duration: 1, repeat: Infinity }}
                                            />
                                            <Sparkles className="h-6 w-6 text-indigo-400" />
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-400/80">Synthesizing...</span>
                                    </div>
                                </div>
                            ) : aiAnswer ? (
                                <div className="space-y-4 animate-in fade-in duration-700">
                                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[9px] font-black uppercase tracking-widest px-2 h-5">Oracle Response</Badge>
                                    <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                                        {aiAnswer}
                                    </p>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                                    <BrainCircuit className="h-10 w-10 text-zinc-600 mb-3" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Awaiting Interaction</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-1 space-y-8">
            <GlassCard delay={500} className="p-8">
                <div className="mb-10">
                    <h3 className="flex items-center gap-3 text-xl text-white font-black tracking-tight uppercase">
                    <div className="p-2.5 rounded-2xl bg-white/[0.05] border border-white/10 shadow-inner">
                        <Calendar className="h-5 w-5 text-amber-400" />
                    </div>
                    Critical Path
                    </h3>
                    <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-3">Active deliverables for this window.</p>
                </div>
                
                <div className="space-y-3">
                    {stats.deadlines.length > 0 ? (
                    stats.deadlines.map((task) => (
                        <motion.div 
                        key={task.id} 
                        whileHover={{ scale: 1.02, x: 5 }}
                        className={cn(
                            'flex items-start gap-4 p-4 rounded-2xl transition-all cursor-pointer bg-white/[0.02] border border-white/5 hover:border-white/15 group shadow-lg', 
                            task.isOverdue ? 'border-rose-500/20 bg-rose-500/5' : ''
                        )}
                        >
                        <div className={cn(
                            'h-14 w-12 shrink-0 rounded-xl flex flex-col items-center justify-center font-black shadow-inner transition-transform group-hover:scale-105', 
                            task.isOverdue ? 'bg-rose-600 text-white' : 'bg-zinc-950 text-zinc-500 border border-white/5'
                        )}>
                            <span className="text-[9px] uppercase tracking-tighter opacity-80">{format(parseISO(task.deadline), 'MMM')}</span>
                            <span className="text-xl leading-none mt-0.5">{format(parseISO(task.deadline), 'dd')}</span>
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                            <p className={cn('font-bold leading-snug line-clamp-2 text-sm tracking-tight', task.isOverdue ? 'text-rose-200' : 'text-zinc-100')}>
                            {task.description}
                            </p>
                            <p className="text-[9px] text-zinc-500 mt-2 font-black uppercase tracking-widest flex items-center gap-1.5 truncate">
                            <Briefcase className="h-3 w-3" />
                            {task.projects?.name}
                            </p>
                        </div>
                        </motion.div>
                    ))
                    ) : (
                    <div className="py-16 text-center text-zinc-700 text-[10px] font-black uppercase tracking-[0.4em] italic bg-white/[0.01] rounded-3xl border border-dashed border-white/10">
                        Statement Clear
                    </div>
                    )}
                </div>
            </GlassCard>

            <GlassCard delay={600} className="p-8">
                <div className="flex items-start justify-between mb-8">
                    <div>
                    <h3 className="text-xl text-white font-black tracking-tight uppercase">Attendance</h3>
                    <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">{format(new Date(), 'MMMM yyyy')} Statement</p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-white/[0.05] border border-white/10 shadow-inner">
                    <Rocket className="h-5 w-5 text-indigo-400" />
                    </div>
                </div>
                
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">Total Period</span>
                    <span className="text-lg font-black text-white">{stats.totalWorkingDays} <span className="text-[10px] text-zinc-700 uppercase ml-1">Days</span></span>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/20">
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em]">Present</span>
                    <span className="text-lg font-black text-emerald-300">{stats.presentDaysSoFar} <span className="text-[9px] uppercase ml-1 opacity-60">Days</span></span>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/[0.05] border border-rose-500/20">
                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-[0.3em]">Absent</span>
                    <span className="text-lg font-black text-rose-300">{stats.absentDays} <span className="text-[9px] uppercase ml-1 opacity-60">Days</span></span>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                    <div className="flex justify-between items-end mb-3">
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Efficiency Index</p>
                        <p className="text-3xl font-black text-sky-400 drop-shadow-[0_0_10px_rgba(14,165,233,0.3)]">{stats.efficiencyScore.toFixed(1)}%</p>
                    </div>
                    <div className="h-2.5 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${stats.efficiencyScore}%` }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }} className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full shadow-[0_0_15px_rgba(14,165,233,0.6)]" />
                    </div>
                </div>
            </GlassCard>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }
      `}</style>
    </div>
  );
}
