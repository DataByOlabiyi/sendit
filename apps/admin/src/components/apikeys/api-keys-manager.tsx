'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface ApiKey {
  id: string
  name: string
  prefix: string
  scopes: string[]
  last_used_at: string | null
  expires_at: string | null
  is_active: boolean
  created_at: string
  organizations: { id: string; name: string } | null
  users: { full_name: string; email: string } | null
}

interface Org {
  id: string
  name: string
}

const ALL_SCOPES = ['orders:create', 'orders:read', 'orders:cancel', 'tracking:read', 'webhooks:manage']

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ApiKeysManager({ keys: initial, orgs }: { keys: ApiKey[]; orgs: Org[] }) {
  const [keys, setKeys] = useState(initial)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', userId: '', orgId: '', scopes: ['orders:create', 'orders:read'], expiresAt: '',
  })

  async function handleCreate() {
    if (!form.name.trim() || !form.userId.trim()) {
      toast.error('Name and user ID are required')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_key',
          name: form.name.trim(),
          userId: form.userId.trim(),
          orgId: form.orgId || undefined,
          scopes: form.scopes,
          expiresAt: form.expiresAt || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to create key'); return }
      setNewKeyValue(data.fullKey)
      setKeys((prev) => [{
        ...data.key,
        is_active: true,
        last_used_at: null,
        organizations: orgs.find((o) => o.id === form.orgId) ?? null,
        users: null,
      }, ...prev])
      setForm({ name: '', userId: '', orgId: '', scopes: ['orders:create', 'orders:read'], expiresAt: '' })
      setShowCreate(false)
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke(keyId: string) {
    try {
      const res = await fetch('/api/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke_key', keyId }),
      })
      if (!res.ok) { toast.error('Failed to revoke key'); return }
      setKeys((prev) => prev.map((k) => k.id === keyId ? { ...k, is_active: false } : k))
      toast.success('API key revoked')
    } catch {
      toast.error('Network error')
    }
  }

  function toggleScope(scope: string) {
    setForm((f) => ({
      ...f,
      scopes: f.scopes.includes(scope) ? f.scopes.filter((s) => s !== scope) : [...f.scopes, scope],
    }))
  }

  return (
    <div className="space-y-6">
      {/* New key disclosure modal */}
      {newKeyValue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 z-10">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Save your API key</h2>
            <p className="text-sm text-red-600 mb-4">This is the only time you will see this key. Copy it now and store it securely.</p>
            <div className="bg-gray-900 text-green-400 font-mono text-xs p-4 rounded-xl break-all mb-4 select-all">
              {newKeyValue}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { navigator.clipboard.writeText(newKeyValue); toast.success('Copied') }}
                className="flex-1 py-2.5 text-sm bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setNewKeyValue(null)}
                className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                I&apos;ve saved it
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 text-sm bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600"
        >
          + Create API Key
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-2xl border border-orange-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">New API Key</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Key Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Acme Production Key"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">User ID (owner) *</label>
              <input
                type="text"
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                placeholder="UUID of the user account"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Organization (optional)</label>
              <select
                value={form.orgId}
                onChange={(e) => setForm((f) => ({ ...f, orgId: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="">— No organization —</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date (optional)</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value ? `${e.target.value}T23:59:59+01:00` : '' }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Scopes</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SCOPES.map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => toggleScope(scope)}
                  className={`px-3 py-1.5 text-xs rounded-full font-medium transition ${
                    form.scopes.includes(scope)
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleCreate} disabled={loading} className="flex-1 py-2.5 text-sm bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Key'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Name / Prefix</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Owner / Org</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Scopes</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Last Used</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {keys.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-sm text-gray-400">No API keys yet</td></tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{key.name}</p>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">{key.prefix}••••••••</p>
                      <p className="text-xs text-gray-300 mt-0.5">Created {fmtDate(key.created_at)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-900">{key.users?.full_name ?? '—'}</p>
                      {key.organizations && <p className="text-xs text-gray-500">{key.organizations.name}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(key.scopes ?? []).map((s) => (
                          <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">{fmtDate(key.last_used_at)}</td>
                    <td className="px-5 py-4">
                      {key.is_active ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Revoked</span>
                      )}
                      {key.expires_at && new Date(key.expires_at) < new Date() && (
                        <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Expired</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {key.is_active && (
                        <button
                          onClick={() => handleRevoke(key.id)}
                          className="text-xs text-red-400 hover:text-red-600 font-medium"
                        >
                          Revoke
                        </button>
                      )}
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
