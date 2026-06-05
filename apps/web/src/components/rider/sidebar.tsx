'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@sendit/ui'
import { logoutAction } from '@/app/auth/actions'
import type { User, Rider } from '@sendit/types'

const navItems = [
  {
    label: 'Dashboard',
    href: '/rider/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'My Deliveries',
    href: '/rider/orders',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    label: 'Earnings',
    href: '/rider/earnings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Profile',
    href: '/rider/profile',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

interface RiderSidebarProps {
  user: User
  rider: Rider | null
}

export function RiderSidebar({ user, rider }: RiderSidebarProps) {
  const pathname = usePathname()

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
            <span className="block text-xs text-orange-500 font-medium">Rider</span>
          </div>
        </div>

        {rider && (
          <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-orange-50 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className={`text-sm font-semibold ${rider.is_online ? 'text-green-600' : 'text-gray-500'}`}>
                  {rider.is_online ? '🟢 Online' : '⚫ Offline'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Rating</p>
                <p className="text-sm font-semibold text-gray-900">⭐ {rider.rating.toFixed(1)}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                  isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <span className={isActive ? 'text-orange-500' : 'text-gray-400'}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-orange-600">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
