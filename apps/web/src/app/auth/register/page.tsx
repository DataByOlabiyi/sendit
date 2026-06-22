import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = { title: 'Create Account — SendIt' }

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; ref?: string }>
}) {
  const { role, ref } = await searchParams
  const initialRole = role === 'rider' ? 'rider' : 'customer'

  return (
    <div className="min-h-screen flex">
      {/* Brand panel — desktop only */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-1/2 bg-orange-500 flex-col justify-between p-12 relative overflow-hidden shrink-0">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute top-1/2 right-8 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">SendIt</span>
        </div>

        {/* Main copy */}
        <div className="relative z-10">
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
            Fast.<br />Reliable.<br />Tracked.
          </h2>
          <p className="text-orange-100 text-lg mb-10">
            Nigeria&apos;s most trusted delivery network.
          </p>
          <ul className="space-y-4">
            {[
              'Real-time GPS tracking on every order',
              'Verified riders, insured deliveries',
              'Instant updates at every step',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <p className="text-white text-sm leading-relaxed">
            &ldquo;My go-to for all business deliveries. Fast and reliable every single time.&rdquo;
          </p>
          <p className="text-orange-200 text-xs mt-2 font-medium">— Lagos Business Owner</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 bg-white overflow-y-auto min-h-screen">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">SendIt</span>
          </div>

          <RegisterForm initialRole={initialRole} skipRolePicker={role === 'rider' || role === 'customer'} referralCode={ref} />
        </div>
      </div>
    </div>
  )
}
