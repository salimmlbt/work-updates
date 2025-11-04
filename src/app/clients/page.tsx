
import { createServerClient } from '@/lib/supabase/server';
import ClientsPageClient from './clients-page-client';
import type { Industry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const supabase = await createServerClient();
  const [
    { data: clients, error: clientsError },
    { data: industries, error: industriesError }
  ] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('industries').select('*').order('name')
  ]);

  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
  }
  if (industriesError) {
    console.error('Error fetching industries:', industriesError);
  }

  return <ClientsPageClient initialClients={clients ?? []} industries={industries as Industry[] ?? []} />;
}
