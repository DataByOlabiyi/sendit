import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CustomerSidebar } from '@/components/customer/sidebar'
import { CustomerMobileNav } from '@/components/customer/mobile-nav'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'customer') redirect('/rider/dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerSidebar user={profile} />
      <div className="lg:pl-64">
        <main className="min-h-screen pb-24 lg:pb-0">
          {children}
        </main>
      </div>
      <CustomerMobileNav />
    </div>
  )
}
