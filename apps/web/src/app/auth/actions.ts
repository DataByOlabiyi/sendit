'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  type LoginInput,
  type RegisterInput,
} from '@sendit/validations'
import {
  checkLoginRate,
  checkRegisterRate,
  checkForgotRate,
  recordLoginFailure,
  resetLoginFailures,
  isAccountLocked,
} from '@/lib/rate-limit'
import { logAuthEvent } from '@/lib/auth-audit'
import { sendAccountLockoutEmail } from '@/lib/security-email'

async function getClientIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'
}

export async function loginAction(data: LoginInput) {
  // Server-side validation — TypeScript types are erased at runtime; a direct
  // HTTP caller can bypass client-side Zod entirely without this check.
  const parsed = loginSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Incorrect email or password.' }
  }

  const ip = await getClientIp()
  const email = parsed.data.email

  // Check sliding-window rate limit first (fast path)
  const rateAllowed = await checkLoginRate(ip, email)
  if (!rateAllowed) {
    void logAuthEvent({ event: 'auth.rate_limit_hit', email, ip })
    return { error: 'Too many login attempts. Please try again later.' }
  }

  // Check consecutive-failure lockout (15-min hard lock after 5 failures)
  const locked = await isAccountLocked(email)
  if (locked) {
    // Return the same generic message — do not reveal lockout state to caller
    return { error: 'Incorrect email or password.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  })

  if (error) {
    const { locked: nowLocked, firstLockout } = await recordLoginFailure(email)
    void logAuthEvent({ event: 'auth.login_failure', email, ip })
    if (firstLockout) {
      void logAuthEvent({ event: 'auth.lockout', email, ip })
      void sendAccountLockoutEmail(email)
    }
    // Suppress lockout state from caller — always return the same message
    void nowLocked
    return { error: 'Incorrect email or password.' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Incorrect email or password.' }

  // Successful login — clear failure counter and log the event
  await resetLoginFailures(email)
  void logAuthEvent({ event: 'auth.login_success', email, userId: user.id, ip })

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

export async function registerAction(data: RegisterInput, referralCode?: string) {
  const parsed = registerSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Registration failed. Please check your details and try again.' }
  }

  const ip = await getClientIp()
  const allowed = await checkRegisterRate(ip)
  if (!allowed) {
    return { error: 'Too many requests. Please try again later.' }
  }

  const supabase = await createClient()

  const { data: authData, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
        : undefined,
      data: {
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        // Only 'customer' and 'rider' are forwarded; the handle_new_user trigger
        // ignores any other value and defaults to 'customer'.
        role: parsed.data.role === 'rider' ? 'rider' : 'customer',
      },
    },
  })

  if (error) {
    return { error: 'Registration failed. Please try again.' }
  }

  if (!authData.user) {
    return { error: 'Registration failed. Please try again.' }
  }

  // Supabase returns a stub user with empty identities when the email already
  // exists and email confirmation is enabled — no verification email is sent.
  // Return success anyway to prevent enumeration of registered addresses.
  if ((authData.user.identities?.length ?? 0) === 0) {
    return { success: true }
  }

  void logAuthEvent({
    event: 'auth.register_success',
    email: parsed.data.email,
    userId: authData.user.id,
    ip,
  })

  // Apply referral code — fail silently so a bad/expired code never blocks signup.
  if (referralCode && referralCode.trim().length > 0) {
    const { data: referrer } = await supabase
      .from('users')
      .select('id')
      .eq('referral_code', referralCode.trim().toUpperCase())
      .maybeSingle()

    if (referrer && referrer.id !== authData.user.id) {
      await supabase
        .from('users')
        .update({ referred_by: referrer.id })
        .eq('id', authData.user.id)
    }
  }

  return { success: true }
}

export async function logoutAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const ip = await getClientIp()
  void logAuthEvent({ event: 'auth.logout', userId: user?.id, ip })
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

export async function forgotPasswordAction(email: string) {
  const parsed = forgotPasswordSchema.safeParse({ email })
  if (!parsed.success) {
    // Always return success to prevent email enumeration regardless of input validity
    return { success: true }
  }

  const ip = await getClientIp()
  const allowed = await checkForgotRate(parsed.data.email)
  if (!allowed) {
    return { success: true }
  }

  const supabase = await createClient()

  // Attempt the reset regardless — do not surface whether the email exists.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password`
      : undefined,
  })

  void logAuthEvent({ event: 'auth.password_reset_requested', email: parsed.data.email, ip })

  return { success: true }
}

export async function resetPasswordAction(password: string) {
  if (typeof password !== 'string' || password.length < 12) {
    return { error: 'Password must be at least 12 characters.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const ip = await getClientIp()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    if (error.message.toLowerCase().includes('different from the old password')) {
      return { error: 'Your new password must be different from your current password.' }
    }
    return { error: 'Unable to update your password. Please request a new reset link.' }
  }

  void logAuthEvent({ event: 'auth.password_reset_completed', userId: user?.id, ip })

  redirect('/dashboard')
}
