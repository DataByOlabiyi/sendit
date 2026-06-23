'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@sendit/utils'
import { updateProfileSchema, type UpdateProfileInput } from '@sendit/validations'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@sendit/types'

interface ReferralReward {
  id: string
  status: string
  amount: number | null
  created_at: string
}

interface ProfileFormProps {
  profile: User
  orderCount: number
  addressCount: number
  referralRewards?: ReferralReward[]
  walletBalance?: number
  walletTotalCredited?: number
  walletTotalSpent?: number
}

export function ProfileForm({ profile, orderCount, addressCount, referralRewards = [], walletBalance = 0, walletTotalCredited = 0, walletTotalSpent = 0 }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [topupAmount, setTopupAmount] = useState('')
  const [isTopupLoading, setIsTopupLoading] = useState(false)
  const [currentBalance, setCurrentBalance] = useState(walletBalance)
  const router = useRouter()

  async function handleCopyCode() {
    const code = profile.referral_code ?? ''
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  async function handleCopyLink() {
    const code = profile.referral_code ?? ''
    if (!code) return
    const url = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/register?ref=${code}`
      : `/auth/register?ref=${code}`
    await navigator.clipboard.writeText(url)
    toast.success('Referral link copied!')
  }

  async function handleTopup() {
    const amount = parseFloat(topupAmount)
    if (!amount || amount < 100) { toast.error('Minimum top-up is ₦100'); return }
    setIsTopupLoading(true)
    try {
      const initRes = await fetch('/api/wallet/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const initData = await initRes.json()
      if (!initRes.ok) { toast.error(initData.error ?? 'Failed to initialize payment'); return }

      const { loadPaystack, initializePaystackPayment } = await import('@/lib/paystack')
      await loadPaystack()
      await initializePaystackPayment({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email: profile.email,
        amount,
        reference: initData.reference,
        metadata: { type: 'wallet_topup' },
        onSuccess: async (ref: string) => {
          const verifyRes = await fetch('/api/wallet/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: ref }),
          })
          if (verifyRes.ok) {
            const { amount: credited } = await verifyRes.json()
            setCurrentBalance((prev) => prev + credited)
            setTopupAmount('')
            toast.success(`₦${credited.toLocaleString()} added to your wallet!`)
          } else {
            toast.error('Payment verified but wallet update failed — contact support')
          }
        },
        onClose: () => { setIsTopupLoading(false) },
      })
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsTopupLoading(false)
    }
  }

  const pendingRewards = referralRewards.filter((r) => r.status === 'pending').length
  const creditedRewards = referralRewards.filter((r) => r.status === 'credited')
  const totalCredited = creditedRewards.reduce((sum, r) => sum + (r.amount ?? 0), 0)

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<UpdateProfileInput>({
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
      reset({ full_name: data.full_name, phone: data.phone })
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
    month: 'long',
    year: 'numeric',
  })

  const initials = profile.full_name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6 lg:items-start">

      {/* ── Left: Identity + Stats ── */}
      <div className="mb-4 lg:mb-0">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <div aria-hidden="true" className="w-20 h-20 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-bold text-orange-500">{initials}</span>
          </div>
          <p className="font-semibold text-gray-900">{profile.full_name}</p>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{profile.email}</p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 mt-2 capitalize">
            {profile.role}
          </span>

          <hr className="my-4 border-gray-100" />

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-left">Account Stats</p>
          <div role="list" className="space-y-4 text-left">
            <div role="listitem" className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">Total Orders</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{orderCount}</span>
            </div>
            <div role="listitem" className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">Saved Addresses</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{addressCount}</span>
            </div>
            <div role="listitem" className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
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
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>
          <p className="text-sm text-gray-500 mt-1 mb-5">Update your name and phone number</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                {...register('full_name')}
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
              />
              {errors.full_name && <p className="mt-1.5 text-xs text-red-500">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="08012345678"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
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
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {isLoading ? 'Saving…' : 'Save Changes'}
            </button>
            {!isDirty && (
              <p className="text-sm text-center text-gray-400">No changes to save</p>
            )}
          </form>
        </div>

        {/* Wallet */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900">SendIt Wallet</h2>
          <p className="text-sm text-gray-500 mt-1 mb-5">Add funds to pay for orders instantly</p>

          <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Available Balance</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentBalance)}</p>
            </div>
          </div>

          {walletTotalCredited > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded-xl">
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900">{formatCurrency(currentBalance)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Balance</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900">{formatCurrency(walletTotalCredited)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Total In</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900">{formatCurrency(walletTotalSpent)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Total Out</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="number"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              placeholder="Amount (₦)"
              min="100"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleTopup}
              disabled={isTopupLoading || !topupAmount}
              className="px-5 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
            >
              {isTopupLoading ? 'Loading…' : 'Add Funds'}
            </button>
          </div>
        </div>

        {/* Refer & Earn */}
        {profile.referral_code && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900">Refer & Earn</h2>
            <p className="text-sm text-gray-500 mt-1 mb-5">Share your code — you both earn ₦500 credit after their first delivery</p>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-mono text-base font-bold tracking-widest text-gray-900 truncate">{profile.referral_code}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
              >
                {codeCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-orange-200 text-orange-600 text-sm font-medium rounded-xl hover:bg-orange-50 active:bg-orange-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share referral link
            </button>

            {referralRewards.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Pending rewards</span>
                  <span className="font-semibold text-yellow-600">{pendingRewards}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total credited</span>
                  <span className="font-semibold text-green-600">{formatCurrency(totalCredited / 100)}</span>
                </div>
              </div>
            )}
          </div>
        )}

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

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border border-red-100 p-6">
          <h2 className="text-base font-semibold text-red-600">Danger Zone</h2>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            Deactivating your account will prevent access. Contact support to reactivate.
          </p>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full py-3 border border-red-200 hover:border-red-400 active:bg-red-50 text-red-600 text-sm font-semibold rounded-xl transition-colors"
            >
              Deactivate Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-500">Are you sure? You will be signed out immediately.</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
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
