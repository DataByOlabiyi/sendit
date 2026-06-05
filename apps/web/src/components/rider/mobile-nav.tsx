'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@sendit/ui'

const mobileNavItems = [
  {
    label: 'Home',
    href: '/rider/dashboard',
    icon: (active: boolean) => (
      <svg className={cn('w-6 h-6', active ? 'text-orange-500' : 'text-gray-400')} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Orders',
    href: '/rider/orders',
    icon: (active: boolean) => (
      <svg className={cn('w-6 h-6', active ? 'text-orange-500' : 'text-gray-400')} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    label: 'Earnings',
    href: '/rider/earnings',
    icon: (active: boolean) => (
      <svg className={cn('w-6 h-6', active ? 'text-orange-500' : 'text-gray-400')} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Profile',
    href: '/rider/profile',
    icon: (active: boolean) => (
      <svg className={cn('w-6 h-6', active ? 'text-orange-500' : 'text-gray-400')} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export function RiderMobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 pb-safe z-50">
      <div className="flex items-end justify-around h-16">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2"
            >
              {item.icon(isActive)}
              <span className={cn('text-xs', isActive ? 'text-orange-500 font-medium' : 'text-gray-400')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
