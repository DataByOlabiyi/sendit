import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/settings/settings-form'
import { loadSettingsAction } from './actions'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [settings, { data: profile }] = await Promise.all([
    loadSettingsAction(),
    supabase.from('users').select('full_name, email, created_at').eq('id', user!.id).single(),
  ])

  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure pricing, commission, and your admin account.</p>
      </div>
      <SettingsForm initialSettings={settings} adminProfile={profile!} />
    </div>
  )
}
