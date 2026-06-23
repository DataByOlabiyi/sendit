'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { formatCurrency } from '@sendit/utils'

interface Org {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  rc_number: string | null
  tax_id: string | null
  credit_limit: number
  balance: number
  is_active: boolean
  created_at: string
  organization_members: { count: number }[]
}

interface Member {
  id: string
  role: string
  joined_at: string
  users: { full_name: string; email: string; phone: string | null } | null
}

const fmt = (kobo: number) => formatCurrency(kobo / 100)

async function apiPost(body: Record<string, unknown>) {
  const res = await fetch('/api/corporate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Request failed')
  return data
}

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', rc_number: '', tax_id: '', credit_limit: '' }

export function CorporateManager({ orgs: initial }: { orgs: Org[] }) {
  const [orgs, setOrgs] = useState(initial)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Org | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [addMemberEmail, setAddMemberEmail] = useState('')
  const [addMemberRole, setAddMemberRole] = useState<'owner' | 'admin' | 'member'>('member')

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId)

  async function loadMembers(orgId: string) {
    setMembersLoading(true)
    try {
      const res = await fetch(`/api/corporate?orgId=${orgId}`)
      const data = await res.json()
      setMembers(data.members ?? [])
    } catch {
      toast.error('Failed to load members')
    } finally {
      setMembersLoading(false)
    }
  }

  function selectOrg(org: Org) {
    setSelectedOrgId(org.id)
    setEditingOrg(null)
    loadMembers(org.id)
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    setLoading(true)
    try {
      const result = await apiPost({
        action: 'create_org',
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        rc_number: form.rc_number.trim() || undefined,
        tax_id: form.tax_id.trim() || undefined,
        credit_limit: form.credit_limit ? Math.round(parseFloat(form.credit_limit) * 100) : 0,
      })
      setOrgs((prev) => [result.org, ...prev])
      setForm(EMPTY_FORM)
      setShowCreate(false)
      toast.success('Organization created')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate() {
    if (!editingOrg) return
    setLoading(true)
    try {
      await apiPost({
        action: 'update_org',
        orgId: editingOrg.id,
        name: form.name.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        rc_number: form.rc_number.trim() || undefined,
        tax_id: form.tax_id.trim() || undefined,
        credit_limit: form.credit_limit ? Math.round(parseFloat(form.credit_limit) * 100) : undefined,
      })
      setOrgs((prev) => prev.map((o) => o.id === editingOrg.id ? {
        ...o,
        name: form.name.trim() || o.name,
        email: form.email.trim() || o.email,
        phone: form.phone.trim() || o.phone,
        address: form.address.trim() || o.address,
        rc_number: form.rc_number.trim() || o.rc_number,
        tax_id: form.tax_id.trim() || o.tax_id,
        credit_limit: form.credit_limit ? Math.round(parseFloat(form.credit_limit) * 100) : o.credit_limit,
      } : o))
      setEditingOrg(null)
      toast.success('Organization updated')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(org: Org) {
    try {
      await apiPost({ action: 'update_org', orgId: org.id, is_active: !org.is_active })
      setOrgs((prev) => prev.map((o) => o.id === org.id ? { ...o, is_active: !o.is_active } : o))
      toast.success(org.is_active ? 'Organization deactivated' : 'Organization activated')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    }
  }

  async function handleAddMember() {
    if (!addMemberEmail.trim() || !selectedOrgId) return
    setLoading(true)
    try {
      await apiPost({ action: 'add_member', orgId: selectedOrgId, email: addMemberEmail.trim(), role: addMemberRole })
      toast.success('Member added')
      setAddMemberEmail('')
      loadMembers(selectedOrgId)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveMember(memberId: string) {
    try {
      await apiPost({ action: 'remove_member', memberId })
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      toast.success('Member removed')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove member')
    }
  }

  function startEdit(org: Org) {
    setEditingOrg(org)
    setForm({
      name: org.name, email: org.email,
      phone: org.phone ?? '', address: org.address ?? '',
      rc_number: org.rc_number ?? '', tax_id: org.tax_id ?? '',
      credit_limit: org.credit_limit ? String(org.credit_limit / 100) : '',
    })
  }

  const formFields = [
    { label: 'Organization Name *', key: 'name', placeholder: 'Acme Nigeria Ltd' },
    { label: 'Email *', key: 'email', placeholder: 'info@acme.ng' },
    { label: 'Phone', key: 'phone', placeholder: '+234 800 000 0000' },
    { label: 'Address', key: 'address', placeholder: '1 Corporate Drive, VI' },
    { label: 'RC Number (CAC)', key: 'rc_number', placeholder: 'RC123456' },
    { label: 'Tax ID (TIN)', key: 'tax_id', placeholder: '12345678-0001' },
    { label: 'Credit Limit (₦)', key: 'credit_limit', placeholder: '0' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Orgs list */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Organizations</h2>
            <button onClick={() => { setForm(EMPTY_FORM); setShowCreate(true) }} className="text-xs font-medium text-orange-500 hover:text-orange-700">+ New</button>
          </div>
          {orgs.length === 0 ? (
            <p className="text-sm text-gray-400 p-5">No organizations yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {orgs.map((org) => (
                <div
                  key={org.id}
                  className={`px-5 py-3.5 cursor-pointer transition ${selectedOrgId === org.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                  onClick={() => selectOrg(org)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${selectedOrgId === org.id ? 'text-orange-600' : 'text-gray-900'}`}>{org.name}</p>
                      <p className="text-xs text-gray-400 truncate">{org.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Credit: {fmt(org.credit_limit)} · Due: {fmt(org.balance)}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${org.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {org.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showCreate && (
          <div className="mt-4 bg-white rounded-2xl border border-orange-200 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">New Organization</h3>
            {formFields.map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type="text"
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={loading} className="flex-1 py-2 text-sm bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50">Create</button>
            </div>
          </div>
        )}
      </div>

      {/* Org detail panel */}
      <div className="lg:col-span-3 space-y-4">
        {selectedOrg ? (
          <>
            {/* Org details */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{selectedOrg.name}</h2>
                  <p className="text-xs text-gray-500">{selectedOrg.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(selectedOrg)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded-lg border border-blue-100">Edit</button>
                  <button onClick={() => handleToggleActive(selectedOrg)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg border border-gray-200">
                    {selectedOrg.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>

              {editingOrg?.id === selectedOrg.id ? (
                <div className="space-y-3">
                  {formFields.map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                      <input
                        type="text"
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setEditingOrg(null)} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600">Cancel</button>
                    <button onClick={handleUpdate} disabled={loading} className="flex-1 py-2 text-sm bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50">Save</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Phone', selectedOrg.phone ?? '—'],
                    ['RC Number', selectedOrg.rc_number ?? '—'],
                    ['Tax ID', selectedOrg.tax_id ?? '—'],
                    ['Credit Limit', fmt(selectedOrg.credit_limit)],
                    ['Outstanding Balance', fmt(selectedOrg.balance)],
                    ['Address', selectedOrg.address ?? '—'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm text-gray-900 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Members */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Members</h3>

              <div className="flex gap-2 mb-4">
                <input
                  type="email"
                  value={addMemberEmail}
                  onChange={(e) => setAddMemberEmail(e.target.value)}
                  placeholder="user@email.com"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <select
                  value={addMemberRole}
                  onChange={(e) => setAddMemberRole(e.target.value as 'owner' | 'admin' | 'member')}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
                <button
                  onClick={handleAddMember}
                  disabled={loading || !addMemberEmail.trim()}
                  className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
                >
                  Add
                </button>
              </div>

              {membersLoading ? (
                <p className="text-xs text-gray-400">Loading members...</p>
              ) : members.length === 0 ? (
                <p className="text-xs text-gray-400">No members yet</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm text-gray-900">{m.users?.full_name ?? '—'}</p>
                        <p className="text-xs text-gray-500">{m.users?.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{m.role}</span>
                        <button onClick={() => handleRemoveMember(m.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="text-sm text-gray-400">Select an organization to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
