
import { createServerClient } from '@/lib/supabase/server';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isBefore, startOfMonth, endOfMonth, getDaysInMonth, eachDayOfInterval as eachDayOfIntervalFP, isFuture, parseISO, addDays, startOfToday } from 'date-fns';
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
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [
    monthlyAttendanceRes,
    tasksRes,
    projectsRes,
    holidaysRes,
  ] = await Promise.all([
     supabase.from('attendance')
        .select('date, total_hours')
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
    supabase.from('official_holidays').select('date, falaq_event_type').eq('is_deleted', false)
  ]);

  // --- Data Processing ---
  const { data: monthlyAttendanceData } = monthlyAttendanceRes;
  const { data: tasks } = tasksRes;
  const { data: projects } = projectsRes;
  const { data: holidays } = holidaysRes;

  // Monthly Attendance Chart Data
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const attendanceChartData = monthDays.map(day => {
    const record = monthlyAttendanceData?.find(a => a.date === format(day, 'yyyy-MM-dd'));
    return {
      name: format(day, 'd'),
      hours: record?.total_hours ?? 0,
    };
  });
  
  // Monthly Attendance Cards
  const allMonthDays = eachDayOfIntervalFP({ start: monthStart, end: monthEnd });
  const leaveDates = new Set((holidays || []).filter(h => h.falaq_event_type === 'leave').map(h => h.date));
  const workingSundays = new Set((holidays || []).filter(h => h.falaq_event_type === 'working_sunday').map(h => h.date));
  
  const totalWorkingDays = allMonthDays.filter(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const isSunday = day.getDay() === 0;
      if (leaveDates.has(dayStr)) return false;
      if (isSunday && !workingSundays.has(dayStr)) return false;
      return true;
  }).length;

  const presentDaysSoFar = (monthlyAttendanceData || []).filter(a => new Date(a.date) <= today).length;
  const workingDaysSoFar = allMonthDays.filter(day => {
    if (day > today) return false;
    const dayStr = format(day, 'yyyy-MM-dd');
    const isSunday = day.getDay() === 0;
    if (leaveDates.has(dayStr)) return false;
    if (isSunday && !workingSundays.has(dayStr)) return false;
    return true;
  }).length;
  
  const absentDays = workingDaysSoFar - presentDaysSoFar;

  // Task Stats
  const pendingTasks = tasks?.filter(t => t.status === 'todo' || t.status === 'inprogress' || t.status === 'corrections' || t.status === 'recreate').length ?? 0;
  const reviewTasks = tasks?.filter(t => t.status === 'review').length ?? 0;
  const completedTasks = tasks?.filter(t => t.status === 'done' || t.status === 'approved').length ?? 0;
  
  // Upcoming & Overdue Deadlines
  const todayStart = startOfToday();
  const threeDaysFromNow = addDays(todayStart, 3);
  
  const activeTasks = tasks?.filter(t => t.status !== 'done' && t.status !== 'approved') || [];

  const overdueTasks = activeTasks
    .filter(t => {
      if (!t.deadline) return false;
      const deadlineDate = parseISO(t.deadline);
      return isBefore(deadlineDate, todayStart);
    })
    .map(t => ({ ...t, isOverdue: true }));

  const upcomingTasks = activeTasks
    .filter(t => {
      if (!t.deadline) return false;
      const deadlineDate = parseISO(t.deadline);
      return !isBefore(deadlineDate, todayStart) && isBefore(deadlineDate, threeDaysFromNow);
    })
    .map(t => ({ ...t, isOverdue: false }));

  const deadlines = [...overdueTasks, ...upcomingTasks]
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5);


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
      upcomingDeadlines={deadlines.map(t => ({...t, projects: t.projects || null }))}
      totalWorkingDays={totalWorkingDays}
      totalPresentDays={presentDaysSoFar}
      totalAbsentDays={absentDays}
    />
  );
}

