
import { createServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';
import AttendanceClient from './attendance-client';
import { differenceInMinutes, parse } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
  const supabase = await createServerClient();
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
