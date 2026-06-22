import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CorporateManager } from '@/components/corporate/corporate-manager'

export const metadata: Metadata = { title: 'Corporate Accounts' }

export default async function CorporatePage() {
  const supabase = await createClient()

  const { data: orgs } = await supabase
    .from('organizations')
    .select('*, organization_members(count)')
    .order('created_at', { ascending: false })

  const stats = {
    total: (orgs ?? []).length,
    active: (orgs ?? []).filter((o) => o.is_active).length,
    total_credit: (orgs ?? []).reduce((s, o) => s + (o.credit_limit ?? 0), 0),
    total_outstanding: (orgs ?? []).reduce((s, o) => s + (o.balance ?? 0), 0),
  }

  return (
    <div className="px-4 py-6 lg:px-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Corporate Accounts</h1>
        <p className="text-sm text-gray-500 mt-1">Manage business accounts, credit limits, and members</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Orgs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Credit</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">₦{(stats.total_credit / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Outstanding</p>
          <p className={`text-2xl font-bold mt-1 ${stats.total_outstanding > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            ₦{(stats.total_outstanding / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <CorporateManager orgs={(orgs ?? []) as any[]} />
    </div>
  )
}
