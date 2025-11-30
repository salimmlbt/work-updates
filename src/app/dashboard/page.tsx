
import { createServerClient } from '@/lib/supabase/server';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isBefore, startOfMonth, endOfMonth, getDay, isSameDay } from 'date-fns';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <p className="p-4">Please log in to view the dashboard.</p>;
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  // --- Data Fetching ---
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [
    weeklyAttendanceRes,
    monthlyAttendanceRes,
    tasksRes,
    projectsRes,
    holidaysRes
  ] = await Promise.all([
    supabase.from('attendance')
      .select('date, total_hours')
      .eq('user_id', user.id)
      .gte('date', format(weekStart, 'yyyy-MM-dd'))
      .lte('date', format(weekEnd, 'yyyy-MM-dd')),
    supabase.from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd')),
    supabase.from('tasks')
      .select('id, description, deadline, status, project_id, projects(name)')
      .eq('assignee_id', user.id)
      .eq('is_deleted', false),
    supabase.from('projects')
      .select('id, name, status, members')
      .contains('members', [user.id])
      .eq('is_deleted', false),
    supabase.from('official_holidays')
      .select('date, falaq_event_type')
      .eq('is_deleted', false)
      .gte('date', format(monthStart, 'yyyy-MM-dd'))
      .lte('date', format(today, 'yyyy-MM-dd')),
  ]);

  // --- Data Processing ---
  const { data: weeklyAttendanceData } = weeklyAttendanceRes;
  const { data: rawMonthlyAttendanceData } = monthlyAttendanceRes;
  const { data: tasks } = tasksRes;
  const { data: projects } = projectsRes;
  const { data: holidaysData } = holidaysRes;

  // Weekly Attendance Chart Data
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const attendanceChartData = weekDays.map(day => {
    const record = weeklyAttendanceData?.find(a => a.date === format(day, 'yyyy-MM-dd'));
    return {
      name: format(day, 'EEE'),
      hours: record?.total_hours ?? 0,
    };
  });
  
  // Monthly Attendance Calculation
  const daysInMonthSoFar = eachDayOfInterval({ start: monthStart, end: today });
  const holidayDates = new Set((holidaysData || []).map(h => h.date));
  const workingSundays = new Set((holidaysData || []).filter(h => h.falaq_event_type === 'working_sunday').map(h => h.date));

  const totalWorkingDaysInMonth = daysInMonthSoFar.filter(day => {
    const dayString = format(day, 'yyyy-MM-dd');
    const isSunday = getDay(day) === 0;
    
    if(workingSundays.has(dayString)) return true;
    if (isSunday || holidayDates.has(dayString)) return false;

    return true;
  }).length;
  
  const presentDays = rawMonthlyAttendanceData?.filter(att => att.check_in).length ?? 0;
  const absentDays = totalWorkingDaysInMonth - presentDays;
  
  // Complete monthly data for PDF
  const attendanceMap = new Map(rawMonthlyAttendanceData?.map(rec => [rec.date, rec]));
  const allDaysForPDF = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const monthlyAttendanceData = allDaysForPDF.map(day => {
      const dateString = format(day, 'yyyy-MM-dd');
      return attendanceMap.get(dateString) || {
          date: dateString,
          check_in: null,
          check_out: null,
          lunch_in: null,
          lunch_out: null,
          total_hours: null,
          id: dateString,
          user_id: user.id
      };
  });

  // Task Stats
  const pendingTasks = tasks?.filter(t => t.status === 'todo' || t.status === 'inprogress').length ?? 0;
  const reviewTasks = tasks?.filter(t => t.status === 'review' || t.status === 'under-review' || t.status === 'corrections' || t.status === 'recreate').length ?? 0;
  const completedTasks = tasks?.filter(t => t.status === 'done' || t.status === 'approved').length ?? 0;
  
  // Upcoming Deadlines
  const upcomingDeadlines = tasks
    ?.filter(t => {
        if (!t.deadline || isNaN(new Date(t.deadline).getTime())) {
          return false;
        }
        return (t.status === 'todo' || t.status === 'inprogress');
    })
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5) ?? [];

  // Project Status Pie Chart
  const projectStatusCounts = projects?.reduce((acc, p) => {
    const status = p.status || 'New';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};
  
  const projectStatusData = Object.entries(projectStatusCounts).map(([name, value]) => ({
    name,
    value,
  }));


  return (
    <DashboardClient
      profile={profile}
      pendingTasks={pendingTasks}
      reviewTasks={reviewTasks}
      completedTasks={completedTasks}
      attendanceChartData={attendanceChartData}
      projectStatusData={projectStatusData}
      upcomingDeadlines={upcomingDeadlines.map(t => ({...t, projects: t.projects || null }))}
      totalWorkingDaysInMonth={totalWorkingDaysInMonth}
      presentDays={presentDays}
      absentDays={absentDays > 0 ? absentDays : 0}
      monthlyAttendanceData={monthlyAttendanceData}
      holidays={holidaysData || []}
    />
  );
}
