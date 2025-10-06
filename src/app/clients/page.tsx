
import { createServerClient } from '@/lib/supabase/server';
import ClientsPageClient from './clients-page-client';

export default async function ClientsPage() {
  const supabase = createServerClient();
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching clients:', error);
    // Optionally return an error message to the user
  }

  return <ClientsPageClient initialClients={clients ?? []} />;
}
