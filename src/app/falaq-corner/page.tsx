
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile, RoleWithPermissions } from '@/lib/types';
import FalaqCornerClient from './falaq-corner-client';

export const dynamic = 'force-dynamic';

export default async function FalaqCornerPage() {
  const supabase = await createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, roles(*)')
    .eq('id', authUser.id)
    .single();

  const permissions = (profile?.roles as RoleWithPermissions)?.permissions || {};
  const isFalaqAdmin = profile?.roles?.name === 'Falaq Admin';

  if (!isFalaqAdmin && permissions.falaq_corner === 'Restricted') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500">You do not have permission to view Falaq Corner.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 min-h-screen bg-[#0f0f0f]">
      <FalaqCornerClient profile={profile as Profile} />
    </div>
  );
}
