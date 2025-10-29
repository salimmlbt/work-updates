

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
    officialHolidaysResult,
    publicHolidaysResult,
  ] = await Promise.all([
    user ? supabase.from('tasks').select('*').eq('assignee_id', user.id) : Promise.resolve({ data: [], error: null }),
    supabase.from('projects').select('*').eq('is_deleted', false),
    supabase.from('official_holidays').select('*'),
    getPublicHolidays(year, countryCode),
  ]);
  
  const { data: myTasks, error: myTasksError } = myTasksResult;
  const { data: allProjects, error: allProjectsError } = allProjectsResult;
  const { data: officialHolidays, error: officialHolidaysError } = officialHolidaysResult;
  const { data: publicHolidays, error: publicHolidaysError } = publicHolidaysResult;

  if (myTasksError) console.error('Error fetching user tasks:', myTasksError);
  if (allProjectsError) console.error('Error fetching projects:', allProjectsError);
  if (officialHolidaysError) console.error('Error fetching official holidays:', officialHolidaysError);
  if (publicHolidaysError) console.error('Error fetching public holidays:', publicHolidaysError);

  const allHolidays = officialHolidays as OfficialHoliday[] || [];

  const weekendEvents = allHolidays
    .filter(h => h.type === 'weekend')
    .map(h => ({
      id: `weekend-${h.id}`,
      name: 'Sunday',
      date: h.date,
      description: 'Weekend',
      type: 'weekend',
      user_id: null,
    }));


  const personalEvents = allHolidays
    .filter(h => h.user_id === user?.id && h.type === 'personal')
    .map(h => ({ id: `personal-${h.id}`, name: h.name, date: h.date, description: h.description, type: 'personal', user_id: h.user_id }));

  const companyEvents = allHolidays
    .filter(h => h.type === 'official')
    .map(h => ({ id: `official-${h.id}`, name: h.name, date: h.date, description: h.description, type: 'official', user_id: h.user_id }));
  
  const specialDays = allHolidays
    .filter(h => h.type === 'special_day')
    .map(h => ({ id: `official-${h.id}`, name: h.name, date: h.date, description: h.description, type: 'official', user_id: h.user_id }));


  const myCalendarEvents = [
    ...(myTasks as Task[] || []).map(t => ({ id: `task-${t.id}`, name: t.description, date: t.deadline, type: 'task', description: `Task ID: ${t.id}` })),
    ...personalEvents,
  ];

  const falaqCalendarEvents = [
    ...(allProjects as Project[] || []).filter(p => p.due_date).map(p => ({ id: `project-${p.id}`, name: p.name, date: p.due_date!, type: 'project', description: `Project: ${p.name}` })),
    ...companyEvents,
    ...weekendEvents,
  ];

  const holidayEvents = [
    ...(publicHolidays || []).map(h => ({ id: `public-${h.name}-${h.date}`, name: h.name, date: h.date, type: 'public', description: 'Public Holiday' })),
    ...specialDays,
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

    