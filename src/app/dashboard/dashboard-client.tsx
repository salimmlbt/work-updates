'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Clock, Folder, Calendar, Eye, Briefcase, Check, X as XIcon } from 'lucide-react';
import type { Profile } from '@/lib/types';
import { format, eachDayOfInterval, isBefore, startOfMonth, endOfMonth, startOfToday, parseISO, addDays, getDay } from 'date-fns';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const STATUS_COLORS: { [key: string]: string } = {
  'New': '#3b82f6',
  'In Progress': '#a855f7',
  'On Hold': '#f97316',
  'Done': '#22c55e',
};

interface DashboardClientProps {
  profile: Profile | null;
  initialTasks: any[];
  initialProjects: any[];
  initialAttendance: any[];
  initialHolidays: any[];
}

const cardClass =
  'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.45)] before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-white/[0.03] before:to-transparent before:pointer-events-none';

const CustomLegend = (props: any) => {
  const { payload } = props;
  return (
    <ul className="flex flex-col space-y-2 text-sm">
      {payload?.map((entry: any, index: number) => (
        <li key={`item-${index}`} className="flex items-center">
          <div
            className="w-2.5 h-2.5 rounded-full mr-2"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-400 mr-2">{entry.value}:</span>
          <span className="font-semibold text-white">{entry.payload.value} items</span>
        </li>
      ))}
    </ul>
  );
};

