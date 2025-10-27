
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
    ...(publicHolidays || []).map(h => ({ name: h.localName, date: h.date, type: 'public', description: h.name })),
    ...(officialHolidays || []).map(h => ({ name: h.name, date: h.date, type: h.user_id ? 'personal' : 'official', description: h.description, id: h.id, user_id: h.user_id })),
    ...(myTasks as Task[] || []).map(t => ({ name: t.description, date: t.deadline, type: 'task', description: `Task ID: ${t.id}`, id: t.id })),
    ...(allProjects as Project[] || []).filter(p => p.due_date).map(p => ({ name: p.name, date: p.due_date!, type: 'project', description: `Project: ${p.name}`, id: p.id })),
    ...eachDayOfInterval({ start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) })
        .filter(day => getDay(day) === 0)
        .map(day => ({
            id: `sunday-${format(day, 'yyyy-MM-dd')}`,
            name: 'Sunday',
            date: format(day, 'yyyy-MM-dd'),
            description: 'Weekend',
            type: 'weekend'
        }))
  ];

  return (
    <CalendarClient 
        events={events}
        initialDate={selectedDate.toISOString()}
        currentUserId={user?.id}
    />
  );
}
