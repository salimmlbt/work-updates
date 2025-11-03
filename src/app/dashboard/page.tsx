import { createServerClient } from '@/lib/supabase/server';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isBefore, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <p className="p-4">Please log in to view the dashboard.</p>;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // --- Data Fetching ---
  const today = new Date();
  const todayDateString = format(today, 'yyyy-MM-dd');
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [
    weeklyAttendanceRes,
    monthlyAttendanceRes,
    tasksRes,
    projectsRes,
  ] = await Promise.all([
    supabase.from('attendance')
      .select('date, total_hours')
      .eq('user_id', user.id)
      .gte('date', format(weekStart, 'yyyy-MM-dd'))
      .lte('date', format(weekEnd, 'yyyy-MM-dd')),

    supabase.from('attendance')
      .select('date')
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
  ]);

  // --- Data Processing ---
  const { data: weeklyAttendanceData } = weeklyAttendanceRes;
  const { data: monthlyAttendanceData } = monthlyAttendanceRes;
  const { data: tasks } = tasksRes;
  const { data: projects } = projectsRes;

  // Weekly Attendance Chart Data
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const attendanceChartData = weekDays.map(day => {
    const record = weeklyAttendanceData?.find(a => a.date === format(day, 'yyyy-MM-dd'));
    return {
      name: format(day, 'EEE'),
      hours: record?.total_hours ?? 0,
    };
  });

  // Monthly Attendance Pie Chart
  const daysInMonth = getDaysInMonth(today);
  const presentDays = monthlyAttendanceData?.length ?? 0;
  const absentDays = daysInMonth - presentDays;
  const presentPercentage = daysInMonth > 0 ? Math.round((presentDays / daysInMonth) * 100) : 0;
  const absentPercentage = 100 - presentPercentage;

  const monthlyAttendancePieData = [
    { name: 'Present', value: presentPercentage },
    { name: 'Absent', value: absentPercentage },
  ];

  // Task Stats
  const pendingTasks = tasks?.filter(t => t.status === 'todo').length ?? 0;
  const inProgressTasks = tasks?.filter(t => t.status === 'inprogress').length ?? 0;
  const completedTasks = tasks?.filter(t => t.status === 'done').length ?? 0;

  // Upcoming Deadlines
  const upcomingDeadlines =
    tasks
      ?.filter(t => {
        if (!t.deadline || isNaN(new Date(t.deadline).getTime())) {
          return false;
        }
        const deadlineDateString = format(new Date(t.deadline), 'yyyy-MM-dd');
        return t.status !== 'done' && deadlineDateString >= todayDateString;
      })
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 5) ?? [];

  // Project Status Pie Chart
  const projectStatusCounts =
    projects?.reduce((acc, p) => {
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
      inProgressTasks={inProgressTasks}
      completedTasks={completedTasks}
      attendanceChartData={attendanceChartData}
      projectStatusData={projectStatusData}
      upcomingDeadlines={upcomingDeadlines.map(t => ({ ...t, projects: t.projects || null }))}
      monthlyAttendanceData={monthlyAttendancePieData}
    />
  );
}
