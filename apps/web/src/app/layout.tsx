import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Toaster } from 'sonner'
import { Providers } from '@/components/providers'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { RealtimeStatusBanner } from '@/components/layout/RealtimeStatusBanner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'SendIt — Fast, Reliable Delivery',
    template: '%s | SendIt',
  },
  description: 'Book a delivery in seconds. Track it live. Get it done.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SendIt',
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: 'SendIt — Fast, Reliable Delivery',
    description: 'Book a delivery in seconds. Track it live. Get it done.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          <RealtimeStatusBanner />
          {children}
          <Toaster position="top-center" richColors closeButton />
          <InstallPrompt />
        </Providers>
        <ServiceWorkerRegister />
        {/* Pre-load Paystack inline script at layout level so payment
            modal appears instantly on slow Nigerian connections */}
        <Script
          src="https://js.paystack.co/v1/inline.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
