'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { formatDate } from '@sendit/utils'
import { suspendUserAction, reactivateUserAction } from '@/app/dashboard/users/actions'
import type { User } from '@sendit/types'

interface UsersTableProps {
  users: User[]
}

export function UsersTable({ users: initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleToggleStatus(user: User) {
    setLoadingId(user.id)
    try {
      const result = user.is_active
        ? await suspendUserAction(user.id)
        : await reactivateUserAction(user.id)

      if (result.error) {
        toast.error(result.error)
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u))
        )
        toast.success(user.is_active ? 'User suspended' : 'User reactivated')
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
          onChange={(e) => setSearch(e.target.value)}
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
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
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
                        onClick={() => handleToggleStatus(user)}
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
    </div>
  )
}
