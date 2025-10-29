
import { createServerClient } from '@/lib/supabase/server';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import AttendanceDetailClient from './attendance-detail-client';

export const dynamic = 'force-dynamic';

export default async function UserAttendancePage({ params, searchParams }: { params: { userId: string }, searchParams: { month?: string } }) {
  const supabase = createServerClient();
  const userId = params.userId;

  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    return <p className="p-8">Error fetching user data: {userError?.message || 'User not found'}</p>;
  }

  const selectedDate = searchParams.month ? new Date(searchParams.month) : new Date();
  const firstDayOfMonth = startOfMonth(selectedDate);
  const lastDayOfMonth = endOfMonth(selectedDate);
  const prevMonth = format(new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth() - 1, 1), 'yyyy-MM-dd');
  const nextMonth = format(new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth() + 1, 1), 'yyyy-MM-dd');

  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .gte('date', format(firstDayOfMonth, 'yyyy-MM-dd'))
    .lte('date', format(lastDayOfMonth, 'yyyy-MM-dd'));

  if (attendanceError) {
    return <p className="p-8">Error fetching attendance data: {attendanceError.message}</p>;
  }

  const allDaysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  
  const attendanceMap = new Map(attendanceData.map(a => [a.date, a]));
  
  const monthlyAttendance = allDaysInMonth.map(day => {
    const dayString = format(day, 'yyyy-MM-dd');
    const record = attendanceMap.get(dayString);
    return {
      date: dayString,
      check_in: record?.check_in || null,
      check_out: record?.check_out || null,
      lunch_in: record?.lunch_in || null,
      lunch_out: record?.lunch_out || null,
      total_hours: record?.total_hours || 0,
    };
  });

  return (
    <AttendanceDetailClient
      user={user}
      monthlyAttendance={monthlyAttendance}
      selectedDate={selectedDate.toISOString()}
      prevMonth={prevMonth}
      nextMonth={nextMonth}
      allDaysCount={allDaysInMonth.length}
    />
  );
}
