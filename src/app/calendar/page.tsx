
import { createServerClient } from '@/lib/supabase/server';
import CalendarClient from './calendar-client';
import { getPublicHolidays } from '@/app/actions';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = createServerClient();
  const selectedDate = searchParams.month ? new Date(`${searchParams.month}-01`) : new Date();

  const year = selectedDate.getFullYear();
  // Fetching for India. This can be made dynamic later.
  const { data: publicHolidays, error: publicHolidaysError } = await getPublicHolidays(year, 'IN');

  const { data: officialHolidays, error: officialHolidaysError } = await supabase
    .from('official_holidays')
    .select('*');

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
