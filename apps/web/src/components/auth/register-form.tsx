'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { registerSchema, type RegisterInput } from '@sendit/validations'
import { registerAction } from '@/app/auth/actions'

export function RegisterForm({ initialRole = 'customer' }: { initialRole?: 'customer' | 'rider' }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: initialRole },
  })

  const role = watch('role')

  async function onSubmit(data: RegisterInput) {
    setIsLoading(true)
    try {
      const result = await registerAction(data)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Account created! Please check your email to verify your account.')
        router.push('/auth/login')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-3">
          <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition ${role === 'customer' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <input {...register('role')} type="radio" value="customer" className="sr-only" />
            <svg className={`w-6 h-6 mb-2 ${role === 'customer' ? 'text-orange-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className={`text-sm font-medium ${role === 'customer' ? 'text-orange-600' : 'text-gray-600'}`}>Customer</span>
            <span className="text-xs text-gray-400 mt-0.5">Send packages</span>
          </label>
          <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition ${role === 'rider' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <input {...register('role')} type="radio" value="rider" className="sr-only" />
            <svg className={`w-6 h-6 mb-2 ${role === 'rider' ? 'text-orange-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className={`text-sm font-medium ${role === 'rider' ? 'text-orange-600' : 'text-gray-600'}`}>Rider</span>
            <span className="text-xs text-gray-400 mt-0.5">Deliver packages</span>
          </label>
        </div>

        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
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
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
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
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
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
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <input
            {...register('password')}
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
          />
          {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
          <input
            {...register('confirm_password')}
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
          />
          {errors.confirm_password && <p className="mt-1.5 text-xs text-red-500">{errors.confirm_password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm"
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-orange-500 hover:text-orange-600 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  )
}
