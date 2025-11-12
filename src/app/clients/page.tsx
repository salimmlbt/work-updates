
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
    supabase.from('clients').select('*, projects(id), tasks(id, parent_task_id)').order('created_at', { ascending: false }),
    supabase.from('industries').select('*').order('name')
  ]);

  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
  }
  if (industriesError) {
    console.error('Error fetching industries:', industriesError);
  }
  
  const clientsWithCounts = (clients as any[] ?? []).map(c => ({
      ...c,
      projects_count: c.projects.length,
      tasks_count: c.tasks.filter((t: { parent_task_id: string | null }) => !t.parent_task_id).length,
      projects: undefined,
      tasks: undefined
  }));

  return <ClientsPageClient initialClients={clientsWithCounts ?? []} industries={industries as Industry[] ?? []} />;
}
