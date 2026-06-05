import type { Metadata } from 'next'
import { SettingsForm } from '@/components/settings/settings-form'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="px-6 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure pricing and platform rules</p>
      </div>
      <SettingsForm />
    </div>
  )
}
