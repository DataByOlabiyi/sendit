'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { formatDate } from '@sendit/utils'
import { approveRiderAction, suspendRiderAction, rejectRiderAction } from '@/app/dashboard/riders/actions'

interface RiderRow {
  id: string
  vehicle_type: string
  vehicle_plate: string
  vehicle_model: string
  status: string
  is_online: boolean
  rating: number
  total_deliveries: number
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

export function RidersTable({ riders: initialRiders }: RidersTableProps) {
  const [riders, setRiders] = useState(initialRiders)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)

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

  async function handleSuspend(riderId: string) {
    setLoadingId(riderId)
    try {
      const result = await suspendRiderAction(riderId)
      if (result.error) {
        toast.error(result.error)
      } else {
        setRiders((prev) => prev.map((r) => r.id === riderId ? { ...r, status: 'suspended' } : r))
        toast.success('Rider suspended')
      }
    } finally {
      setLoadingId(null)
    }
  }

  async function handleReject(riderId: string) {
    setLoadingId(riderId)
    try {
      const result = await rejectRiderAction(riderId)
      if (result.error) {
        toast.error(result.error)
      } else {
        setRiders((prev) => prev.map((r) => r.id === riderId ? { ...r, status: 'rejected' } : r))
        toast.success('Rider rejected')
      }
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search riders..."
          className="w-full sm:max-w-xs px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        <div className="flex gap-2">
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
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[rider.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {rider.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                <div><span className="text-gray-400">Vehicle:</span> {rider.vehicle_type}</div>
                <div><span className="text-gray-400">Plate:</span> {rider.vehicle_plate}</div>
                <div><span className="text-gray-400">Rating:</span> ⭐ {rider.rating.toFixed(1)}</div>
                <div><span className="text-gray-400">Deliveries:</span> {rider.total_deliveries}</div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                {rider.status === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(rider.id)} disabled={loadingId === rider.id} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition disabled:opacity-50 touch-manipulation">Approve</button>
                    <button onClick={() => handleReject(rider.id)} disabled={loadingId === rider.id} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50 touch-manipulation">Reject</button>
                  </>
                )}
                {rider.status === 'approved' && (
                  <button onClick={() => handleSuspend(rider.id)} disabled={loadingId === rider.id} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50 touch-manipulation">Suspend</button>
                )}
                {rider.status === 'suspended' && (
                  <button onClick={() => handleApprove(rider.id)} disabled={loadingId === rider.id} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition disabled:opacity-50 touch-manipulation">Reinstate</button>
                )}
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
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[rider.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {rider.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {rider.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(rider.id)}
                              disabled={loadingId === rider.id}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(rider.id)}
                              disabled={loadingId === rider.id}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {rider.status === 'approved' && (
                          <button
                            onClick={() => handleSuspend(rider.id)}
                            disabled={loadingId === rider.id}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        )}
                        {rider.status === 'suspended' && (
                          <button
                            onClick={() => handleApprove(rider.id)}
                            disabled={loadingId === rider.id}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition disabled:opacity-50"
                          >
                            Reinstate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
