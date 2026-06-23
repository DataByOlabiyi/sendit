import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { RiderProfile } from '@/components/rider/profile'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Rider Profile' }

export default async function RiderProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: rider }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user!.id).single(),
    supabase.from('riders').select('*').eq('user_id', user!.id).single(),
  ])

  if (!rider) redirect('/rider/onboarding')

  const { data: wallet } = await supabase
    .from('rider_wallets')
    .select('balance, total_earned, total_paid')
    .eq('rider_id', rider.id)
    .maybeSingle()

  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your rider account</p>
      </div>
      <RiderProfile profile={profile} rider={rider} wallet={wallet ?? undefined} />
    </div>
  )
}
