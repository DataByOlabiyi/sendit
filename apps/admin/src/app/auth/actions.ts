'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, type LoginInput } from '@sendit/validations'
import {
  checkAdminLoginRate,
  recordAdminLoginFailure,
  resetAdminLoginFailures,
  isAdminAccountLocked,
} from '@/lib/rate-limit'
import { logAuthEvent } from '@/lib/auth-audit'
import { sendAdminLockoutEmail } from '@/lib/security-email'

async function getClientIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'
}

export async function adminLoginAction(data: LoginInput) {
  const parsed = loginSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Incorrect email or password.' }
  }

  const ip = await getClientIp()
  const email = parsed.data.email

  const rateAllowed = await checkAdminLoginRate(ip, email)
  if (!rateAllowed) {
    void logAuthEvent({ event: 'auth.admin_rate_limit_hit', email, ip })
    return { error: 'Too many login attempts. Please try again later.' }
  }

  const locked = await isAdminAccountLocked(email)
  if (locked) {
    return { error: 'Incorrect email or password.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  })

  if (error) {
    const { firstLockout } = await recordAdminLoginFailure(email)
    void logAuthEvent({ event: 'auth.admin_login_failure', email, ip })
    if (firstLockout) {
      void logAuthEvent({ event: 'auth.admin_lockout', email, ip })
      void sendAdminLockoutEmail(email)
    }
    return { error: 'Incorrect email or password.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Incorrect email or password.' }

  await resetAdminLoginFailures(email)

  // Check MFA assurance level — if admin has TOTP enrolled, redirect to MFA challenge
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    void logAuthEvent({ event: 'auth.admin_login_success', email, userId: user.id, ip, metadata: { mfa_required: true } })
    redirect('/auth/mfa')
  }

  void logAuthEvent({ event: 'auth.admin_login_success', email, userId: user.id, ip })
  redirect('/dashboard')
}

export async function adminMfaVerifyAction(code: string) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return { error: 'Enter the 6-digit code from your authenticator app.' }
  }

  const supabase = await createClient()
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totp = factors?.totp?.[0]

  if (!totp) {
    return { error: 'No authenticator app enrolled. Please set up MFA in Settings.' }
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: totp.id,
    code,
  })

  if (error) {
    return { error: 'Invalid code. Please try again.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  const ip = await getClientIp()
  void logAuthEvent({ event: 'auth.admin_mfa_verified', userId: user?.id, ip })

  redirect('/dashboard')
}

export async function adminMfaEnrollAction() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })

  if (error || !data) {
    return { error: 'Could not start MFA setup. Please try again.' }
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  }
}

export async function adminMfaConfirmAction(factorId: string, code: string) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return { error: 'Enter the 6-digit code from your authenticator app.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })

  if (error) {
    return { error: 'Invalid code — scan the QR code again and try a fresh code.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  const ip = await getClientIp()
  void logAuthEvent({ event: 'auth.admin_mfa_enrolled', userId: user?.id, ip })

  return { success: true }
}

export async function adminMfaUnenrollAction(factorId: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.mfa.unenroll({ factorId })

  if (error) {
    return { error: 'Could not remove MFA. Please try again.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  const ip = await getClientIp()
  void logAuthEvent({ event: 'auth.admin_mfa_unenrolled', userId: user?.id, ip })

  return { success: true }
}

export async function adminLogoutAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const ip = await getClientIp()
  void logAuthEvent({ event: 'auth.admin_logout', userId: user?.id, ip })
  await supabase.auth.signOut()
  redirect('/auth/login')
}
