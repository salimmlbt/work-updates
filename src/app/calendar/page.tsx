
import { createServerClient } from '@/lib/supabase/server';
import CalendarClient from './calendar-client';
import { getPublicHolidays } from '@/app/actions';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay } from 'date-fns';
import type { Task, Project } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams: { month?: string, view?: string } }) {
  const supabase = createServerClient();
  const selectedDate = searchParams.month ? new Date(`${searchParams.month}-01T00:00:00Z`) : new Date();
  
  const { data: { user } } = await supabase.auth.getUser();

  const [
    myTasksResult,
    allProjectsResult
  ] = await Promise.all([
    user ? supabase.from('tasks').select('*').eq('assignee_id', user.id) : Promise.resolve({ data: [], error: null }),
    supabase.from('projects').select('*').eq('is_deleted', false)
  ]);
  
  const { data: myTasks, error: myTasksError } = myTasksResult;
  const { data: allProjects, error: allProjectsError } = allProjectsResult;

  if (myTasksError) {
    console.error('Error fetching user tasks:', myTasksError);
  }
   if (allProjectsError) {
    console.error('Error fetching projects:', allProjectsError);
  }

  const events = [
    ...(myTasks as Task[] || []).map(t => ({ id: `task-${t.id}`, name: t.description, date: t.deadline, type: 'task', description: `Task ID: ${t.id}` })),
    ...(allProjects as Project[] || []).filter(p => p.due_date).map(p => ({ id: `project-${p.id}`, name: p.name, date: p.due_date!, type: 'project', description: `Project: ${p.name}` })),
    ...eachDayOfInterval({ start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) })
        .filter(day => getDay(day) === 0)
        .map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            return {
                id: `sunday-${dateStr}`,
                name: 'Sunday',
                date: dateStr,
                description: 'Weekend',
                type: 'weekend'
            }
        })
  ];

  // Sort events to ensure consistent order between server and client
  events.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) {
        return dateA - dateB;
    }
    // Fallback to a stable sort property like name if dates are equal
    return a.name.localeCompare(b.name);
  });


  return (
    <CalendarClient 
        events={events}
        initialDate={selectedDate.toISOString()}
        currentUserId={user?.id}
    />
  );
}

