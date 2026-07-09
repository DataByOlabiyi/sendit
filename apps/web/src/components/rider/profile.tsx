'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { formatCurrency } from '@sendit/utils'
import {
  updateProfileSchema, type UpdateProfileInput,
  riderProfileSchema, type RiderProfileInput,
  riderBankAccountSchema, type RiderBankAccountInput,
  riderKycSchema, type RiderKycInput,
} from '@sendit/validations'
import { createClient } from '@/lib/supabase/client'
import { submitRiderKycAction } from '@/app/rider/profile-actions'
import { PasswordInput, PushNotificationToggle } from '@sendit/ui'
import type { User, Rider } from '@sendit/types'

const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Ecobank', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank', code: '011' },
  { name: 'FCMB', code: '214' },
  { name: 'GTBank', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Kuda Bank', code: '090267' },
  { name: 'Moniepoint', code: '50515' },
  { name: 'Opay', code: '100004' },
  { name: 'PalmPay', code: '100033' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC', code: '221' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Titan Trust Bank', code: '102' },
  { name: 'UBA', code: '033' },
  { name: 'Union Bank', code: '032' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
]

const kycStatusConfig = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
  submitted: { label: 'Under Review', className: 'bg-blue-100 text-blue-700' },
  verified: { label: 'Verified', className: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
}

const riderStatusConfig = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
}

interface RiderWallet {
  balance: number
  total_earned: number
  total_paid: number
}

interface RiderProfileProps {
  profile: User
  rider: Rider
  wallet?: RiderWallet
}

