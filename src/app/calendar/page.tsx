import { createServerClient } from '@/lib/supabase/server';
import CalendarClient from './calendar-client';
import { getPublicHolidays } from '@/app/actions';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getMonth, getDay } from 'date-fns';
import type { Task, Project } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = createServerClient();
  const selectedDate = searchParams.month ? new Date(`${searchParams.month}-01`) : new Date();

  const { data: { user } } = await supabase.auth.getUser();

  const year = selectedDate.getFullYear();
  const countryCode = 'in';

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  
  const daysInMonth = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  }).map(date => ({
      date: date.toISOString(),
      isCurrentMonth: getMonth(date) === getMonth(selectedDate),
  }));
  
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

  // Add Sundays to Falaq Calendar
  const sundays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    .filter(day => getDay(day) === 0)
    .map(day => ({
        id: `sunday-${format(day, 'yyyy-MM-dd')}`,
        name: 'Sunday',
        date: format(day, 'yyyy-MM-dd'),
        description: 'Weekend',
        type: 'weekend'
    }));

  return (
    <CalendarClient 
        publicHolidays={publicHolidays || []}
        officialHolidays={officialHolidays || []}
        myTasks={myTasks as Task[] || []}
        allProjects={allProjects as Project[] || []}
        sundays={sundays}
        daysInMonth={daysInMonth}
        selectedDate={selectedDate.toISOString()}
        currentUserId={user?.id}
    />
  );
}
