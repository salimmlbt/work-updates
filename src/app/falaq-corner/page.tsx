import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile, RoleWithPermissions, LeaveTypeConfig } from '@/lib/types';
import FalaqCornerClient from './falaq-corner-client';

/**
 * FALAQ CORNER - MAIN HUB (SERVER COMPONENT)
 */

export const dynamic = 'force-dynamic';

export default async function FalaqCornerPage() {
  const supabase = await createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect('/login');

  const [
    { data: profile },
    { data: allowanceSetting },
    { data: leaveConfigSetting }
  ] = await Promise.all([
    supabase.from('profiles').select('*, roles(*)').eq('id', authUser.id).single(),
    supabase.from('app_settings').select('value').eq('key', 'annual_leave_allowance').single(),
    supabase.from('app_settings').select('value').eq('key', 'leave_types_config').single()
  ]);

  const permissions = (profile?.roles as RoleWithPermissions)?.permissions || {};
  const isFalaqAdmin = profile?.roles?.name === 'Falaq Admin';

  if (!isFalaqAdmin && permissions.falaq_corner === 'Restricted') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4 bg-[#0f0f0f]">
        <div className="h-20 w-20 rounded-[2rem] bg-rose-500/10 flex items-center justify-center mb-6 shadow-2xl">
            <span className="text-3xl">🚫</span>
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Access Forbidden</h2>
        <p className="text-zinc-500 mt-2 font-medium">Your role does not have authorization to enter the Falaq Corner.</p>
      </div>
    );
  }

  const annualAllowance = (allowanceSetting?.value as number | undefined) || 28;
  const leaveTypesConfig = (leaveConfigSetting?.value as LeaveTypeConfig[] | undefined) || [
    { id: '1', label: 'Annual Leave', leadTime: 0, color: 'purple' },
    { id: '2', label: 'Casual Leave', leadTime: 2, color: 'blue' },
    { id: '3', label: 'Sick Leave', leadTime: 0, color: 'emerald' },
    { id: '4', label: 'Special WFH', leadTime: 0, color: 'amber' }
  ];

  return (
    <div className="p-4 md:p-8 lg:p-10 min-h-screen bg-[#0f0f0f]">
      <FalaqCornerClient 
        profile={profile as Profile} 
        annualAllowance={annualAllowance}
        leaveTypesConfig={leaveTypesConfig}
      />
    </div>
  );
}
