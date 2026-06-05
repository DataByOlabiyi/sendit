'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { packageDetailsSchema, type PackageDetailsInput } from '@sendit/validations'
import { PACKAGE_SIZE_LABELS } from '@sendit/constants'
import type { BookingData } from './booking-flow'
import type { PackageSize } from '@sendit/types'

interface StepPackageProps {
  data: BookingData
  onUpdate: (data: Partial<BookingData>) => void
  onNext: () => void
  onBack: () => void
}

const sizeOptions: { value: PackageSize; emoji: string }[] = [
  { value: 'small', emoji: '📦' },
  { value: 'medium', emoji: '🎒' },
  { value: 'large', emoji: '🗃️' },
  { value: 'extra_large', emoji: '🚐' },
]

export function StepPackage({ data, onUpdate, onNext, onBack }: StepPackageProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PackageDetailsInput>({
    resolver: zodResolver(packageDetailsSchema),
    defaultValues: {
      package_description: data.package_description ?? '',
      package_size: data.package_size ?? 'small',
      is_fragile: data.is_fragile ?? false,
      has_insurance: data.has_insurance ?? false,
      special_instructions: data.special_instructions ?? '',
    },
  })

  const selectedSize = watch('package_size')
  const isFragile = watch('is_fragile')
  const hasInsurance = watch('has_insurance')

  function onSubmit(formData: PackageDetailsInput) {
    onUpdate(formData)
    onNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Package Details</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              What are you sending?
            </label>
            <input
              {...register('package_description')}
              type="text"
              placeholder="e.g. Documents, Clothes, Electronics"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
            />
            {errors.package_description && (
              <p className="mt-1.5 text-xs text-red-500">{errors.package_description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Package Size</label>
            <div className="grid grid-cols-2 gap-2">
              {sizeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                    selectedSize === option.value
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    value={option.value}
                    {...register('package_size')}
                    className="sr-only"
                  />
                  <span className="text-xl">{option.emoji}</span>
                  <div>
                    <p className={`text-xs font-semibold capitalize ${selectedSize === option.value ? 'text-orange-600' : 'text-gray-700'}`}>
                      {option.value.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">
                      {PACKAGE_SIZE_LABELS[option.value].split('(')[1]?.replace(')', '') ?? ''}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-gray-700">Fragile item</p>
                  <p className="text-xs text-gray-400">Rider will handle with extra care</p>
                </div>
              </div>
              <div
                onClick={() => setValue('is_fragile', !isFragile)}
                className={`w-11 h-6 rounded-full transition cursor-pointer ${isFragile ? 'bg-orange-500' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow m-0.5 transition-transform ${isFragile ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-lg">🛡️</span>
                <div>
                  <p className="text-sm font-medium text-gray-700">Add Insurance</p>
                  <p className="text-xs text-gray-400">+₦200 coverage for your package</p>
                </div>
              </div>
              <div
                onClick={() => setValue('has_insurance', !hasInsurance)}
                className={`w-11 h-6 rounded-full transition cursor-pointer ${hasInsurance ? 'bg-orange-500' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow m-0.5 transition-transform ${hasInsurance ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Special Instructions <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              {...register('special_instructions')}
              rows={3}
              placeholder="Any special handling instructions for the rider..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400 resize-none"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 transition"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl transition"
        >
          Review Order
        </button>
      </div>
    </form>
  )
}
