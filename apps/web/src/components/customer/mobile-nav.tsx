'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@sendit/ui'

const mobileNavItems = [
  {
    label: 'Home',
    href: '/dashboard',
    icon: (active: boolean) => (
      <svg className={cn('w-6 h-6', active ? 'text-orange-500' : 'text-gray-400')} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Orders',
    href: '/orders',
    icon: (active: boolean) => (
      <svg className={cn('w-6 h-6', active ? 'text-orange-500' : 'text-gray-400')} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    label: 'Book',
    href: '/book',
    icon: (_active: boolean) => (
      <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center -mt-5 shadow-lg shadow-orange-200">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
    ),
  },
  {
    label: 'Alerts',
    href: '/notifications',
    icon: (active: boolean) => (
      <svg className={cn('w-6 h-6', active ? 'text-orange-500' : 'text-gray-400')} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: (active: boolean) => (
      <svg className={cn('w-6 h-6', active ? 'text-orange-500' : 'text-gray-400')} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export function CustomerMobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-end justify-around h-16 px-2">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2 touch-manipulation"
            >
              {item.icon(isActive)}
              {item.href !== '/book' && (
                <span className={cn('text-xs', isActive ? 'text-orange-500 font-medium' : 'text-gray-400')}>
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