export function RiderProfile({ profile, rider, wallet }: RiderProfileProps) {
  const [personalLoading, setPersonalLoading] = useState(false)
  const [vehicleLoading, setVehicleLoading] = useState(false)
  const [bankLoading, setBankLoading] = useState(false)
  const [kycLoading, setKycLoading] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)

  const personalForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { full_name: profile.full_name, phone: profile.phone ?? '' },
  })

  const vehicleForm = useForm<RiderProfileInput>({
    resolver: zodResolver(riderProfileSchema),
    defaultValues: {
      vehicle_type: rider.vehicle_type,
      vehicle_plate: rider.vehicle_plate,
      vehicle_model: rider.vehicle_model,
      license_number: rider.license_number,
    },
  })

  const bankForm = useForm<RiderBankAccountInput>({
    resolver: zodResolver(riderBankAccountSchema),
    defaultValues: {
      bank_account_number: rider.bank_account_number ?? '',
      bank_code: rider.bank_code ?? '',
      bank_name: rider.bank_name ?? '',
      bank_account_name: rider.bank_account_name ?? '',
    },
  })

  const kycForm = useForm<RiderKycInput>({
    resolver: zodResolver(riderKycSchema),
    defaultValues: { bvn: rider.bvn ?? '', nin: rider.nin ?? '' },
  })

  async function savePersonalInfo(data: UpdateProfileInput) {
    setPersonalLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({ full_name: data.full_name, phone: data.phone })
        .eq('id', profile.id)
      if (error) throw error
      toast.success('Personal info updated')
    } catch {
      toast.error('Failed to update personal info')
    } finally {
      setPersonalLoading(false)
    }
  }

  async function saveVehicleInfo(data: RiderProfileInput) {
    setVehicleLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('riders').update(data).eq('id', rider.id)
      if (error) throw error
      toast.success('Vehicle info updated')
    } catch {
      toast.error('Failed to update vehicle info')
    } finally {
      setVehicleLoading(false)
    }
  }

  async function saveBankDetails(data: RiderBankAccountInput) {
    setBankLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('riders').update(data).eq('id', rider.id)
      if (error) throw error
      toast.success('Bank details saved')
    } catch {
      toast.error('Failed to save bank details')
    } finally {
      setBankLoading(false)
    }
  }

  async function saveKyc(data: RiderKycInput) {
    setKycLoading(true)
    try {
      const result = await submitRiderKycAction(data)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('KYC submitted for review')
    } catch {
      toast.error('Failed to submit KYC')
    } finally {
      setKycLoading(false)
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

  const kyc = kycStatusConfig[rider.kyc_status]
  const memberSince = new Date(rider.created_at).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
  const initials = profile.full_name.charAt(0).toUpperCase()

  return (
    <div className="space-y-4">

      {/* Identity header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-5">
          <div aria-hidden="true" className="w-20 h-20 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
            <span className="text-3xl font-bold text-orange-500">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-lg truncate">{profile.full_name}</p>
            <p className="text-sm text-gray-500 truncate">{profile.email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${riderStatusConfig[rider.status]}`}>
                {rider.status}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${kyc.className}`}>
                KYC: {kyc.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 capitalize">
              {rider.vehicle_type} · {rider.vehicle_plate || 'No plate set'}
            </p>
          </div>
        </div>
      </div>

      {/* Performance stats */}
      <div
        role="list"
        className="grid grid-cols-2 gap-px bg-gray-100 rounded-2xl overflow-hidden sm:grid-cols-4"
      >
        <div role="listitem" className="bg-white flex flex-col items-center justify-center py-5 px-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{rider.total_deliveries}</p>
          <p className="text-xs text-gray-500 mt-1">Deliveries</p>
        </div>
        <div role="listitem" className="bg-white flex flex-col items-center justify-center py-5 px-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{rider.rating.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-1">Rating</p>
        </div>
        <div role="listitem" className="bg-white flex flex-col items-center justify-center py-5 px-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency((wallet?.total_earned ?? 0) / 100)}</p>
          <p className="text-xs text-gray-500 mt-1">Total Earned</p>
        </div>
        <div role="listitem" className="bg-white flex flex-col items-center justify-center py-5 px-4 text-center">
          <p className="text-base font-bold text-gray-900">{memberSince}</p>
          <p className="text-xs text-gray-500 mt-1">Member Since</p>
        </div>
      </div>

      {/* Earnings */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900">Earnings</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Your lifetime earnings and payout history</p>

        <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500">Available Balance</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency((wallet?.balance ?? 0) / 100)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-400">Total Earned</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{formatCurrency((wallet?.total_earned ?? 0) / 100)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-400">Total Paid Out</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{formatCurrency((wallet?.total_paid ?? 0) / 100)}</p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Update your name and phone number</p>
        <form onSubmit={personalForm.handleSubmit(savePersonalInfo)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input
              {...personalForm.register('full_name')}
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
            {personalForm.formState.errors.full_name && (
              <p className="mt-1.5 text-xs text-red-500">{personalForm.formState.errors.full_name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
            <input
              {...personalForm.register('phone')}
              type="tel"
              placeholder="08012345678"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
            {personalForm.formState.errors.phone && (
              <p className="mt-1.5 text-xs text-red-500">{personalForm.formState.errors.phone.message}</p>
            )}
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
            disabled={personalLoading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {personalLoading ? 'Saving…' : 'Save Personal Info'}
          </button>
        </form>
      </div>

      {/* Vehicle Information */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900">Vehicle Information</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Keep your vehicle details up to date</p>
        <form onSubmit={vehicleForm.handleSubmit(saveVehicleInfo)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Type</label>
            <select
              {...vehicleForm.register('vehicle_type')}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            >
              <option value="bicycle">Bicycle</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="car">Car</option>
              <option value="van">Van</option>
            </select>
            {vehicleForm.formState.errors.vehicle_type && (
              <p className="mt-1.5 text-xs text-red-500">{vehicleForm.formState.errors.vehicle_type.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Plate Number</label>
            <input
              {...vehicleForm.register('vehicle_plate')}
              type="text"
              placeholder="e.g. ABC-123-XY"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
            {vehicleForm.formState.errors.vehicle_plate && (
              <p className="mt-1.5 text-xs text-red-500">{vehicleForm.formState.errors.vehicle_plate.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Model</label>
            <input
              {...vehicleForm.register('vehicle_model')}
              type="text"
              placeholder="e.g. Honda CB500"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
            {vehicleForm.formState.errors.vehicle_model && (
              <p className="mt-1.5 text-xs text-red-500">{vehicleForm.formState.errors.vehicle_model.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">License Number</label>
            <input
              {...vehicleForm.register('license_number')}
              type="text"
              placeholder="Driver's license number"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
            {vehicleForm.formState.errors.license_number && (
              <p className="mt-1.5 text-xs text-red-500">{vehicleForm.formState.errors.license_number.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={vehicleLoading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {vehicleLoading ? 'Saving…' : 'Save Vehicle Info'}
          </button>
        </form>
      </div>

      {/* Bank Details */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900">Bank Details</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Required to receive your earnings and withdrawals</p>
        <form onSubmit={bankForm.handleSubmit(saveBankDetails)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank</label>
            <select
              {...bankForm.register('bank_code')}
              onChange={(e) => {
                const bank = NIGERIAN_BANKS.find(b => b.code === e.target.value)
                bankForm.setValue('bank_code', e.target.value)
                bankForm.setValue('bank_name', bank?.name ?? '')
              }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            >
              <option value="">Select your bank</option>
              {NIGERIAN_BANKS.map(b => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
            {bankForm.formState.errors.bank_code && (
              <p className="mt-1.5 text-xs text-red-500">{bankForm.formState.errors.bank_code.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Number</label>
            <input
              {...bankForm.register('bank_account_number')}
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit account number"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
            {bankForm.formState.errors.bank_account_number && (
              <p className="mt-1.5 text-xs text-red-500">{bankForm.formState.errors.bank_account_number.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Name</label>
            <input
              {...bankForm.register('bank_account_name')}
              type="text"
              placeholder="Name as it appears on your bank statement"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
            {bankForm.formState.errors.bank_account_name && (
              <p className="mt-1.5 text-xs text-red-500">{bankForm.formState.errors.bank_account_name.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={bankLoading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {bankLoading ? 'Saving…' : 'Save Bank Details'}
          </button>
        </form>
      </div>

      {/* KYC / Identity */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-900">Identity Verification (KYC)</h2>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${kyc.className}`}>
            {kyc.label}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1 mb-5">
          Required for account approval. Your details are encrypted and kept secure.
        </p>
        {rider.kyc_status === 'verified' ? (
          <div className="flex items-center gap-2 py-3 px-4 bg-green-50 rounded-xl">
            <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-700 text-sm font-medium">Identity verified — no further action needed</span>
          </div>
        ) : (
          <form onSubmit={kycForm.handleSubmit(saveKyc)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                BVN <span className="text-gray-400 font-normal">(Bank Verification Number)</span>
              </label>
              <PasswordInput
                {...kycForm.register('bvn')}
                inputMode="numeric"
                maxLength={11}
                placeholder="11-digit BVN"
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
              />
              {kycForm.formState.errors.bvn && (
                <p className="mt-1.5 text-xs text-red-500">{kycForm.formState.errors.bvn.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                NIN <span className="text-gray-400 font-normal">(National Identity Number)</span>
              </label>
              <PasswordInput
                {...kycForm.register('nin')}
                inputMode="numeric"
                maxLength={11}
                placeholder="11-digit NIN"
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
              />
              {kycForm.formState.errors.nin && (
                <p className="mt-1.5 text-xs text-red-500">{kycForm.formState.errors.nin.message}</p>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Your BVN and NIN are never shared and are used only for identity verification.
            </p>
            <button
              type="submit"
              disabled={kycLoading || rider.kyc_status === 'submitted'}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {kycLoading ? 'Submitting…' : rider.kyc_status === 'submitted' ? 'Under Review' : 'Submit for Verification'}
            </button>
          </form>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900">Notifications</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Get alerted about new deliveries and account updates on this device</p>
        <PushNotificationToggle />
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900">Security</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">A password reset link will be sent to your email</p>
        <button
          onClick={handlePasswordReset}
          disabled={isSendingReset}
          type="button"
          className="w-full py-3 border border-gray-200 hover:border-gray-300 active:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed text-gray-700 text-sm font-semibold rounded-xl transition-colors"
        >
          {isSendingReset ? 'Sending…' : 'Send Password Reset Email'}
        </button>
      </div>

    </div>
  )
}
