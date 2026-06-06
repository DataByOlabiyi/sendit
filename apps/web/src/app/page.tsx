import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SendIt — Fast, Reliable Delivery in Lagos',
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm shadow-orange-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-lg">SendIt</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-10 text-center max-w-lg mx-auto w-full">
        <div className="inline-flex items-center gap-2 bg-white text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-7 shadow-sm border border-orange-100">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          Now live in Lagos
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight mb-4">
          Deliveries handled,{' '}
          <span className="text-orange-500">fast.</span>
        </h1>

        <p className="text-base text-gray-500 leading-relaxed mb-9 max-w-xs">
          Book a pickup in seconds, track your package live, and get it delivered anywhere in Lagos.
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/auth/register"
            className="flex items-center justify-center gap-2.5 px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl text-base transition shadow-lg shadow-orange-200 active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
            Send a Package
          </Link>

          <Link
            href="/auth/register?role=rider"
            className="flex items-center justify-center gap-2.5 px-6 py-4 bg-white hover:bg-orange-50 text-orange-500 font-semibold rounded-2xl text-base transition border-2 border-orange-200 hover:border-orange-300 active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Become a Rider
          </Link>
        </div>

        <p className="text-sm text-gray-400 mt-5">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-orange-500 hover:text-orange-600 font-medium">
            Sign in
          </Link>
        </p>

        {/* Trust chips */}
        <div className="flex items-center justify-center gap-4 mt-10 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5 text-orange-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Same-day delivery
          </div>
          <span className="text-gray-200">·</span>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5 text-orange-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Live GPS tracking
          </div>
          <span className="text-gray-200">·</span>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5 text-orange-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Insured packages
          </div>
        </div>
      </main>
    </div>
  )
}
