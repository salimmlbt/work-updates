

import { createServerClient } from '@/lib/supabase/server';
import CalendarClient from './calendar-client';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay, getYear } from 'date-fns';
import type { Task, Project, OfficialHoliday } from '@/lib/types';
import { getPublicHolidays } from '../actions';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams: { month?: string, view?: string } }) {
  const supabase = createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  const selectedMonth = searchParams.month || format(new Date(), 'yyyy-MM');
  const selectedDate = new Date(`${selectedMonth}-01T00:00:00Z`);
  const year = getYear(selectedDate);
  
  // TODO: Make country code configurable
  const countryCode = 'IN';

  const [
    myTasksResult,
    allProjectsResult,
    publicHolidaysResult,
    personalEventsResult
  ] = await Promise.all([
    user ? supabase.from('tasks').select('*').eq('assignee_id', user.id) : Promise.resolve({ data: [], error: null }),
    supabase.from('projects').select('*').eq('is_deleted', false),
    getPublicHolidays(year, countryCode),
    user ? supabase.from('official_holidays').select('*').eq('user_id', user.id) : Promise.resolve({ data: [], error: null })
  ]);
  
  const { data: myTasks, error: myTasksError } = myTasksResult;
  const { data: allProjects, error: allProjectsError } = allProjectsResult;
  const { data: publicHolidays, error: publicHolidaysError } = publicHolidaysResult;
  const { data: personalEvents, error: personalEventsError } = personalEventsResult;

  if (myTasksError) console.error('Error fetching user tasks:', myTasksError);
  if (allProjectsError) console.error('Error fetching projects:', allProjectsError);
  if (publicHolidaysError) console.error('Error fetching public holidays:', publicHolidaysError);
  if (personalEventsError) console.error('Error fetching personal events:', personalEventsError);

  const weekendEvents = eachDayOfInterval({ start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) })
    .filter(day => getDay(day) === 0 || getDay(day) === 6)
    .map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return {
            id: `weekend-${dateStr}`,
            name: getDay(day) === 0 ? 'Sunday' : 'Saturday',
            date: dateStr,
            description: 'Weekend',
            type: 'weekend'
        }
    });

  const myCalendarEvents = [
    ...(myTasks as Task[] || []).map(t => ({ id: `task-${t.id}`, name: t.description, date: t.deadline, type: 'task', description: `Task ID: ${t.id}` })),
    ...(personalEvents as OfficialHoliday[] || []).map(e => ({ id: `personal-${e.id}`, name: e.name, date: e.date, type: 'personal', description: e.description, user_id: e.user_id })),
    ...weekendEvents
  ];

  const falaqCalendarEvents = [
    ...(allProjects as Project[] || []).filter(p => p.due_date).map(p => ({ id: `project-${p.id}`, name: p.name, date: p.due_date!, type: 'project', description: `Project: ${p.name}` })),
    ...weekendEvents
  ];

  const holidayEvents = [
    ...(publicHolidays || []).map(h => ({ id: `public-${h.name}-${h.date}`, name: h.name, date: h.date, type: 'public', description: 'Public Holiday' })),
    ...weekendEvents
  ];

  // Sort events to ensure consistent order
  const sortEvents = (events: any[]) => events.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return a.name.localeCompare(b.name);
  });
  
  sortEvents(myCalendarEvents);
  sortEvents(falaqCalendarEvents);
  sortEvents(holidayEvents);

  return (
    <CalendarClient 
        eventSources={{
            my_calendar: myCalendarEvents,
            falaq_calendar: falaqCalendarEvents,
            holidays: holidayEvents,
        }}
        initialMonth={selectedMonth}
        currentUserId={user?.id}
    />
  );
}
