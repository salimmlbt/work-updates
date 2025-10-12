'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = createServerClient()

  const username = formData.get('email') as string
  const password = formData.get('password') as string

  if (!username || !password) {
    return { error: 'Username and password are required.' }
  }

  const email = `${username}@falaq.com`;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
    const supabase = createServerClient()
    await supabase.auth.signOut()
    redirect('/login')
}
