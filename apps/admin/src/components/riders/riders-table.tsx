'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { formatDate } from '@sendit/utils'
import { approveRiderAction, suspendRiderAction, rejectRiderAction } from '@/app/dashboard/riders/actions'

interface RiderRow {
  id: string
  user_id: string
  vehicle_type: string
  vehicle_plate: string
  vehicle_model: string
  license_number: string
  status: string
  is_online: boolean
  rating: number
  total_deliveries: number
  tier: string | null
  kyc_status: string | null
  bvn: string | null
  nin: string | null
  license_doc_url: string | null
  vehicle_doc_url: string | null
  created_at: string
  users: {
    full_name: string
    email: string
    phone: string | null
    is_active: boolean
  } | null
}

interface RidersTableProps {
  riders: RiderRow[]
}

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  rejected: 'bg-gray-100 text-gray-600',
}

const tierConfig: Record<string, { label: string; color: string }> = {
  bronze: { label: 'Bronze', color: 'bg-amber-100 text-amber-700' },
  silver: { label: 'Silver', color: 'bg-slate-100 text-slate-600' },
  gold: { label: 'Gold', color: 'bg-yellow-100 text-yellow-600' },
  platinum: { label: 'Platinum', color: 'bg-violet-100 text-violet-700' },
}

const kycColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  submitted: 'bg-blue-100 text-blue-700',
  verified: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

type ModalState =
  | { type: 'none' }
  | { type: 'docs'; rider: RiderRow }
  | { type: 'reason'; action: 'suspend' | 'reject'; riderId: string }
  | { type: 'kyc'; rider: RiderRow }

