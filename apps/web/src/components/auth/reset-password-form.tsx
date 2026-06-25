'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { resetPasswordSchema, type ResetPasswordInput } from '@sendit/validations'
import { resetPasswordAction } from '@/app/auth/actions'

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  })

  async function onSubmit(data: ResetPasswordInput) {
    setIsLoading(true)
    try {
      const result = await resetPasswordAction(data.password)
      if (result?.error) {
        toast.error(result.error)
      }
    } catch (err) {
      if (err instanceof Error && 'digest' in err && String((err as { digest: string }).digest).startsWith('NEXT_REDIRECT')) {
        throw err
      }
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            New password
          </label>
          <input
            {...register('password')}
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Min. 12 characters"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Confirm new password
          </label>
          <input
            {...register('confirm_password')}
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
          />
          {errors.confirm_password && (
            <p className="mt-1.5 text-xs text-red-500">{errors.confirm_password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm"
        >
          {isLoading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
