import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RiderSidebar } from '@/components/rider/sidebar'
import { RiderMobileNav } from '@/components/rider/mobile-nav'

export default async function RiderLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'rider') redirect('/dashboard')

  const { data: rider } = await supabase
    .from('riders')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <RiderSidebar user={profile} rider={rider} />
      <div className="lg:pl-64">
        <main className="min-h-screen pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      <RiderMobileNav />
    </div>
  )
}
