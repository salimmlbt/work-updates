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
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4 bg-[#05050a]">
        <div className="h-20 w-20 rounded-[2rem] bg-rose-500/10 flex items-center justify-center mb-6 shadow-2xl border border-rose-500/20">
          <span className="text-3xl">🚫</span>
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Access Forbidden</h2>
        <p className="text-zinc-500 mt-2 font-medium">Your role does not have authorization to view team attendance.</p>
      </div>
    );
  }

  const isEditor = isFalaqAdmin || permissions.attendance === 'Editor';
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
    return <p className="p-10 text-rose-500 font-bold">Error syncing with studio infrastructure: {profilesError?.message || attendanceError?.message}</p>;
  }

  const attendanceMap = new Map(attendanceData.map((a) => [a.user_id, a]));

  const attendanceList = profiles.map((p) => {
    const attendanceRecord = attendanceMap.get(p.id);

    let extraMinutes = 0;
    if (attendanceRecord && p.work_end_time && attendanceRecord.check_out) {
      try {
        const checkOutTime = new Date(attendanceRecord.check_out);
        const expectedCheckOutDateTime = parse(p.work_end_time, 'HH:mm:ss', new Date(checkOutTime));
        if (checkOutTime > expectedCheckOutDateTime) {
          extraMinutes = differenceInMinutes(checkOutTime, expectedCheckOutDateTime);
        }
      } catch (e) {}
    }

    return {
      ...(attendanceRecord || {
        id: `${p.id}-${today}`,
        check_in: null,
        check_out: null,
        total_hours: null,
        check_in_reason: null,
      }),
      user_id: p.id,
      date: today,
      profiles: p as Profile,
      extra_hours: extraMinutes / 60,
    };
  });

  return (
    <AttendanceClient 
      initialData={attendanceList as any[]} 
      isEditor={isEditor} 
      currentUserId={currentUser.id}
    />
  );
}
