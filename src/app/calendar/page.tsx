

import { createServerClient } from '@/lib/supabase/server';
import CalendarClient from './calendar-client';
import { getPublicHolidays } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = createServerClient();
  const selectedDate = searchParams.month ? new Date(`${searchParams.month}-01`) : new Date();

  const year = selectedDate.getFullYear();
  // Fetching for India. This can be made dynamic later.
  const countryCode = 'in';

  const [
    { data: publicHolidays, error: publicHolidaysError },
    { data: officialHolidays, error: officialHolidaysError }
  ] = await Promise.all([
    getPublicHolidays(year, countryCode),
    supabase.from('official_holidays').select('*')
  ]);

  if (publicHolidaysError || officialHolidaysError) {
    console.error('Error fetching holidays:', publicHolidaysError, officialHolidaysError);
  }
  
  return (
    <CalendarClient 
        publicHolidays={publicHolidays || []}
        officialHolidays={officialHolidays || []}
        selectedDate={selectedDate.toISOString()}
    />
  );
}
