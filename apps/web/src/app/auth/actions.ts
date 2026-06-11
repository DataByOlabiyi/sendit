'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { LoginInput, RegisterInput } from '@sendit/validations'

export async function loginAction(data: LoginInput) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    if (error.message === 'Email not confirmed') {
      return {
        error:
          'Please check your email inbox and click the verification link before signing in.',
      }
    }
    return { error: error.message }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication failed.' }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  revalidatePath('/', 'layout')

  if (profile?.role === 'rider') {
    redirect('/rider/dashboard')
  }
  redirect('/dashboard')
}

export async function registerAction(data: RegisterInput) {
  const supabase = await createClient()

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: {
        full_name: data.full_name,
        phone: data.phone,
        // Only 'customer' and 'rider' are forwarded; the handle_new_user trigger
        // ignores any other value and defaults to 'customer'.
        role: data.role === 'rider' ? 'rider' : 'customer',
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (!authData.user) {
    return { error: 'Registration failed. Please try again.' }
  }

  return { success: true }
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

export async function forgotPasswordAction(email: string) {
  const supabase = await createClient()

  // Attempt the reset regardless — do not surface whether the email exists.
  // Returning different responses for registered vs unregistered emails
  // allows enumeration of valid accounts.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password`,
  })

  // Always return success to prevent email enumeration
  return { success: true }
}

export async function resetPasswordAction(password: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}
