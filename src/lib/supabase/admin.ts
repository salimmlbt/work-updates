import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Note: this function should only be called in server-side code.
export function createSupabaseAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in the environment variables. This is required for admin-level operations.')
  }
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
