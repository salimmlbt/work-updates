import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export function createServerClient() {
  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookieStore = cookies()
          const cookie = cookieStore.get(name)
          return cookie?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          const cookieStore = cookies()
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          const cookieStore = cookies()
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )
}
