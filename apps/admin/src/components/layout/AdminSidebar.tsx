'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@sendit/ui'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Ops Center', href: '/dashboard/ops', icon: '🎯' },
  { label: 'Users', href: '/dashboard/users', icon: '👥' },
  { label: 'Riders', href: '/dashboard/riders', icon: '🏍️' },
  { label: 'KYC Review', href: '/dashboard/kyc', icon: '🪪' },
  { label: 'Orders', href: '/dashboard/orders', icon: '📦' },
  { label: 'Payments', href: '/dashboard/payments', icon: '💳' },
  { label: 'Payouts', href: '/dashboard/payouts', icon: '💸' },
  { label: 'Disputes', href: '/dashboard/disputes', icon: '⚖️' },
  { label: 'Support', href: '/dashboard/support', icon: '🎫' },
  { label: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
  { label: 'Audit Logs', href: '/dashboard/audit-logs', icon: '🔍' },
  { label: 'Notifications', href: '/dashboard/notifications', icon: '🔔' },
  { label: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-grow bg-white border-r border-gray-100 overflow-y-auto">
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <div>
            <span className="text-base font-bold text-gray-900">SendIt</span>
            <span className="block text-xs text-gray-400">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                  isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            <span>🚪</span>
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