export default function DashboardClient({
  profile,
  initialTasks,
  initialProjects,
  initialAttendance,
  initialHolidays,
}: DashboardClientProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [projects, setProjects] = useState<any[]>(initialProjects);
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

    const projectsChannel = supabase
      .channel('dashboard-projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (payload.new.members?.includes(profile.id) && !payload.new.is_deleted) {
            setProjects(prev => [...prev, payload.new]);
          }
        } else if (payload.eventType === 'UPDATE') {
          const isMember = payload.new.members?.includes(profile.id);
          const isDeleted = payload.new.is_deleted;
          if (!isMember || isDeleted) {
            setProjects(prev => prev.filter(p => p.id !== payload.new.id));
          } else {
            setProjects(prev => {
              const exists = prev.some(p => p.id === payload.new.id);
              if (exists) return prev.map(p => p.id === payload.new.id ? payload.new : p);
              return [...prev, payload.new];
            });
          }
        } else if (payload.eventType === 'DELETE') {
          setProjects(prev => prev.filter(p => p.id !== payload.old.id));
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
      supabase.removeChannel(projectsChannel);
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

    const projectStatusCounts = projects.reduce((acc, p) => {
      const status = p.status || 'New';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const projectStatusData = Object.entries(projectStatusCounts).map(([name, value]) => ({ name, value }));

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

    return {
      pending,
      review,
      completed,
      deadlines,
      projectStatusData,
      attendanceChartData,
      totalWorkingDays,
      presentDaysSoFar,
      absentDays,
      totalMonthlyHours,
      averageDailyHours
    };
  }, [tasks, projects, attendance, holidays]);

  const handleTaskCardClick = (tab: string) => {
    if (isTasksLoading) return;
    setIsTasksLoading(true);
    router.push(`/tasks?tab=${tab}`);
  };

  return (
    <>
      {isTasksLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
            <p className="text-sm text-slate-200 font-medium">Loading your tasks…</p>
          </div>
        </div>
      )}

      <div className="min-h-screen p-4 md:p-8 lg:p-10 bg-[#0f0f0f] text-white">
        <header className="mb-10">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 border-2 border-white/10 shadow-2xl">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-sky-500/20 text-sky-300 text-xl font-bold">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
                Welcome back, {profile?.full_name?.split(' ')[0]}!
              </h1>
              <p className="text-slate-400 font-medium text-lg mt-1">Here is your live overview for today.</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button onClick={() => handleTaskCardClick('active')} className="text-left group">
                <Card className={cn(cardClass, 'bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(56,189,248,0.2)] transition-all duration-500 cursor-pointer h-full')}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-sky-400">Pending Tasks</CardTitle>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:scale-110 transition-transform"><AlertCircle className="h-4 w-4 text-sky-400" /></span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-black text-white tracking-tighter">{stats.pending}</div>
                    <p className="mt-2 text-xs text-slate-400 font-medium">Tasks waiting for your action.</p>
                  </CardContent>
                </Card>
              </button>

              <button onClick={() => handleTaskCardClick('under-review')} className="text-left group">
                <Card className={cn(cardClass, 'bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(168,85,247,0.2)] transition-all duration-500 cursor-pointer h-full')}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-violet-400">Review Tasks</CardTitle>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:scale-110 transition-transform"><Eye className="h-4 w-4 text-violet-400" /></span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-black text-white tracking-tighter">{stats.review}</div>
                    <p className="mt-2 text-xs text-slate-400 font-medium">Awaiting review or feedback.</p>
                  </CardContent>
                </Card>
              </button>

              <button onClick={() => handleTaskCardClick('completed')} className="text-left group">
                <Card className={cn(cardClass, 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(34,197,94,0.2)] transition-all duration-500 cursor-pointer h-full')}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-400">Completed</CardTitle>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:scale-110 transition-transform"><CheckCircle2 className="h-4 w-4 text-emerald-400" /></span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-black text-white tracking-tighter">{stats.completed}</div>
                    <p className="mt-2 text-xs text-slate-400 font-medium">Tasks successfully closed.</p>
                  </CardContent>
                </Card>
              </button>
            </div>

            <Card className={cn(cardClass, 'p-1')}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-white font-bold"><Clock className="h-5 w-5 text-sky-400" />Monthly Work Hours</CardTitle>
                  <CardDescription className="text-slate-400 font-medium">Live log of your monthly performance.</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Hours</p>
                  <p className="text-3xl font-black text-white tracking-tighter">{stats.totalMonthlyHours.toFixed(1)}h</p>
                  <p className="text-xs text-sky-400 font-bold">Avg: {stats.averageDailyHours.toFixed(1)}h/day</p>
                </div>
              </CardHeader>
              <CardContent className="pl-0 pr-2">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.attendanceChartData} barSize={14}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}h`} />
                    <Bar dataKey="hours" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={cn(cardClass)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-bold"><Folder className="h-5 w-5 text-purple-400" />Assigned Projects</CardTitle>
                <CardDescription className="text-slate-400 font-medium">Status distribution across your active portfolio.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1 w-full h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.projectStatusData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                          {stats.projectStatusData.map((entry, index) => <Cell key={index} fill={STATUS_COLORS[entry.name]} />)}
                        </Pie>
                        <Legend verticalAlign="middle" align="right" layout="vertical" content={<CustomLegend />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-8">
            <Card className={cn(cardClass)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-bold"><Calendar className="h-5 w-5 text-amber-500" />Upcoming Deadlines</CardTitle>
                <CardDescription className="text-slate-400 font-medium">Critical deliverables for this week.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.deadlines.length > 0 ? (
                  stats.deadlines.map((task) => (
                    <div key={task.id} className={cn('flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300', task.isOverdue ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10 hover:bg-white/10')}>
                      <div className={cn('h-12 w-11 rounded-xl flex flex-col items-center justify-center font-bold shadow-lg', task.isOverdue ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-300')}>
                        {hasMounted && (
                          <>
                            <span className="text-[10px] uppercase tracking-tighter opacity-80">{format(parseISO(task.deadline), 'MMM')}</span>
                            <span className="text-lg leading-none">{format(parseISO(task.deadline), 'dd')}</span>
                          </>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-bold leading-snug line-clamp-2', task.isOverdue ? 'text-red-200' : 'text-white')}>{task.description}</p>
                        <p className="text-xs text-slate-400 mt-1 font-medium truncate">{task.projects?.name}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center text-slate-500 text-sm font-medium italic">No active deadlines detected.</div>
                )}
              </CardContent>
            </Card>

            <Card className={cn(cardClass)}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-sm font-black uppercase tracking-widest text-slate-400">
                  <span>Monthly Summary</span>
                  {hasMounted && <Badge className="rounded-full bg-sky-500/20 text-sky-400 border-sky-500/20">{format(new Date(), 'MMMM')}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/5">
                  <Briefcase className="h-4 w-4 text-slate-500 mb-2" />
                  <span className="text-2xl font-black text-white">{stats.totalWorkingDays}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">Days</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/10">
                  <Check className="h-4 w-4 text-emerald-500 mb-2" />
                  <span className="text-2xl font-black text-emerald-500">{stats.presentDaysSoFar}</span>
                  <span className="text-[10px] font-bold text-emerald-600/80 uppercase mt-1">Present</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-2xl bg-rose-500/10 border border-rose-500/10">
                  <XIcon className="h-4 w-4 text-rose-500 mb-2" />
                  <span className="text-2xl font-black text-rose-500">{stats.absentDays}</span>
                  <span className="text-[10px] font-bold text-rose-600/80 uppercase mt-1">Absent</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
