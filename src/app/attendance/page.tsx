
import { createServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';
import AttendanceClient from './attendance-client';
import { differenceInMinutes, parse } from 'date-fns';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
  const supabase = await createServerClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*, roles(*)').eq('id', currentUser.id).single();
  const permissions = (profile?.roles as any)?.permissions || {};
  const isFalaqAdmin = profile?.roles?.name === 'Falaq Admin';

  if (!isFalaqAdmin && permissions.attendance === 'Restricted') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500">You do not have permission to view the team attendance list.</p>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_archived', false)
    .order('full_name');

  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance')
    .select('*')
    .eq('date', today);

  if (profilesError || attendanceError) {
    return (
      <p>
        Error fetching data:{' '}
        {profilesError?.message || attendanceError?.message}
      </p>
    );
  }

  const attendanceMap = new Map(attendanceData.map((a) => [a.user_id, a]));

  const attendanceList = profiles.map((profile) => {
    const attendanceRecord = attendanceMap.get(profile.id);

    let extraMinutes = 0;
    if (attendanceRecord) {
      if (profile.work_end_time && attendanceRecord.check_out) {
        const checkOutTime = new Date(attendanceRecord.check_out);
        const expectedCheckOutDateTime = parse(
          profile.work_end_time,
          'HH:mm:ss',
          new Date(checkOutTime),
        );

        if (checkOutTime > expectedCheckOutDateTime) {
          const overtimeMinutes = differenceInMinutes(
            checkOutTime,
            expectedCheckOutDateTime,
          );
          extraMinutes += overtimeMinutes;
        }
      }
    }

    return {
      ...(attendanceRecord || {
        id: `${profile.id}-${today}`,
        check_in: null,
        check_out: null,
        total_hours: null,
      }),
      user_id: profile.id,
      date: today,
      profiles: profile as Profile,
      extra_hours: extraMinutes / 60,
    };
  });

  return <AttendanceClient initialData={attendanceList as any[]} />;
}
