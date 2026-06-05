import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Track Delivery' }

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('customer_id', user!.id)
    .single()

  if (!order) notFound()

  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Track Delivery</h1>
        <p className="text-sm text-gray-400 font-mono">{order.id.slice(0, 8).toUpperCase()}</p>
      </div>

      {/* Map placeholder — realtime tracking added in Phase 6 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
        <div className="h-72 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-gray-400">Live map coming in Phase 6</p>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm font-medium text-gray-900">{order.delivery_address}</p>
          <p className="text-xs text-gray-400 mt-0.5">Estimated arrival will appear here</p>
        </div>
      </div>
    </div>
  )
}
