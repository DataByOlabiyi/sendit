import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { UsersTable } from '@/components/users/users-table'

export const metadata: Metadata = { title: 'Users' }

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500 mt-1">Manage customer accounts</p>
      </div>
      <UsersTable users={users ?? []} />
    </div>
  )
}
