
import { createServerClient } from '@/lib/supabase/server';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <p className="p-4">Please log in to view the dashboard.</p>;
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  // --- Initial Data Fetching ---
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [
    attendanceRes,
    tasksRes,
    projectsRes,
    holidaysRes,
  ] = await Promise.all([
     supabase.from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd')),
    supabase.from('tasks')
      .select('id, description, deadline, status, project_id, assignee_id, is_deleted, created_at, projects(name)')
      .eq('assignee_id', user.id)
      .eq('is_deleted', false),
    supabase.from('projects')
      .select('id, name, status, members, is_deleted')
      .contains('members', [user.id])
      .eq('is_deleted', false),
    supabase.from('official_holidays').select('*').eq('is_deleted', false)
  ]);

  return (
    <DashboardClient
      profile={profile}
      initialTasks={tasksRes.data || []}
      initialProjects={projectsRes.data || []}
      initialAttendance={attendanceRes.data || []}
      initialHolidays={holidaysRes.data || []}
    />
  );
}
