import { createServerClient } from '@/lib/supabase/server';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parse, differenceInMinutes, parseISO } from 'date-fns';
import AttendanceDetailClient from './attendance-detail-client';
import { redirect } from 'next/navigation';
import type { Profile } from '@/lib/types';

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
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4 bg-[#05050a]">
        <div className="h-20 w-20 rounded-[2rem] bg-rose-500/10 flex items-center justify-center mb-6 shadow-2xl border border-rose-500/20">
          <span className="text-3xl">🚫</span>
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Access Denied</h2>
        <p className="text-zinc-500 mt-2 font-medium">You do not have authorization to view this user's attendance statement.</p>
      </div>
    );
  }

  const isEditor = isFalaqAdmin || permissions.attendance === 'Editor';

  const [
    { data: targetUser, error: userError },
    { data: allProfiles }
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    isEditor ? supabase.from('profiles').select('*').eq('is_archived', false).order('full_name') : Promise.resolve({ data: [] })
  ]);

  if (userError || !targetUser) {
    return <p className="p-10 text-rose-500 font-bold uppercase tracking-widest">Auditor Record Fault: {userError?.message || 'Member not found'}</p>;
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
    return <p className="p-10 text-rose-500 font-bold">Ledger Sync Error: {attendanceError.message}</p>;
  }

  const allDaysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  const attendanceMap = new Map(attendanceData.map(a => [a.date, a]));
  
  const monthlyAttendance = allDaysInMonth.map(day => {
    const dayString = format(day, 'yyyy-MM-dd');
    const record = attendanceMap.get(dayString);

    let extraMinutes = 0;
    if (record && targetUser.work_end_time && record.check_out) {
        try {
            const checkOutTime = new Date(record.check_out);
            const attendanceDate = parseISO(record.date);
            const expectedCheckOutDateTime = parse(targetUser.work_end_time, 'HH:mm:ss', attendanceDate);
            if (checkOutTime > expectedCheckOutDateTime) {
                extraMinutes = differenceInMinutes(checkOutTime, expectedCheckOutDateTime);
            }
        } catch (e) {}
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
      user={targetUser as Profile}
      allProfiles={allProfiles as Profile[] || []}
      monthlyAttendance={monthlyAttendance as any[]}
      selectedDate={selectedDate.toISOString()}
      prevMonth={prevMonth}
      nextMonth={nextMonth}
      isEditor={isEditor}
    />
  );
}
