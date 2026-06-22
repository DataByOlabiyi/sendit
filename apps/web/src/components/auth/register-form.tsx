'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { toast } from 'sonner'
import { registerSchema, type RegisterInput } from '@sendit/validations'
import { registerAction } from '@/app/auth/actions'
import { createClient } from '@/lib/supabase/client'

type Role = 'customer' | 'rider'

interface RegisterFormProps {
  initialRole?: Role
  skipRolePicker?: boolean
  referralCode?: string
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

export function RegisterForm({ initialRole = 'customer', skipRolePicker = false, referralCode }: RegisterFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(skipRolePicker ? 2 : 1)
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole)
  const [isLoading, setIsLoading] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resending, setResending] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: initialRole },
  })

  function handleRoleSelect(role: Role) {
    setSelectedRole(role)
    setValue('role', role)
    setStep(2)
  }

  async function onSubmit(data: RegisterInput) {
    setIsLoading(true)
    try {
      const result = await registerAction(data, referralCode)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setRegisteredEmail(data.email)
        setStep(3)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
            : undefined,
        },
      })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Verification email resent!')
      }
    } catch {
      toast.error('Could not resend email.')
    } finally {
      setResending(false)
    }
  }

  /* ─── Step 1: Role picker ─── */
  if (step === 1) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Join SendIt</h1>
          <p className="text-sm text-gray-500 mt-1">How will you use SendIt?</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleRoleSelect('customer')}
            className="group flex flex-col items-start p-6 rounded-2xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50/40 transition-all text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-4 group-hover:bg-orange-200 transition">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Send a package</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Book deliveries, track in real-time, send anything anywhere.
            </p>
            <div className="mt-5 flex items-center gap-1.5 text-orange-500 text-sm font-semibold">
              Get started
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSelect('rider')}
            className="group flex flex-col items-start p-6 rounded-2xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50/40 transition-all text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 group-hover:bg-orange-100 transition">
              <svg className="w-6 h-6 text-gray-500 group-hover:text-orange-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Become a rider</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Earn on your schedule delivering packages across your city.
            </p>
            <div className="mt-5 flex items-center gap-1.5 text-orange-500 text-sm font-semibold">
              Start earning
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-orange-500 hover:text-orange-600 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  /* ─── Step 3: Email sent ─── */
  if (step === 3) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</h1>
        <p className="text-sm text-gray-500 mb-1">We sent a verification link to</p>
        <p className="text-sm font-semibold text-gray-800 mb-6">{registeredEmail}</p>

        <div className="bg-orange-50 rounded-2xl p-4 text-left mb-6">
          <p className="text-sm text-orange-800 leading-relaxed">
            Click the link in the email to verify your account. Check your spam folder if you don&apos;t see it within a minute.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-orange-500 hover:text-orange-600 font-medium disabled:opacity-60 transition"
        >
          {resending ? 'Sending…' : "Didn't receive it? Resend email"}
        </button>

        <p className="text-sm text-gray-400 mt-6">
          Wrong email?{' '}
          <button
            type="button"
            onClick={() => setStep(skipRolePicker ? 2 : 1)}
            className="text-gray-600 hover:text-gray-800 font-medium transition"
          >
            Go back
          </button>
        </p>
      </div>
    )
  }

  /* ─── Step 2: Registration form ─── */
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {!skipRolePicker && (
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}

      {referralCode && (
        <div className="mb-4 flex items-center gap-2.5 p-3 bg-green-50 border border-green-200 rounded-xl">
          <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h3.5" />
          </svg>
          <p className="text-xs text-green-700 font-medium">You were referred by a friend — you&apos;ll both earn rewards after your first delivery!</p>
        </div>
      )}

      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold mb-3">
          {selectedRole === 'customer' ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Customer account
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
              </svg>
              Rider account
            </>
          )}
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="text-sm text-gray-500 mt-1">
          {selectedRole === 'rider'
            ? 'Start earning with SendIt today'
            : 'Start sending packages today'}
        </p>
      </div>

      <input type="hidden" {...register('role')} />

      <div className="space-y-4">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Full name
          </label>
          <input
            {...register('full_name')}
            id="full_name"
            type="text"
            autoComplete="name"
            placeholder="John Doe"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
          />
          {errors.full_name && <p className="mt-1.5 text-xs text-red-500">{errors.full_name.message}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email address
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
          />
          {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone number
          </label>
          <input
            {...register('phone')}
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="08012345678"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
          />
          {errors.phone && <p className="mt-1.5 text-xs text-red-500">{errors.phone.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              tabIndex={-1}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Confirm password
          </label>
          <div className="relative">
            <input
              {...register('confirm_password')}
              id="confirm_password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              tabIndex={-1}
            >
              <EyeIcon open={showConfirmPassword} />
            </button>
          </div>
          {errors.confirm_password && (
            <p className="mt-1.5 text-xs text-red-500">{errors.confirm_password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition"
        >
          {isLoading ? 'Creating account…' : 'Create account'}
        </button>
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-orange-500 hover:text-orange-600 font-medium">
          Sign in
        </Link>
      </p>
    </form>
  )
}
