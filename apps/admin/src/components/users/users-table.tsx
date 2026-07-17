'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDate } from '@sendit/utils'
import { suspendUserAction, reactivateUserAction } from '@/app/dashboard/users/actions'
import { Pagination } from '@/components/ui/pagination'
import type { User } from '@sendit/types'

interface UsersTableProps {
  users: User[]
}

export function UsersTable({ users: initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null)
  const [reason, setReason] = useState('')

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  function handleSearch(val: string) { setSearch(val); setPage(1) }

  async function handleReactivate(user: User) {
    setLoadingId(user.id)
    try {
      const result = await reactivateUserAction(user.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: true } : u)))
        toast.success('User reactivated')
      }
    } finally {
      setLoadingId(null)
    }
  }

  function openSuspendModal(user: User) {
    setReason('')
    setSuspendTarget(user)
  }

  async function handleSuspend() {
    if (!suspendTarget) return
    if (!reason.trim()) { toast.error('Please provide a reason'); return }
    const user = suspendTarget
    setLoadingId(user.id)
    setSuspendTarget(null)
    try {
      const result = await suspendUserAction(user.id, reason.trim())
      if (result.error) {
        toast.error(result.error)
      } else {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: false } : u)))
        toast.success('User suspended')
      }
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Customer</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Phone</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Joined</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-sm text-gray-400">
                    {search ? 'No users match your search' : 'No customers yet'}
                  </td>
                </tr>
              ) : (
                paginated.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/users/${user.id}`} className="group block">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-orange-500 transition">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{user.phone ?? '—'}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{formatDate(user.created_at)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => user.is_active ? openSuspendModal(user) : handleReactivate(user)}
                        disabled={loadingId === user.id}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                          user.is_active
                            ? 'text-red-600 bg-red-50 hover:bg-red-100'
                            : 'text-green-600 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        {loadingId === user.id ? '...' : user.is_active ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        total={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        noun="customers"
      />

      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Suspend {suspendTarget.full_name}</h3>
            <p className="text-sm text-gray-500 mb-4">
              Provide a reason. This will be sent to the customer as a notification.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Reason for suspension..."
              className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setSuspendTarget(null)}
                className="flex-1 py-2.5 text-sm text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={!reason.trim()}
                className="flex-1 py-2.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl font-semibold transition disabled:opacity-50"
              >
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
