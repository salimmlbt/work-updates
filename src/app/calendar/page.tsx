import { createServerClient } from '@/lib/supabase/server';
import CalendarClient from './calendar-client';
import { getPublicHolidays } from '@/app/actions';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, subMonths, addMonths, getMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = createServerClient();
  const selectedDate = searchParams.month ? new Date(`${searchParams.month}-01`) : new Date();

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
  
  const prevMonth = format(subMonths(selectedDate, 1), 'yyyy-MM-dd');
  const nextMonth = format(addMonths(selectedDate, 1), 'yyyy-MM-dd');

  const [
    publicHolidaysResult,
    officialHolidaysResult
  ] = await Promise.all([
    getPublicHolidays(year, countryCode),
    supabase.from('official_holidays').select('*')
  ]);
  
  const { data: publicHolidays, error: publicHolidaysError } = publicHolidaysResult;
  const { data: officialHolidays, error: officialHolidaysError } = officialHolidaysResult;

  if (publicHolidaysError) {
    console.error('Error fetching public holidays:', publicHolidaysError);
  }
  if (officialHolidaysError && Object.keys(officialHolidaysError).length > 0) {
    console.error('Error fetching official holidays:', officialHolidaysError);
  }
  
  return (
    <CalendarClient 
        publicHolidays={publicHolidays || []}
        officialHolidays={officialHolidays || []}
        daysInMonth={daysInMonth}
        selectedDate={selectedDate.toISOString()}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
    />
  );
}
