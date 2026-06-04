'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials, cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Clock, Calendar, Eye, Briefcase, Rocket, ChevronDown, Plus } from 'lucide-react';
import type { Profile } from '@/lib/types';
import { format, eachDayOfInterval, isBefore, startOfMonth, endOfMonth, startOfToday, parseISO, addDays, getDay } from 'date-fns';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedBackground } from '@/components/dashboard/animated-background';
import { GlassCard } from '@/components/dashboard/glass-card';
import { Button } from '@/components/ui/button';

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
  themeColor,
  gradientFrom,
  delay
}: { 
  title: string; 
  value: number; 
  desc: string; 
  icon: any; 
  themeColor: string;
  gradientFrom: string;
  delay: number;
}) {
  return (
    <GlassCard 
      className="stat-card cursor-pointer h-full"
      gradientFrom={gradientFrom}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="p-6">
        <div className="flex flex-row items-center justify-between pb-2">
            <h3 className={cn("text-[10px] font-black uppercase tracking-[0.2em]", themeColor)}>
            {title}
            </h3>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-inner">
            <Icon className={cn("h-5 w-5", themeColor)} />
            </span>
        </div>
        <div className="mt-4">
            <div className="text-6xl font-black text-white tracking-tighter drop-shadow-md">
            {value}
            </div>
            <p className="mt-2 text-xs text-slate-400 font-medium uppercase tracking-wide opacity-60">{desc}</p>
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
  const [hasMounted, setHasMounted] = useState(false);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [attendance, setAttendance] = useState<any[]>(initialAttendance);
  const [holidays, setHolidays] = useState<any[]>(initialHolidays);

  useEffect(() => {
    setHasMounted(true);
  }, []);

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

    const pending = tasks.filter(isTaskPending).length;
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
    }, 800);
  };

  return (
    <>
      <AnimatedBackground />

      <AnimatePresence>
        {isTasksLoading && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[#030407]/60"
          >
            <div className="flex flex-col items-center gap-8">
              <div className="relative flex items-center justify-center">
                <motion.div 
                  className="absolute w-24 h-24 rounded-full border border-sky-400/20"
                  animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div 
                  className="absolute w-16 h-16 rounded-full border border-indigo-400/30"
                  animate={{ scale: [1, 1.3], opacity: [0.8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                />
                <motion.div 
                  className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 shadow-[0_0_40px_rgba(14,165,233,0.8)]"
                  animate={{ scale: [1, 0.8, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
                </motion.div>
              </div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-1"
              >
                <span className="text-[10px] text-slate-300 font-black tracking-[0.4em] uppercase">
                  Processing
                </span>
                <span className="flex gap-0.5 ml-1 text-xs text-slate-300 font-bold">
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}>.</motion.span>
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}>.</motion.span>
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}>.</motion.span>
                </span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative min-h-screen p-4 md:p-8 lg:p-10 text-white z-10 w-full">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
              <Avatar className="h-16 w-16 border-2 border-white/20 ring-4 ring-black/20 shadow-2xl transition-transform duration-700 group-hover:scale-105 group-hover:rotate-3">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-sky-500/20 text-sky-300 text-xl font-black">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-white mb-1">
                Good morning, {profile?.full_name?.split(' ')[0]}.
              </h1>
              <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.25em]">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
             <Badge variant="outline" className="bg-white/5 border-white/10 text-white font-black uppercase tracking-widest text-[9px] h-8 px-4 flex items-center gap-2 rounded-full">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                </span>
                Live Sync Active
            </Badge>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Stat Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Top 3 Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div onClick={() => handleTaskCardClick('active')} className="h-full">
                <TaskStatCard 
                  title="Pending Tasks"
                  value={stats.pending}
                  desc="Awaiting Action"
                  icon={AlertCircle}
                  themeColor="text-sky-400"
                  gradientFrom="rgba(14, 165, 233, 0.15)"
                  delay={100}
                />
              </div>

              <div onClick={() => handleTaskCardClick('under-review')} className="h-full">
                <TaskStatCard 
                  title="Review Tasks"
                  value={stats.review}
                  desc="Audit Required"
                  icon={Eye}
                  themeColor="text-indigo-400"
                  gradientFrom="rgba(99, 102, 241, 0.15)"
                  delay={200}
                />
              </div>

              <div onClick={() => handleTaskCardClick('completed')} className="h-full">
                <TaskStatCard 
                  title="Completed"
                  value={stats.completed}
                  desc="History Statement"
                  icon={CheckCircle2}
                  themeColor="text-emerald-400"
                  gradientFrom="rgba(16, 185, 129, 0.15)"
                  delay={300}
                />
              </div>
            </div>

            {/* Monthly Work Hours */}
            <GlassCard gradientFrom="rgba(14, 165, 233, 0.08)">
              <div className="p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
                    <div>
                    <h3 className="flex items-center gap-3 text-2xl text-white font-black tracking-tight uppercase">
                        <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 shadow-inner">
                        <Clock className="h-5 w-5 text-sky-400" />
                        </div>
                        Monthly Work Hours
                    </h3>
                    <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.2em] mt-2">Live log of organizational performance.</p>
                    </div>
                    <div className="text-left md:text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600 mb-1">Total Aggregate</p>
                    <p className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">
                        {stats.totalMonthlyHours.toFixed(1)}<span className="text-2xl text-zinc-700 font-bold ml-1">h</span>
                    </p>
                    <p className="text-xs text-sky-400 font-black uppercase tracking-widest mt-1">Avg: {stats.averageDailyHours.toFixed(1)}h/day</p>
                    </div>
                </div>
                
                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.attendanceChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.4} />
                        </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis 
                            dataKey="name" 
                            stroke="#475569" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            tickMargin={12} 
                            fontWeight="bold"
                        />
                        <YAxis 
                            stroke="#475569" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(v) => `${v}h`} 
                            fontWeight="bold"
                        />
                        <Bar 
                            dataKey="hours" 
                            fill="url(#barGrad)" 
                            radius={[6, 6, 0, 0]} 
                            barSize={16}
                            activeBar={{ fill: 'url(#barGradHover)' }}
                        />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
              </div>
            </GlassCard>

          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Upcoming Deadlines */}
            <GlassCard gradientFrom="rgba(245, 158, 11, 0.08)">
              <div className="p-8">
                <div className="mb-8">
                    <h3 className="flex items-center gap-3 text-2xl text-white font-black tracking-tight uppercase">
                    <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-inner">
                        <Calendar className="h-5 w-5 text-amber-400" />
                    </div>
                    Critical Path
                    </h3>
                    <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.2em] mt-2">Active deliverables for this window.</p>
                </div>
                
                <div className="space-y-4">
                    {stats.deadlines.length > 0 ? (
                    stats.deadlines.map((task) => (
                        <motion.div 
                        key={task.id} 
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                            'flex items-start gap-4 p-4 rounded-2xl transition-all cursor-pointer bg-white/[0.02] border border-white/5 hover:border-white/10 shadow-xl group/item', 
                            task.isOverdue ? 'border-rose-500/20 bg-rose-500/5' : ''
                        )}
                        >
                        <div className={cn(
                            'h-14 w-12 shrink-0 rounded-2xl flex flex-col items-center justify-center font-black shadow-2xl transition-transform group-hover/item:scale-110', 
                            task.isOverdue ? 'bg-rose-600 text-white shadow-rose-900/50' : 'bg-zinc-900 border border-white/5 text-zinc-300'
                        )}>
                            <span className="text-[9px] uppercase tracking-tighter opacity-80">
                            {format(parseISO(task.deadline), 'MMM')}
                            </span>
                            <span className="text-xl leading-none">
                            {format(parseISO(task.deadline), 'dd')}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                            <p className={cn(
                            'font-black leading-snug line-clamp-2 text-sm tracking-tight uppercase', 
                            task.isOverdue ? 'text-rose-200' : 'text-zinc-100'
                            )}>
                            {task.description}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-1 font-bold uppercase tracking-widest flex items-center gap-1.5 truncate">
                            <Briefcase className="h-3 w-3" />
                            {task.projects?.name}
                            </p>
                        </div>
                        </motion.div>
                    ))
                    ) : (
                    <div className="py-12 text-center text-zinc-600 text-[10px] font-black uppercase tracking-[0.4em] italic bg-white/[0.01] rounded-[2rem] border-2 border-dashed border-white/5">
                        Statement Clear
                    </div>
                    )}
                </div>
              </div>
            </GlassCard>

            {/* Monthly Summary */}
            <GlassCard gradientFrom="rgba(99, 102, 241, 0.12)">
              <div className="p-8">
                <div className="flex items-start justify-between mb-8">
                    <div>
                    <h3 className="text-2xl text-white font-black tracking-tight uppercase">
                        Attendance
                    </h3>
                    <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">{format(new Date(), 'MMMM yyyy')} Statement</p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
                    <Rocket className="h-5 w-5 text-indigo-400" />
                    </div>
                </div>
                
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 transition-colors cursor-default">
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-600"></div>
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Total Period</span>
                    </div>
                    <span className="text-xl font-black text-white">{stats.totalWorkingDays} <span className="text-[10px] text-zinc-600 uppercase ml-1">Days</span></span>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/20 transition-colors cursor-default">
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                        <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-[0.2em]">Present</span>
                    </div>
                    <span className="text-xl font-black text-emerald-400">{stats.presentDaysSoFar} <span className="text-[10px] uppercase ml-1">Days</span></span>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/[0.02] border border-rose-500/20 transition-colors cursor-default">
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]"></div>
                        <span className="text-[9px] font-black text-rose-500/80 uppercase tracking-[0.2em]">Absent</span>
                    </div>
                    <span className="text-xl font-black text-rose-400">{stats.absentDays} <span className="text-[10px] uppercase ml-1">Days</span></span>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-1">Efficiency Index</p>
                            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">{stats.efficiencyScore.toFixed(1)}%</p>
                        </div>
                    </div>
                    <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.efficiencyScore}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full shadow-[0_0_15px_rgba(14,165,233,0.5)]" 
                        />
                    </div>
                </div>
              </div>
            </GlassCard>

          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .chart-bar { transition: transform 0.3s ease; }
        .glow-cyan { background: radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%); }
        .glow-purple { background: radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%); }
        .glow-amber { background: radial-gradient(circle, rgba(245, 158, 11, 0.05) 0%, transparent 70%); }
      `}</style>
    </>
  );
}
