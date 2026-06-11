'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { updateProfileSchema, type UpdateProfileInput } from '@sendit/validations'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@sendit/types'

interface ProfileFormProps {
  profile: User
  orderCount: number
  addressCount: number
}

export function ProfileForm({ profile, orderCount, addressCount }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      full_name: profile.full_name,
      phone: profile.phone ?? '',
    },
  })

  async function onSubmit(data: UpdateProfileInput) {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({ full_name: data.full_name, phone: data.phone })
        .eq('id', profile.id)
      if (error) throw error
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePasswordReset() {
    setIsSendingReset(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email)
      if (error) throw error
      toast.success('Password reset email sent — check your inbox')
    } catch {
      toast.error('Failed to send reset email')
    } finally {
      setIsSendingReset(false)
    }
  }

  async function handleDeleteAccount() {
    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('users').update({ is_active: false }).eq('id', profile.id)
      if (error) throw error
      await supabase.auth.signOut()
      router.push('/')
    } catch {
      toast.error('Failed to deactivate account')
      setIsDeleting(false)
    }
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-NG', {
    month: 'short',
    year: 'numeric',
  })

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-6 lg:items-start">

      {/* ── Left: Avatar + Stats ── */}
      <div className="space-y-4 mb-4 lg:mb-0">
        {/* Avatar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <div className="w-20 h-20 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-bold text-orange-500">{initials}</span>
          </div>
          <p className="font-semibold text-gray-900">{profile.full_name}</p>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{profile.email}</p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 mt-2 capitalize">
            {profile.role}
          </span>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">Total Orders</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{orderCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">Saved Addresses</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{addressCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">Member Since</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{memberSince}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Forms ── */}
      <div className="space-y-4">
        {/* Personal Information */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Personal Information</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                {...register('full_name')}
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
              {errors.full_name && <p className="mt-1.5 text-xs text-red-500">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="08012345678"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
              {errors.phone && <p className="mt-1.5 text-xs text-red-500">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="mt-1.5 text-xs text-gray-400">Email cannot be changed</p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isDirty}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm"
            >
              {isLoading ? 'Saving…' : 'Save Changes'}
            </button>
            {!isDirty && (
              <p className="text-xs text-center text-gray-400">No changes to save</p>
            )}
          </form>
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Security</h2>
          <p className="text-xs text-gray-400 mb-4">A password reset link will be sent to your email</p>
          <button
            onClick={handlePasswordReset}
            disabled={isSendingReset}
            type="button"
            className="w-full py-3 border border-gray-200 hover:border-gray-300 disabled:opacity-60 text-gray-700 font-semibold rounded-xl transition text-sm"
          >
            {isSendingReset ? 'Sending…' : 'Send Password Reset Email'}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <h2 className="text-sm font-semibold text-red-600 mb-1">Danger Zone</h2>
          <p className="text-xs text-gray-400 mb-4">
            Deactivating your account will prevent access. Contact support to reactivate.
          </p>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full py-3 border border-red-200 hover:border-red-400 text-red-600 font-semibold rounded-xl transition text-sm"
            >
              Deactivate Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-red-500">Are you sure? You will be signed out immediately.</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
                >
                  {isDeleting ? 'Deactivating…' : 'Yes, Deactivate'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
