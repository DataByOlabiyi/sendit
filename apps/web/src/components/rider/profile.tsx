'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { riderProfileSchema, type RiderProfileInput } from '@sendit/validations'
import { createClient } from '@/lib/supabase/client'
import type { User, Rider } from '@sendit/types'

interface RiderProfileProps {
  profile: User
  rider: Rider
}

export function RiderProfile({ profile, rider }: RiderProfileProps) {
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<RiderProfileInput>({
    resolver: zodResolver(riderProfileSchema),
    defaultValues: {
      vehicle_type: rider.vehicle_type,
      vehicle_plate: rider.vehicle_plate,
      vehicle_model: rider.vehicle_model,
      license_number: rider.license_number,
    },
  })

  async function onSubmit(data: RiderProfileInput) {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('riders')
        .update(data)
        .eq('id', rider.id)

      if (error) throw error
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    suspended: 'bg-red-100 text-red-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
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
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[rider.status]}`}>
                {rider.status}
              </span>
              <span className="text-xs text-gray-400">⭐ {rider.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Vehicle Information</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Type</label>
            <select
              {...register('vehicle_type')}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            >
              <option value="bicycle">Bicycle</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="car">Car</option>
              <option value="van">Van</option>
            </select>
            {errors.vehicle_type && <p className="mt-1.5 text-xs text-red-500">{errors.vehicle_type.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Plate Number</label>
            <input
              {...register('vehicle_plate')}
              type="text"
              placeholder="e.g. ABC-123-XY"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
            />
            {errors.vehicle_plate && <p className="mt-1.5 text-xs text-red-500">{errors.vehicle_plate.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Model</label>
            <input
              {...register('vehicle_model')}
              type="text"
              placeholder="e.g. Honda CB500"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
            />
            {errors.vehicle_model && <p className="mt-1.5 text-xs text-red-500">{errors.vehicle_model.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">License Number</label>
            <input
              {...register('license_number')}
              type="text"
              placeholder="Driver's license number"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
            />
            {errors.license_number && <p className="mt-1.5 text-xs text-red-500">{errors.license_number.message}</p>}
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

      {/* Stats */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Performance</h2>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{rider.total_deliveries}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Deliveries</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">⭐ {rider.rating.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Average Rating</p>
          </div>
        </div>
      </div>
    </div>
  )
}
