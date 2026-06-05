'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { updateProfileSchema, type UpdateProfileInput } from '@sendit/validations'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@sendit/types'

interface ProfileFormProps {
  profile: User
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)

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

      {/* Form */}
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
    </div>
  )
}
