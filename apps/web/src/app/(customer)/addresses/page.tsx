import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AddressesList } from '@/components/customer/addresses-list'

export const metadata: Metadata = { title: 'Saved Addresses' }

export default async function AddressesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: addresses } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user!.id)
    .order('is_default', { ascending: false })

  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Saved Addresses</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your pickup and delivery locations</p>
      </div>
      <AddressesList addresses={addresses ?? []} userId={user!.id} />
    </div>
  )
}
