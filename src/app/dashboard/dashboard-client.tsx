
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Clock, Folder, Zap, Calendar, ArrowDown, Eye, Loader2, Briefcase, Users, X } from 'lucide-react';
import type { Profile, Task, Project, Attendance, OfficialHoliday } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { format, parseISO, getDay, isAfter, isToday } from 'date-fns';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


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
    reviewTasks: number;
    completedTasks: number;
    attendanceChartData: { name: string; hours: number }[];
    projectStatusData: { name: string; value: number }[];
    upcomingDeadlines: UpcomingDeadline[];
    totalWorkingDaysInMonth: number;
    presentDays: number;
    absentDays: number;
    monthlyAttendanceData: Attendance[] | null;
    holidays: Pick<OfficialHoliday, 'date' | 'falaq_event_type'>[];
}


export default function DashboardClient({
    profile,
    pendingTasks,
    reviewTasks,
    completedTasks,
    attendanceChartData,
    projectStatusData,
    upcomingDeadlines,
    totalWorkingDaysInMonth,
    presentDays,
    absentDays,
    monthlyAttendanceData,
    holidays
}: DashboardClientProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);


  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleCardClick = (href: string) => {
    router.push(href);
  };
  
  const handleDownloadReport = () => {
    if (!monthlyAttendanceData || !profile) return;
    setIsDownloading(true);

    const doc = new jsPDF();
    const holidayDates = new Set(holidays.map(h => h.date));
    const workingSundays = new Set(holidays.filter(h => h.falaq_event_type === 'working_sunday').map(h => h.date));

    doc.setFontSize(18);
    doc.text(`Monthly Attendance Report`, 14, 22);
    doc.setFontSize(12);
    doc.text(`User: ${profile.full_name}`, 14, 30);
    doc.text(`Month: ${format(new Date(monthlyAttendanceData[0].date), 'MMMM yyyy')}`, 14, 36);

    const tableColumn = ["Date", "Check In", "Lunch Out", "Lunch In", "Check Out", "Total Hours"];
    const tableRows: any[][] = [];

    monthlyAttendanceData.forEach(record => {
      const recordDate = parseISO(record.date);
      const attendanceData = [
        format(recordDate, 'dd/MM/yyyy (EEE)'),
        record.check_in ? format(parseISO(record.check_in), 'p') : '-',
        record.lunch_out ? format(parseISO(record.lunch_out), 'p') : '-',
        record.lunch_in ? format(parseISO(record.lunch_in), 'p') : '-',
        record.check_out ? format(parseISO(record.check_out), 'p') : '-',
        record.total_hours ? record.total_hours.toFixed(2) : '0.00'
      ];
      tableRows.push(attendanceData);
    });

    autoTable(doc, {
      startY: 40,
      head: [tableColumn],
      body: tableRows,
      didDrawCell: (data) => {
        const record = monthlyAttendanceData[data.row.index];
        if (record) {
          const date = parseISO(record.date);
          const dayString = format(date, 'yyyy-MM-dd');
          const isSunday = getDay(date) === 0;
          const isHoliday = holidayDates.has(dayString);
          const isWorkingSunday = workingSundays.has(dayString);

          const isWorkingDay = (isWorkingSunday || !isSunday) && !isHoliday;
          
          if (isSunday && !isWorkingSunday) {
             doc.setFillColor(254, 242, 242); // bg-red-50
          } else if(isWorkingDay && !record.check_in && isAfter(new Date(), date) && isToday(date) === false) {
             doc.setFillColor(220, 38, 38); // bg-red-600
             doc.setTextColor(255, 255, 255);
          }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    
    autoTable(doc, {
        startY: finalY + 10,
        body: [
            ['Total Working Days', totalWorkingDaysInMonth],
            ['Total Present Days', presentDays],
            ['Total Absent Days', absentDays],
        ],
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });
    
    doc.save(`attendance_report_${profile.full_name?.replace(' ','_')}_${format(new Date(), 'yyyy_MM')}.pdf`);
    setIsDownloading(false);
  };

const TaskCard = ({
  title,
  value,
  icon,
  href,
  colorClass,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  colorClass: string;
}) => {
  return (
    <div onClick={() => handleCardClick(href)} className="cursor-pointer">
      <Card
        className={cn(
          "shadow-lg rounded-xl text-white transition-all duration-300",
          colorClass,
          "hover:scale-105"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{value}</div>
        </CardContent>
      </Card>
    </div>
  );
};

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
                 <TaskCard
                    title="Pending Tasks"
                    value={pendingTasks}
                    icon={<AlertCircle className="h-5 w-5 opacity-80" />}
                    href="/tasks?tab=active"
                    colorClass="bg-gradient-to-br from-blue-500 to-blue-600"
                 />
                 <TaskCard
                    title="Review Tasks"
                    value={reviewTasks}
                    icon={<Eye className="h-5 w-5 opacity-80" />}
                    href="/tasks?tab=under-review"
                    colorClass="bg-gradient-to-br from-yellow-500 to-yellow-600"
                 />
                <TaskCard
                    title="Completed Tasks"
                    value={completedTasks}
                    icon={<CheckCircle2 className="h-5 w-5 opacity-80" />}
                    href="/tasks?tab=completed"
                    colorClass="bg-gradient-to-br from-green-500 to-green-600"
                 />
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
                              cursor={false}
                              wrapperStyle={{
                                outline: 'none',
                              }}
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderRadius: '12px',
                                border: '1px solid hsl(var(--border))',
                                boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.12)',
                                padding: '10px 12px',
                              }}
                              labelStyle={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: 'hsl(var(--foreground))',
                                marginBottom: '4px',
                              }}
                              itemStyle={{
                                fontSize: '13px',
                                color: 'hsl(var(--muted-foreground))',
                                marginTop: '4px',
                              }}
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
                                    borderRadius: 'var(--radius)',
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
                                    {hasMounted ? (
                                      <>
                                        <span className="text-xs -mb-1">{format(new Date(task.deadline), 'MMM')}</span>
                                        <span className="text-lg leading-tight">{format(new Date(task.deadline), 'dd')}</span>
                                      </>
                                    ) : (
                                      <div className="h-full w-full bg-muted animate-pulse rounded-lg" />
                                    )}
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

             <Card className="shadow-lg rounded-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Monthly Attendance
                    </CardTitle>
                    <CardDescription>{hasMounted ? format(new Date(), 'MMMM yyyy') : ''}</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="space-y-4">
                       <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <span className="font-medium text-blue-800">Total Working Days</span>
                            <span className="font-bold text-2xl text-blue-900">{totalWorkingDaysInMonth}</span>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg">
                                <span className="text-3xl font-bold text-green-700">{presentDays}</span>
                                <span className="text-xs font-medium text-green-600">Present</span>
                           </div>
                           <div className="flex flex-col items-center p-3 bg-red-50 rounded-lg">
                                <span className="text-3xl font-bold text-red-700">{absentDays}</span>
                                <span className="text-xs font-medium text-red-600">Absent</span>
                           </div>
                       </div>
                   </div>
                </CardContent>
                 <CardFooter>
                    <Button variant="outline" className="w-full" onClick={handleDownloadReport} disabled={isDownloading}>
                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDown className="mr-2 h-4 w-4" />}
                        {isDownloading ? 'Generating...' : 'Download Report'}
                    </Button>
                 </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
