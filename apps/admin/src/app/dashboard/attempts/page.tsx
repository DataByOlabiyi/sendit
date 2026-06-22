import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DeliveryAttemptsTable } from '@/components/attempts/delivery-attempts-table'

export const metadata: Metadata = { title: 'Delivery Attempts' }

export const revalidate = 60

export default async function DeliveryAttemptsPage() {
  const supabase = await createClient()

  const { data: attempts } = await supabase
    .from('delivery_attempts')
    .select(`
      id, outcome, notes, photo_url, attempted_at, created_at,
      orders!inner(id, reference, pickup_address, delivery_address, status,
        users!customer_id(full_name, email, phone)),
      riders(id, vehicle_type, vehicle_plate,
        users!riders_user_id_fkey(full_name, phone))
    `)
    .order('attempted_at', { ascending: false })
    .limit(300)

  const stats = {
    total: (attempts ?? []).length,
    failed: (attempts ?? []).filter((a) => a.outcome === 'failed').length,
    no_answer: (attempts ?? []).filter((a) => a.outcome === 'no_answer').length,
    wrong_address: (attempts ?? []).filter((a) => a.outcome === 'wrong_address').length,
    refused: (attempts ?? []).filter((a) => a.outcome === 'refused').length,
    success: (attempts ?? []).filter((a) => a.outcome === 'success').length,
  }

  return (
    <div className="px-4 py-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Delivery Attempts</h1>
        <p className="text-sm text-gray-500 mt-1">All delivery attempt logs from riders</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Success', value: stats.success, color: 'text-green-600' },
          { label: 'Failed', value: stats.failed, color: 'text-red-600' },
          { label: 'No Answer', value: stats.no_answer, color: 'text-orange-600' },
          { label: 'Wrong Address', value: stats.wrong_address, color: 'text-yellow-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <DeliveryAttemptsTable attempts={(attempts ?? []) as any[]} />
    </div>
  )
}
