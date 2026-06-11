import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/customer/profile-form'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { count: orderCount }, { count: addressCount }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user!.id).single(),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('customer_id', user!.id),
    supabase.from('addresses').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
  ])

  return (
    <div className="px-4 py-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account details</p>
      </div>
      <ProfileForm profile={profile} orderCount={orderCount ?? 0} addressCount={addressCount ?? 0} />
    </div>
  )
}
