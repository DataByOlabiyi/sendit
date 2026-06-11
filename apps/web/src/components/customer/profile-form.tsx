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

  const { register, handleSubmit, formState: { errors } } = useForm<UpdateProfileInput>({
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
      toast.success('Profile updated successfully')
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
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', profile.id)
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

  return (
    <div className="space-y-4">
      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-orange-500">
              {profile.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{profile.full_name}</p>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 mt-1 capitalize">
              {profile.role}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
          <div className="px-4">
            <p className="text-2xl font-bold text-gray-900">{orderCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Orders</p>
          </div>
          <div className="px-4">
            <p className="text-2xl font-bold text-gray-900">{addressCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Saved Addresses</p>
          </div>
          <div className="px-4">
            <p className="text-base font-bold text-gray-900">{memberSince}</p>
            <p className="text-xs text-gray-500 mt-0.5">Member Since</p>
          </div>
        </div>
      </div>

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
            disabled={isLoading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
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
          {isSendingReset ? 'Sending...' : 'Send Password Reset Email'}
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
                {isDeleting ? 'Deactivating...' : 'Yes, Deactivate'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
