
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Note: this function should only be called in server-side code.
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!serviceKey || !supabaseUrl) {
    console.warn(`
****************************************************************
** WARNING: Supabase Service Role Key is not set.
** 
** Admin-level operations like archiving/banning users will not
** work. Please set SUPABASE_SERVICE_KEY in your .env file.
** You can find this key in your Supabase project settings
** under API > Project API keys > service_role.
****************************************************************
    `);
    return null;
  }
  
  return createClient<Database>(
    supabaseUrl,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
