'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { loginSchema, type LoginInput } from '@sendit/validations'
import { adminLoginAction } from '@/app/auth/actions'

export function AdminLoginForm() {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setIsLoading(true)
    try {
      const result = await adminLoginAction(data)
      if (result?.error) {
        toast.error(result.error)
      }
    } catch (err) {
      // Next.js redirect() throws NEXT_REDIRECT — let the framework handle it
      if (
        err instanceof Error &&
        'digest' in err &&
        String((err as { digest: string }).digest).startsWith('NEXT_REDIRECT')
      ) {
        throw err
      }
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
            Email
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            placeholder="admin@sendit.com"
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-600"
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
            Password
          </label>
          <input
            {...register('password')}
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-600"
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm"
        >
          {isLoading ? 'Signing in...' : 'Sign in to Admin'}
        </button>
      </form>
    </div>
  )
}
