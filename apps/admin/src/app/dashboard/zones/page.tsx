import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ZonesManager } from '@/components/zones/zones-manager'

export const metadata: Metadata = { title: 'Cities & Zones' }

export default async function ZonesPage() {
  const supabase = await createClient()

  const [{ data: cities }, { data: zones }] = await Promise.all([
    supabase.from('cities').select('id, name, state, country, is_active, lat, lng, created_at').order('name'),
    supabase.from('delivery_zones').select('id, city_id, name, base_fee, per_km_fee, is_active, created_at').order('name'),
  ])

  return (
    <div className="px-4 py-6 lg:px-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cities &amp; Zones</h1>
        <p className="text-sm text-gray-500 mt-1">Manage service cities and delivery zone fee overrides</p>
      </div>
      <ZonesManager cities={cities ?? []} zones={zones ?? []} />
    </div>
  )
}
