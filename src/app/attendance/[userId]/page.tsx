
import { createServerClient } from '@/lib/supabase/server';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parse, differenceInMinutes, parseISO } from 'date-fns';
import AttendanceDetailClient from './attendance-detail-client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function UserAttendancePage({ params, searchParams }: { params: { userId: string }, searchParams: { month?: string } }) {
  const supabase = await createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const userId = params.userId;
  const isOwnRecord = authUser.id === userId;

  const { data: currentUserProfile } = await supabase.from('profiles').select('*, roles(*)').eq('id', authUser.id).single();
  const permissions = (currentUserProfile?.roles as any)?.permissions || {};
  const isFalaqAdmin = currentUserProfile?.roles?.name === 'Falaq Admin';

  if (!isOwnRecord && !isFalaqAdmin && permissions.attendance === 'Restricted') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500">You do not have permission to view this user's attendance records.</p>
      </div>
    );
  }

  const isEditor = isFalaqAdmin || permissions.attendance === 'Editor';

  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    return <p className="p-8">Error fetching user data: {userError?.message || 'User not found'}</p>;
  }

  const selectedDate = searchParams.month ? new Date(`${searchParams.month}-01T00:00:00Z`) : new Date();
  const firstDayOfMonth = startOfMonth(selectedDate);
  const lastDayOfMonth = endOfMonth(selectedDate);
  const prevMonth = format(new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth() - 1, 1), 'yyyy-MM');
  const nextMonth = format(new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth() + 1, 1), 'yyyy-MM');

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

    let extraMinutes = 0;
    if (record && user.work_end_time && record.check_out) {
        try {
            const checkOutTime = new Date(record.check_out);
            // Use the date part from the record itself to build the expected checkout time
            const attendanceDate = parseISO(record.date);
            const expectedCheckOutDateTime = parse(user.work_end_time, 'HH:mm:ss', attendanceDate);
            
            if (checkOutTime > expectedCheckOutDateTime) {
                extraMinutes = differenceInMinutes(checkOutTime, expectedCheckOutDateTime);
            }
        } catch (e) {
            console.error(`Could not parse work_end_time '${user.work_end_time}' for user ${user.id}`);
        }
    }

    return {
      date: dayString,
      check_in: record?.check_in || null,
      check_out: record?.check_out || null,
      lunch_in: record?.lunch_in || null,
      lunch_out: record?.lunch_out || null,
      total_hours: record?.total_hours || 0,
      extra_hours: extraMinutes / 60,
      check_in_reason: record?.check_in_reason || null,
    };
  });

  return (
    <AttendanceDetailClient
      user={user}
      monthlyAttendance={monthlyAttendance as any[]}
      selectedDate={selectedDate.toISOString()}
      prevMonth={prevMonth}
      nextMonth={nextMonth}
      allDaysCount={allDaysInMonth.length}
      isEditor={isEditor}
    />
  );
}
