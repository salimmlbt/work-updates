
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, Folder, Zap, Calendar } from 'lucide-react';
import type { Profile, Task, Project } from '@/lib/types';

const STATUS_COLORS: { [key: string]: string } = {
  'New': '#3b82f6', // blue-500
  'In Progress': '#a855f7', // purple-500
  'On Hold': '#f97316', // orange-500
  'Done': '#22c55e', // green-500
};

type UpcomingDeadline = Pick<Task, "id" | "description" | "deadline"> & {
    projects: Pick<Project, "name"> | null;
};

interface DashboardClientProps {
    profile: Profile | null;
    pendingTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    attendanceChartData: { name: string; hours: number }[];
    projectStatusData: { name: string; value: number }[];
    upcomingDeadlines: UpcomingDeadline[];
}

export default function DashboardClient({
    profile,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    attendanceChartData,
    projectStatusData,
    upcomingDeadlines,
}: DashboardClientProps) {
  return (
    <div className="p-4 md:p-8 lg:p-10 bg-muted/20 min-h-full">
      <header className="mb-8">
        <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
            </Avatar>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Welcome back, {profile?.full_name?.split(' ')[0]}!</h1>
                <p className="text-muted-foreground">Here's your personal dashboard for today.</p>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-lg rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                        <AlertCircle className="h-5 w-5 opacity-80" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{pendingTasks}</div>
                    </CardContent>
                </Card>
                 <Card className="shadow-lg rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                        <Zap className="h-5 w-5 opacity-80" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{inProgressTasks}</div>
                    </CardContent>
                </Card>
                 <Card className="shadow-lg rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <CheckCircle2 className="h-5 w-5 opacity-80" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{completedTasks}</div>
                    </CardContent>
                </Card>
            </div>
          
            {/* Attendance Chart */}
            <Card className="shadow-lg rounded-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Weekly Hours
                    </CardTitle>
                    <CardDescription>Your tracked work hours for the current week.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={attendanceChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    borderRadius: '0.5rem',
                                    border: '1px solid hsl(var(--border))',
                                }}
                                cursor={{ fill: 'hsla(var(--primary), 0.1)' }}
                            />
                            <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

             {/* Assigned Projects */}
            <Card className="shadow-lg rounded-xl">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-primary" />
                      Assigned Projects
                  </CardTitle>
                  <CardDescription>Overview of the status of projects you're a member of.</CardDescription>
              </CardHeader>
              <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                          <Pie
                              data={projectStatusData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              nameKey="name"
                              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                  const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
                                  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                  return (
                                  <text x={x} y={y} fill="currentColor" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                      {`${(percent * 100).toFixed(0)}%`}
                                  </text>
                                  );
                              }}
                          >
                              {projectStatusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]} />
                              ))}
                          </Pie>
                          <Tooltip
                               contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    borderRadius: '0.5rem',
                                    border: '1px solid hsl(var(--border))',
                                }}
                          />
                          <Legend iconSize={10} />
                      </PieChart>
                  </ResponsiveContainer>
              </CardContent>
            </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-1 space-y-6">
            {/* Upcoming Deadlines */}
            <Card className="shadow-lg rounded-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Upcoming Deadlines
                    </CardTitle>
                    <CardDescription>Your nearest upcoming task due dates.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {upcomingDeadlines.length > 0 ? (
                          upcomingDeadlines.map(task => (
                            <div key={task.id} className="flex items-start gap-4">
                                <div className="flex-shrink-0 mt-1 h-8 w-8 rounded-lg bg-primary/10 text-primary flex flex-col items-center justify-center font-bold">
                                    <span className="text-xs -mb-1">{format(new Date(task.deadline), 'MMM')}</span>
                                    <span className="text-lg leading-tight">{format(new Date(task.deadline), 'dd')}</span>
                                </div>
                                <div>
                                    <p className="font-medium leading-snug">{task.description}</p>
                                    <p className="text-sm text-muted-foreground">{task.projects?.name}</p>
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
        </div>
      </div>
    </div>
  );
}
