
import { createServerClient } from '@/lib/supabase/server';
import CalendarClient from './calendar-client';
import { getPublicHolidays } from '@/app/actions';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, getDay, addMonths, subMonths } from 'date-fns';
import type { Task, Project, OfficialHoliday } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams: { month?: string, view?: string } }) {
  const supabase = createServerClient();
  const selectedDate = searchParams.month ? new Date(`${searchParams.month}-01`) : new Date();

  const { data: { user } } = await supabase.auth.getUser();

  const year = selectedDate.getFullYear();
  const countryCode = 'in';

  const [
    publicHolidaysResult,
    officialHolidaysResult,
    myTasksResult,
    allProjectsResult
  ] = await Promise.all([
    getPublicHolidays(year, countryCode),
    supabase.from('official_holidays').select('*'),
    user ? supabase.from('tasks').select('*').eq('assignee_id', user.id) : Promise.resolve({ data: [], error: null }),
    supabase.from('projects').select('*').eq('is_deleted', false)
  ]);
  
  const { data: publicHolidays, error: publicHolidaysError } = publicHolidaysResult;
  const { data: officialHolidays, error: officialHolidaysError } = officialHolidaysResult;
  const { data: myTasks, error: myTasksError } = myTasksResult;
  const { data: allProjects, error: allProjectsError } = allProjectsResult;

  if (publicHolidaysError) {
    console.error('Error fetching public holidays:', publicHolidaysError);
  }
  if (officialHolidaysError && Object.keys(officialHolidaysError).length > 0) {
    console.error('Error fetching official holidays:', officialHolidaysError);
  }
  if (myTasksError) {
    console.error('Error fetching user tasks:', myTasksError);
  }
   if (allProjectsError) {
    console.error('Error fetching projects:', allProjectsError);
  }

  const events = [
    ...(publicHolidays || []).map(h => ({ id: `public-${h.localName}-${h.date}`, name: h.localName, date: h.date, type: 'public', description: h.name })),
    ...(officialHolidays || []).map(h => ({ id: `official-${h.id}`, name: h.name, date: h.date, type: h.user_id ? 'personal' : 'official', description: h.description, user_id: h.user_id })),
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

  return (
    <CalendarClient 
        events={events}
        initialDate={selectedDate.toISOString()}
        currentUserId={user?.id}
    />
  );
}
