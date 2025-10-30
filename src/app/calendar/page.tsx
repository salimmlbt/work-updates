
import { createServerClient } from '@/lib/supabase/server';
import CalendarClient from './calendar-client';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay, getYear, startOfYear, endOfYear } from 'date-fns';
import type { Task, Project, OfficialHoliday } from '@/lib/types';
import { getPublicHolidays } from '../actions';

export const dynamic = 'force-dynamic';

async function seedWeekendHolidays(supabase: any, year: number) {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 11, 31));
  const allSundays = eachDayOfInterval({ start: yearStart, end: yearEnd }).filter(day => getDay(day) === 0);

  // Fetch ALL existing weekend holidays for the year, including soft-deleted ones
  const { data: existingHolidays, error: fetchError } = await supabase
    .from('official_holidays')
    .select('date')
    .eq('type', 'weekend')
    .gte('date', format(yearStart, 'yyyy-MM-dd'))
    .lte('date', format(yearEnd, 'yyyy-MM-dd'));

  if (fetchError) {
    console.error('Error fetching existing weekend holidays:', fetchError);
    return;
  }

  const existingDates = new Set(existingHolidays.map((h: any) => h.date));
  const holidaysToInsert = allSundays
    .filter(day => !existingDates.has(format(day, 'yyyy-MM-dd')))
    .map(day => ({
      name: 'Leave',
      date: format(day, 'yyyy-MM-dd'),
      type: 'weekend' as const,
      is_deleted: false,
    }));

  if (holidaysToInsert.length > 0) {
    const { error: insertError } = await supabase.from('official_holidays').insert(holidaysToInsert);
    if (insertError) {
      console.error('Error seeding weekend holidays:', insertError);
    }
  }
}


export default async function CalendarPage({ searchParams }: { searchParams: { month?: string, view?: string } }) {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  const selectedMonth = searchParams.month || format(new Date(), 'yyyy-MM');
  const selectedDate = new Date(`${selectedMonth}-01T00:00:00Z`);
  const year = getYear(selectedDate);
  
  // Seed Sundays for the current year
  await seedWeekendHolidays(supabase, year);

  // TODO: Make country code configurable
  const countryCode = 'IN';

  const [
    myTasksResult,
    allProjectsResult,
    officialHolidaysResult,
    publicHolidaysResult,
  ] = await Promise.all([
    user ? supabase.from('tasks').select('*').eq('assignee_id', user.id).eq('is_deleted', false) : Promise.resolve({ data: [], error: null }),
    supabase.from('projects').select('*').eq('is_deleted', false),
    supabase.from('official_holidays').select('*').eq('is_deleted', false),
    getPublicHolidays(year, countryCode),
  ]);
  
  const { data: myTasks, error: myTasksError } = myTasksResult;
  const { data: allProjects, error: allProjectsError } = allProjectsResult;
  const { data: officialHolidays, error: officialHolidaysError } = officialHolidaysResult;
  const { data: publicHolidays, error: publicHolidaysError } = publicHolidaysResult;

  if (myTasksError) console.error('Error fetching user tasks:', myTasksError.message);
  if (allProjectsError) console.error('Error fetching projects:', allProjectsError.message);
  if (officialHolidaysError) console.error('Error fetching official holidays:', officialHolidaysError.message);
  if (publicHolidaysError) console.error('Error fetching public holidays:', publicHolidaysError);

  const allHolidays = officialHolidays as OfficialHoliday[] || [];

  const personalEvents = allHolidays
    .filter(h => h.user_id === user?.id && h.type === 'personal')
    .map(h => ({ id: `personal-${h.id}`, name: h.name, date: h.date, description: h.description, type: 'personal', user_id: h.user_id, falaq_event_type: h.falaq_event_type }));

  const companyEvents = allHolidays
    .filter(h => h.type === 'official')
    .map(h => ({ id: `official-${h.id}`, name: h.name, date: h.date, description: h.description, type: 'official', user_id: h.user_id, falaq_event_type: h.falaq_event_type }));
  
  const specialDays = allHolidays
    .filter(h => h.type === 'special_day')
    .map(h => ({ id: `official-${h.id}`, name: h.name, date: h.date, description: h.description, type: 'official', user_id: h.user_id, falaq_event_type: h.falaq_event_type }));

  const weekendEvents = allHolidays
    .filter(h => h.type === 'weekend')
    .map(h => ({ id: `weekend-${h.id}`, name: h.name, date: h.date, description: h.description, type: 'weekend', user_id: h.user_id, falaq_event_type: h.falaq_event_type }));


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