export function RidersTable({ riders: initialRiders }: RidersTableProps) {
  const [riders, setRiders] = useState(initialRiders)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [reasonText, setReasonText] = useState('')
  const [kycLoading, setKycLoading] = useState(false)
  const [kycRejectReason, setKycRejectReason] = useState('')

  const filtered = riders.filter((r) => {
    const matchesSearch =
      r.users?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.users?.email.toLowerCase().includes(search.toLowerCase()) ||
      r.vehicle_plate.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || r.status === filter
    return matchesSearch && matchesFilter
  })

  async function handleApprove(riderId: string) {
    setLoadingId(riderId)
    try {
      const result = await approveRiderAction(riderId)
      if (result.error) {
        toast.error(result.error)
      } else {
        setRiders((prev) => prev.map((r) => r.id === riderId ? { ...r, status: 'approved' } : r))
        toast.success('Rider approved')
      }
    } finally {
      setLoadingId(null)
    }
  }

  function openReasonModal(action: 'suspend' | 'reject', riderId: string) {
    setReasonText('')
    setModal({ type: 'reason', action, riderId })
  }

  async function submitReason() {
    if (modal.type !== 'reason') return
    if (!reasonText.trim()) {
      toast.error('Please provide a reason')
      return
    }

    const { riderId, action } = modal
    setLoadingId(riderId)
    setModal({ type: 'none' })

    try {
      const result =
        action === 'suspend'
          ? await suspendRiderAction(riderId, reasonText.trim())
          : await rejectRiderAction(riderId, reasonText.trim())

      if (result.error) {
        toast.error(result.error)
      } else {
        setRiders((prev) =>
          prev.map((r) =>
            r.id === riderId
              ? { ...r, status: action === 'suspend' ? 'suspended' : 'rejected' }
              : r,
          ),
        )
        toast.success(action === 'suspend' ? 'Rider suspended' : 'Rider rejected')
      }
    } finally {
      setLoadingId(null)
    }
  }

  async function handleKycAction(riderId: string, action: 'approve' | 'reject') {
    if (action === 'reject' && !kycRejectReason.trim()) {
      toast.error('Provide a reason for rejection')
      return
    }
    setKycLoading(true)
    try {
      const res = await fetch('/api/kyc/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId, action, reason: kycRejectReason.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'KYC update failed'); return }
      const newKycStatus = action === 'approve' ? 'verified' : 'failed'
      setRiders((prev) => prev.map((r) => r.id === riderId ? { ...r, kyc_status: newKycStatus } : r))
      toast.success(action === 'approve' ? 'KYC approved — rider verified' : 'KYC rejected')
      setModal({ type: 'none' })
    } catch {
      toast.error('Network error')
    } finally {
      setKycLoading(false)
    }
  }

  const ActionButtons = ({ rider }: { rider: RiderRow }) => (
    <div className="flex items-center justify-end gap-2 flex-wrap">
      {rider.kyc_status === 'submitted' && (
        <button
          onClick={() => { setKycRejectReason(''); setModal({ type: 'kyc', rider }) }}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition touch-manipulation"
        >
          Review KYC
        </button>
      )}
      {(rider.license_doc_url || rider.vehicle_doc_url) && (
        <button
          onClick={() => setModal({ type: 'docs', rider })}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition touch-manipulation"
        >
          View Docs
        </button>
      )}

      {rider.status === 'pending' && (
        <>
          <button
            onClick={() => handleApprove(rider.id)}
            disabled={loadingId === rider.id}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition disabled:opacity-50 touch-manipulation"
          >
            Approve
          </button>
          <button
            onClick={() => openReasonModal('reject', rider.id)}
            disabled={loadingId === rider.id}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50 touch-manipulation"
          >
            Reject
          </button>
        </>
      )}
      {rider.status === 'approved' && (
        <button
          onClick={() => openReasonModal('suspend', rider.id)}
          disabled={loadingId === rider.id}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50 touch-manipulation"
        >
          Suspend
        </button>
      )}
      {rider.status === 'suspended' && (
        <button
          onClick={() => handleApprove(rider.id)}
          disabled={loadingId === rider.id}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition disabled:opacity-50 touch-manipulation"
        >
          Reinstate
        </button>
      )}
    </div>
  )

  const TierBadge = ({ tier }: { tier: string | null }) => {
    if (!tier) return null
    const cfg = tierConfig[tier]
    if (!cfg) return null
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cfg.color}`}>
        {cfg.label}
      </span>
    )
  }

  const KycBadge = ({ status }: { status: string | null }) => {
    if (!status) return null
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${kycColors[status] ?? 'bg-gray-100 text-gray-500'}`}>
        KYC: {status}
      </span>
    )
  }

  return (
    <>
      <div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search riders..."
            className="w-full sm:max-w-xs px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'approved', 'suspended', 'rejected'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition ${
                  filter === s
                    ? 'bg-orange-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile card view */}
        <div className="block lg:hidden space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-sm text-gray-400">No riders found</p>
            </div>
          ) : (
            filtered.map((rider) => (
              <div key={rider.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{rider.users?.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-500">{rider.users?.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[rider.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {rider.status}
                    </span>
                    <TierBadge tier={rider.tier} />
                    <KycBadge status={rider.kyc_status} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                  <div><span className="text-gray-400">Vehicle:</span> {rider.vehicle_type}</div>
                  <div><span className="text-gray-400">Plate:</span> {rider.vehicle_plate}</div>
                  <div><span className="text-gray-400">Rating:</span> ⭐ {rider.rating.toFixed(1)}</div>
                  <div><span className="text-gray-400">Deliveries:</span> {rider.total_deliveries}</div>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <ActionButtons rider={rider} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop table view */}
        <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Rider</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Vehicle</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Stats</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status / Tier</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-sm text-gray-400">
                      No riders found
                    </td>
                  </tr>
                ) : (
                  filtered.map((rider) => (
                    <tr key={rider.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{rider.users?.full_name ?? '—'}</p>
                          <p className="text-xs text-gray-500">{rider.users?.email}</p>
                          <p className="text-xs text-gray-400">{rider.users?.phone ?? '—'}</p>
                          <p className="text-xs text-gray-300 mt-0.5">{formatDate(rider.created_at)}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm text-gray-900 capitalize">{rider.vehicle_type}</p>
                          <p className="text-xs text-gray-500">{rider.vehicle_model}</p>
                          <p className="text-xs text-gray-400 font-mono">{rider.vehicle_plate}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm text-gray-900">⭐ {rider.rating.toFixed(1)}</p>
                          <p className="text-xs text-gray-500">{rider.total_deliveries} deliveries</p>
                          <p className={`text-xs mt-0.5 ${rider.is_online ? 'text-green-500' : 'text-gray-400'}`}>
                            {rider.is_online ? '● Online' : '● Offline'}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize w-fit ${statusStyles[rider.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {rider.status}
                          </span>
                          <TierBadge tier={rider.tier} />
                          <KycBadge status={rider.kyc_status} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <ActionButtons rider={rider} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reason modal (suspend / reject) */}
      {modal.type === 'reason' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal({ type: 'none' })} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
            <h2 className="text-base font-semibold text-gray-900 mb-1 capitalize">
              {modal.action} Rider
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Provide a reason. This will be sent to the rider as a notification.
            </p>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder={`Reason for ${modal.action}...`}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-gray-400 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setModal({ type: 'none' })}
                className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitReason}
                className={`flex-1 py-3 font-semibold rounded-xl transition text-sm text-white ${
                  modal.action === 'suspend' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {modal.action === 'suspend' ? 'Suspend' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KYC review modal */}
      {modal.type === 'kyc' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal({ type: 'none' })} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">KYC Review — {modal.rider.users?.full_name}</h2>
              <button onClick={() => setModal({ type: 'none' })} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition text-gray-400 text-lg">×</button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">BVN</span>
                <span className="font-mono text-gray-900 font-medium">
                  {modal.rider.bvn ? `${modal.rider.bvn.slice(0, 3)}••••${modal.rider.bvn.slice(-3)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">NIN</span>
                <span className="font-mono text-gray-900 font-medium">
                  {modal.rider.nin ? `${modal.rider.nin.slice(0, 3)}••••${modal.rider.nin.slice(-3)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">License</span>
                <span className="text-gray-900">{modal.rider.license_number}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Rejection reason (required if rejecting)</label>
              <textarea
                value={kycRejectReason}
                onChange={(e) => setKycRejectReason(e.target.value)}
                placeholder="e.g. BVN does not match provided name"
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-gray-400"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleKycAction(modal.rider.id, 'reject')}
                disabled={kycLoading}
                className="flex-1 py-3 text-sm font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
              >
                Reject KYC
              </button>
              <button
                onClick={() => handleKycAction(modal.rider.id, 'approve')}
                disabled={kycLoading}
                className="flex-1 py-3 text-sm font-semibold rounded-xl bg-green-500 hover:bg-green-600 text-white transition disabled:opacity-50"
              >
                {kycLoading ? 'Processing...' : 'Approve KYC'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document viewer modal */}
      {modal.type === 'docs' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal({ type: 'none' })} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Documents — {modal.rider.users?.full_name}
              </h2>
              <button
                onClick={() => setModal({ type: 'none' })}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {modal.rider.license_doc_url ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Driver&apos;s License</p>
                  {modal.rider.license_doc_url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                    <img
                      src={modal.rider.license_doc_url}
                      alt="Driver license"
                      className="w-full rounded-xl object-contain max-h-64 bg-gray-50"
                    />
                  ) : (
                    <a
                      href={modal.rider.license_doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-sm text-blue-600 hover:bg-blue-50 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Open license document
                    </a>
                  )}
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                  <p className="text-xs text-yellow-700">No license document uploaded</p>
                </div>
              )}

              {modal.rider.vehicle_doc_url ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vehicle Registration</p>
                  {modal.rider.vehicle_doc_url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                    <img
                      src={modal.rider.vehicle_doc_url}
                      alt="Vehicle registration"
                      className="w-full rounded-xl object-contain max-h-64 bg-gray-50"
                    />
                  ) : (
                    <a
                      href={modal.rider.vehicle_doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-sm text-blue-600 hover:bg-blue-50 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Open vehicle document
                    </a>
                  )}
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                  <p className="text-xs text-yellow-700">No vehicle document uploaded</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
