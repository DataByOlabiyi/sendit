import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { RidersTable } from '@/components/riders/riders-table'

export const metadata: Metadata = { title: 'Riders' }

export default async function RidersPage() {
  const supabase = await createClient()

  const { data: riders } = await supabase
    .from('riders')
    .select('*, users!riders_user_id_fkey(full_name, email, phone, is_active)')
    .order('created_at', { ascending: false })

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Riders</h1>
        <p className="text-sm text-gray-500 mt-1">Manage rider accounts and approvals</p>
      </div>
      <RidersTable riders={riders ?? []} />
    </div>
  )
}
