
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Clock, Folder, Calendar, Eye, Briefcase, Check, X as XIcon } from 'lucide-react';
import type { Profile, Task, Project } from '@/lib/types';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const STATUS_COLORS: { [key: string]: string } = {
  'New': '#3b82f6',       // blue-500
  'In Progress': '#a855f7', // purple-500
  'On Hold': '#f97316',     // orange-500
  'Done': '#22c55e',        // green-500
};

type UpcomingDeadline = Pick<Task, "id" | "description" | "deadline"> & {
  projects: Pick<Project, "name"> | null;
  isOverdue?: boolean;
};

interface DashboardClientProps {
  profile: Profile | null;
  pendingTasks: number;
  reviewTasks: number;
  completedTasks: number;
  attendanceChartData: { name: string; hours: number }[]; // now used as monthly data
  projectStatusData: { name: string; value: number }[];
  upcomingDeadlines: UpcomingDeadline[];
  totalWorkingDays: number;
  totalPresentDays: number;
  totalAbsentDays: number;
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
          <span className="text-muted-foreground mr-2">{entry.value}:</span>
          <span className="font-semibold">{entry.payload.value} items</span>
        </li>
      ))}
    </ul>
  );
};

export default function DashboardClient({
  profile,
  pendingTasks,
  reviewTasks,
  completedTasks,
  attendanceChartData,
  projectStatusData,
  upcomingDeadlines,
  totalWorkingDays,
  totalPresentDays,
  totalAbsentDays,
}: DashboardClientProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Treat this data as MONTHLY hours
  const totalMonthlyHours = attendanceChartData.reduce(
    (sum, item) => sum + (item.hours || 0),
    0
  );
  const averageDailyHours =
    attendanceChartData.length > 0
      ? totalMonthlyHours / attendanceChartData.length
      : 0;

  return (
    <div className="p-4 md:p-8 lg:p-10 min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-sky-50">
      <header className="mb-8">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary shadow-sm">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-sky-100 text-sky-700 font-semibold">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Welcome back, {profile?.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here is your personalized overview for today.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/tasks?tab=active">
              <Card className="shadow-[0_12px_35px_rgba(15,23,42,0.08)] rounded-2xl bg-gradient-to-br from-sky-50 via-sky-100 to-sky-200 border border-sky-100/70 hover:-translate-y-1 transition-transform duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-sky-700">
                    Pending Tasks
                  </CardTitle>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/70 border border-sky-100 shadow-sm">
                    <AlertCircle className="h-4 w-4 text-sky-600" />
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-sky-900">{pendingTasks}</div>
                  <p className="mt-1 text-xs text-sky-800/80">
                    Tasks waiting for your action.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/tasks?tab=under-review">
              <Card className="shadow-[0_12px_35px_rgba(76,29,149,0.08)] rounded-2xl bg-gradient-to-br from-violet-50 via-violet-100 to-violet-200 border border-violet-100/70 hover:-translate-y-1 transition-transform duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-violet-700">
                    Review Tasks
                  </CardTitle>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/70 border border-violet-100 shadow-sm">
                    <Eye className="h-4 w-4 text-violet-600" />
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-violet-900">{reviewTasks}</div>
                  <p className="mt-1 text-xs text-violet-800/80">
                    Awaiting review or feedback.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/tasks?tab=completed">
              <Card className="shadow-[0_12px_35px_rgba(22,163,74,0.08)] rounded-2xl bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200 border border-emerald-100/70 hover:-translate-y-1 transition-transform duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Completed
                  </CardTitle>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/70 border border-emerald-100 shadow-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-emerald-900">
                    {completedTasks}
                  </div>
                  <p className="mt-1 text-xs text-emerald-800/80">
                    Tasks successfully closed this period.
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Attendance Chart – MONTHLY */}
          <Card className="shadow-lg shadow-slate-200/70 rounded-2xl border border-slate-100 bg-white/90 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 border border-sky-100">
                    <Clock className="h-4 w-4 text-sky-600" />
                  </span>
                  Monthly Work Hours
                </CardTitle>
                <CardDescription className="mt-1">
                  Overview of your logged work hours for this month.
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Total Hours (Month)
                </p>
                <p className="text-2xl font-semibold text-slate-900">
                  {totalMonthlyHours.toFixed(1)}h
                </p>
                <p className="text-xs text-slate-500">
                  Avg / day: {averageDailyHours.toFixed(1)}h
                </p>
              </div>
            </CardHeader>
            <CardContent className="pl-0 pr-2 pb-4">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={attendanceChartData}
                  barSize={18}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}h`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                    wrapperStyle={{ outline: 'none' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0px 10px 30px rgba(15, 23, 42, 0.12)',
                      padding: '10px 12px',
                    }}
                    labelStyle={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#0f172a',
                      marginBottom: 4,
                    }}
                    itemStyle={{
                      fontSize: 12,
                      color: '#64748b',
                      marginTop: 4,
                    }}
                  />
                  <Bar
                    dataKey="hours"
                    fill="url(#hoursGradient)"
                    radius={[8, 8, 8, 8]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Assigned Projects */}
          <Card className="shadow-lg shadow-slate-200/70 rounded-2xl border border-slate-100 bg-white/90 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100">
                    <Folder className="h-4 w-4 text-indigo-600" />
                  </span>
                  Assigned Projects
                </CardTitle>
                <CardDescription className="mt-1">
                  Status distribution of projects you are part of.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="w-full lg:w-1/2">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 1.25;
                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                        return (
                          <text
                            x={x}
                            y={y}
                            fill="#0f172a"
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                            fontSize={11}
                            fontWeight={500}
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      content={<CustomLegend />}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Upcoming Deadlines */}
          <Card className="shadow-lg shadow-slate-200/70 rounded-2xl border border-slate-100 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 border border-amber-100">
                  <Calendar className="h-4 w-4 text-amber-600" />
                </span>
                Urgent & Upcoming Deadlines
              </CardTitle>
              <CardDescription>
                Overdue tasks and nearest due dates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingDeadlines.length > 0 ? (
                  upcomingDeadlines.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-start gap-4 rounded-xl border px-3 py-3 hover:bg-slate-50 transition-colors",
                        task.isOverdue ? "bg-red-50/60 border-red-100" : "bg-slate-50/60 border-slate-100"
                      )}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={cn(
                          "h-12 w-10 rounded-xl bg-white shadow-sm border flex flex-col items-center justify-center text-xs font-semibold",
                          task.isOverdue ? "border-red-100 text-red-700" : "border-slate-100 text-slate-700"
                        )}>
                          {hasMounted ? (
                            <>
                              <span className={cn("text-[0.65rem] uppercase tracking-wide", task.isOverdue ? "text-red-500" : "text-slate-500")}>
                                {format(new Date(task.deadline), 'MMM')}
                              </span>
                              <span className={cn("text-lg leading-tight", task.isOverdue ? "text-red-900" : "text-slate-900")}>
                                {format(new Date(task.deadline), 'dd')}
                              </span>
                            </>
                          ) : (
                            <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium leading-snug line-clamp-2", task.isOverdue ? "text-red-900" : "text-slate-900")}>
                          {task.description}
                        </p>
                        <p className={cn("text-sm mt-1", task.isOverdue ? "text-red-700/80" : "text-muted-foreground")}>
                          {task.projects?.name}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No upcoming deadlines.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Attendance Summary */}
          <Card className="shadow-lg shadow-slate-200/70 rounded-2xl border border-slate-100 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-slate-700">
                <span>Monthly Attendance</span>
                <span className="text-xs rounded-full bg-sky-50 px-2 py-0.5 border border-sky-100 text-sky-700">
                  {hasMounted ? format(new Date(), 'MMMM yyyy') : ''}
                </span>
              </CardTitle>
              <CardDescription>
                Snapshot of your presence this month.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center text-xs gap-1 text-slate-500 mb-1">
                  <Briefcase className="h-4 w-4" />
                  <span>Working Days</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 leading-tight">
                  {totalWorkingDays}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center text-xs gap-1 text-emerald-700 mb-1">
                  <Check className="h-4 w-4" />
                  <span>Present</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700 leading-tight">
                  {totalPresentDays}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center text-xs gap-1 text-rose-700 mb-1">
                  <XIcon className="h-4 w-4" />
                  <span>Absent</span>
                </div>
                <p className="text-2xl font-bold text-rose-700 leading-tight">
                  {totalAbsentDays}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
