import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ApiKeysManager } from '@/components/apikeys/api-keys-manager'

export const metadata: Metadata = { title: 'API Keys' }

export default async function ApiKeysPage() {
  const supabase = await createClient()

  const { data: keys } = await supabase
    .from('api_keys')
    .select(`
      id, name, prefix, scopes, last_used_at, expires_at, is_active, created_at,
      organizations(id, name),
      users!api_keys_user_id_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="px-4 py-6 lg:px-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">B2B API Keys</h1>
        <p className="text-sm text-gray-500 mt-1">Manage API keys for merchant and B2B integrations</p>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ApiKeysManager keys={(keys ?? []) as any[]} orgs={(orgs ?? []) as any[]} />
    </div>
  )
}
