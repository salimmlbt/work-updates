
import { createServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';
import AttendanceClient from './attendance-client';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
  const supabase = createServerClient();
  // Get today's date in UTC
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
    return <p>Error fetching data: {profilesError?.message || attendanceError?.message}</p>;
  }
  
  const attendanceMap = new Map(attendanceData.map(a => [a.user_id, a]));

  const attendanceList = profiles.map(profile => {
    const attendanceRecord = attendanceMap.get(profile.id);
    return {
      ...(attendanceRecord || {
        id: `${profile.id}-${today}`, // synthetic id
        check_in: null,
        check_out: null,
        total_hours: null,
      }),
      user_id: profile.id,
      date: today,
      profiles: profile,
    };
  })

  return <AttendanceClient initialData={attendanceList as any[]} />;
}
