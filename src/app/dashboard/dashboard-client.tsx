'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Clock, Folder, Calendar, Eye, Briefcase, Check, X as XIcon } from 'lucide-react';
import type { Profile, Task, Project, Attendance, OfficialHoliday } from '@/lib/types';
import { format, eachDayOfInterval, isBefore, startOfMonth, endOfMonth, isToday, startOfToday, parseISO, addDays, getDay } from 'date-fns';
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
          <span className="text-zinc-400 mr-2">{entry.value}:</span>
          <span className="font-semibold text-zinc-200">{entry.payload.value} items</span>
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

  // Local State for Real-time Data
  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [attendance, setAttendance] = useState<any[]>(initialAttendance);
  const [holidays, setHolidays] = useState<any[]>(initialHolidays);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Real-time Listeners
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

  // Derived Stats Calculations
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
  }, [tasks, projects, attendance, holidays, profile]);

  const handleTaskCardClick = (tab: string) => {
    if (isTasksLoading) return;
    setIsTasksLoading(true);
    router.push(`/tasks?tab=${tab}`);
  };

  return (
    <>
      {isTasksLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-sky-800 border-t-sky-400 animate-spin" />
            <p className="text-sm text-zinc-300 font-medium">Loading your tasks…</p>
          </div>
        </div>
      )}

      <div className="p-4 md:p-8 lg:p-10 min-h-screen bg-[#0f0f0f] text-zinc-100">
        <header className="mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-zinc-800 shadow-sm">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-sky-950 text-sky-400 font-semibold">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                Welcome back, {profile?.full_name?.split(' ')[0]}!
              </h1>
              <p className="text-zinc-400 mt-1">Here is your live overview for today.</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button onClick={() => handleTaskCardClick('active')} className="text-left">
                <Card className="shadow-2xl shadow-black/40 rounded-2xl bg-gradient-to-br from-sky-950/40 via-zinc-900 to-zinc-900 border border-sky-900/60 hover:-translate-y-1 transition-transform duration-300 cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-sky-400">Pending Tasks</CardTitle>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-950/80 border border-sky-800 shadow-sm"><AlertCircle className="h-4 w-4 text-sky-400" /></span>
                  </CardHeader>
                  <CardContent><div className="text-4xl font-bold text-sky-100">{stats.pending}</div><p className="mt-1 text-xs text-sky-300/70">Tasks waiting for your action.</p></CardContent>
                </Card>
              </button>

              <button onClick={() => handleTaskCardClick('under-review')} className="text-left">
                <Card className="shadow-2xl shadow-black/40 rounded-2xl bg-gradient-to-br from-purple-950/40 via-zinc-900 to-zinc-900 border border-purple-900/60 hover:-translate-y-1 transition-transform duration-300 cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-purple-400">Review Tasks</CardTitle>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-950/80 border border-purple-800 shadow-sm"><Eye className="h-4 w-4 text-purple-400" /></span>
                  </CardHeader>
                  <CardContent><div className="text-4xl font-bold text-purple-100">{stats.review}</div><p className="mt-1 text-xs text-purple-300/70">Awaiting review or feedback.</p></CardContent>
                </Card>
              </button>

              <button onClick={() => handleTaskCardClick('completed')} className="text-left">
                <Card className="shadow-2xl shadow-black/40 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-900/60 hover:-translate-y-1 transition-transform duration-300 cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Completed</CardTitle>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-950/80 border border-emerald-800 shadow-sm"><CheckCircle2 className="h-4 w-4 text-emerald-400" /></span>
                  </CardHeader>
                  <CardContent><div className="text-4xl font-bold text-emerald-100">{stats.completed}</div><p className="mt-1 text-xs text-emerald-300/70">Tasks successfully closed.</p></CardContent>
                </Card>
              </button>
            </div>

            <Card className="shadow-2xl shadow-black/50 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md text-zinc-100">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-zinc-100"><Clock className="h-4 w-4 text-sky-400" />Monthly Work Hours</CardTitle>
                  <CardDescription className="mt-1 text-zinc-400">Live log of your monthly work hours.</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <p className="text-xs text-zinc-400 uppercase tracking-wide">Total Hours</p>
                  <p className="text-2xl font-semibold text-zinc-100">{stats.totalMonthlyHours.toFixed(1)}h</p>
                  <p className="text-xs text-zinc-500">Avg / day: {stats.averageDailyHours.toFixed(1)}h</p>
                </div>
              </CardHeader>
              <CardContent className="pl-0 pr-2 pb-4">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.attendanceChartData} barSize={18} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}h`} />
                    <Bar dataKey="hours" fill="url(#hoursGradient)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-2xl shadow-black/50 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md text-zinc-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-100"><Folder className="h-4 w-4 text-purple-400" />Assigned Projects</CardTitle>
                <CardDescription className="mt-1 text-zinc-400">Status distribution of projects you are part of.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="w-full lg:w-1/2">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={stats.projectStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" nameKey="name" labelLine={false} label={({ midAngle, innerRadius, outerRadius, percent }) => {
                          const radius = innerRadius + (outerRadius - innerRadius) * 1.25;
                          const x = 50 + radius * Math.cos(-midAngle * (Math.PI / 180));
                          const y = 50 + radius * Math.sin(-midAngle * (Math.PI / 180));
                          return <text x={`${x}%`} y={`${y}%`} fill="#f4f4f5" textAnchor={x > 50 ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={500}>{`${(percent * 100).toFixed(0)}%`}</text>;
                        }}>
                        {stats.projectStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]} />)}
                      </Pie>
                      <Legend verticalAlign="middle" align="right" layout="vertical" content={<CustomLegend />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-2xl shadow-black/50 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md text-zinc-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-100"><Calendar className="h-4 w-4 text-amber-500" />Urgent & Upcoming Deadlines</CardTitle>
                <CardDescription className="text-zinc-400">Overdue tasks and nearest due dates.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.deadlines.length > 0 ? (
                    stats.deadlines.map((task) => (
                      <div key={task.id} className={cn('flex items-start gap-4 rounded-xl border px-3 py-3 transition-colors', task.isOverdue ? 'bg-red-950/20 border-red-900/40 hover:bg-red-950/30' : 'bg-zinc-800/30 border-zinc-800/60 hover:bg-zinc-800/50')}>
                        <div className="flex-shrink-0 mt-0.5">
                          <div className={cn('h-12 w-10 rounded-xl bg-zinc-950 shadow-sm border flex flex-col items-center justify-center text-xs font-semibold', task.isOverdue ? 'border-red-900/60 text-red-400' : 'border-zinc-700 text-zinc-300')}>
                            {hasMounted ? (<><span className={cn('text-[0.65rem] uppercase tracking-wide', task.isOverdue ? 'text-red-400' : 'text-zinc-500')}>{format(parseISO(task.deadline), 'MMM')}</span><span className={cn('text-lg leading-tight', task.isOverdue ? 'text-red-200' : 'text-zinc-100')}>{format(parseISO(task.deadline), 'dd')}</span></>) : <div className="h-full w-full bg-zinc-800 animate-pulse rounded-xl" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('font-medium leading-snug line-clamp-2', task.isOverdue ? 'text-red-200' : 'text-zinc-100')}>{task.description}</p>
                          <p className={cn('text-sm mt-1', task.isOverdue ? 'text-red-400/80' : 'text-zinc-400')}>{task.projects?.name}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-sm text-zinc-500 py-8">No upcoming deadlines.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-2xl shadow-black/50 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md text-zinc-100">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium text-zinc-300">
                  <span>Monthly Attendance</span>
                  <span className="text-xs rounded-full bg-sky-950/50 px-2 py-0.5 border border-sky-900/50 text-sky-400">{hasMounted ? format(new Date(), 'MMMM yyyy') : ''}</span>
                </CardTitle>
                <CardDescription className="text-zinc-400">Snapshot of your presence this month.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-zinc-800/40 border border-zinc-800 p-3 flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center text-xs gap-1 text-zinc-400 mb-1"><Briefcase className="h-4 w-4" /><span>Working Days</span></div>
                  <p className="text-2xl font-bold text-zinc-100 leading-tight">{stats.totalWorkingDays}</p>
                </div>
                <div className="rounded-xl bg-emerald-950/30 border border-emerald-900/50 p-3 flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center text-xs gap-1 text-emerald-400 mb-1"><Check className="h-4 w-4" /><span>Present</span></div>
                  <p className="text-2xl font-bold text-emerald-400 leading-tight">{stats.presentDaysSoFar}</p>
                </div>
                <div className="rounded-xl bg-rose-950/30 border border-rose-900/50 p-3 flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center text-xs gap-1 text-rose-400 mb-1"><XIcon className="h-4 w-4" /><span>Absent</span></div>
                  <p className="text-2xl font-bold text-rose-400 leading-tight">{stats.absentDays}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
