'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { riderProfileSchema, type RiderProfileInput } from '@sendit/validations'
import { createRiderProfileAction } from '@/app/rider/actions'

export function RiderOnboardingForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm<RiderProfileInput>({
    resolver: zodResolver(riderProfileSchema),
    defaultValues: { vehicle_type: 'motorcycle' },
  })

  async function onSubmit(data: RiderProfileInput) {
    setIsLoading(true)
    try {
      const result = await createRiderProfileAction(data)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Profile created! Awaiting admin approval.')
        router.push('/rider/dashboard')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Type</label>
          <select
            {...register('vehicle_type')}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          >
            <option value="bicycle">🚲 Bicycle</option>
            <option value="motorcycle">🏍️ Motorcycle</option>
            <option value="car">🚗 Car</option>
            <option value="van">🚐 Van</option>
          </select>
          {errors.vehicle_type && <p className="mt-1.5 text-xs text-red-500">{errors.vehicle_type.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Plate Number</label>
          <input
            {...register('vehicle_plate')}
            type="text"
            placeholder="e.g. ABC-123-XY"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
          />
          {errors.vehicle_plate && <p className="mt-1.5 text-xs text-red-500">{errors.vehicle_plate.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Model</label>
          <input
            {...register('vehicle_model')}
            type="text"
            placeholder="e.g. Honda CB500, Toyota Camry"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
          />
          {errors.vehicle_model && <p className="mt-1.5 text-xs text-red-500">{errors.vehicle_model.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">License Number</label>
          <input
            {...register('license_number')}
            type="text"
            placeholder="Driver's license number"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
          />
          {errors.license_number && <p className="mt-1.5 text-xs text-red-500">{errors.license_number.message}</p>}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-xs text-yellow-700">
            <strong>Note:</strong> Your account will be reviewed by an admin before you can start accepting orders. This usually takes 24-48 hours.
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
        >
          {isLoading ? 'Submitting...' : 'Submit for Review'}
        </button>
      </form>
    </div>
  )
}
