import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function missingSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return (
    !url ||
    url === 'your_supabase_project_url' ||
    !key ||
    key === 'your_supabase_anon_key'
  )
}

export async function updateSession(request: NextRequest) {
  if (missingSupabaseConfig()) {
    // In production a missing config is a deployment error — serve 503 so it's
    // immediately visible rather than silently bypassing all authentication.
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse(
        'Service Unavailable: Supabase environment variables are not configured.',
        { status: 503 },
      )
    }
    // In development, allow the request through so the app can be browsed
    // without credentials (useful for UI-only work).
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const authRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/callback',
    '/auth/verify',
  ]

  const isLandingPage = pathname === '/'
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))
  const isPublicRoute = isLandingPage || isAuthRoute

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // user_metadata.role is used only for routing redirects — it is fast (no
    // DB round-trip) and the real enforcement happens at the RLS / server-action
    // layer. The handle_new_user trigger now guarantees the value is either
    // 'customer' or 'rider'; 'admin' can never be set via signup.
    const role = (user.user_metadata?.role as string | undefined) ?? 'customer'
    const dashboardPath = role === 'rider' ? '/rider/dashboard' : '/dashboard'

    // Authenticated users skip the landing page and auth screens entirely
    if (isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = dashboardPath
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (role === 'rider' && pathname === '/dashboard') {
      const url = request.nextUrl.clone()
      url.pathname = '/rider/dashboard'
      return NextResponse.redirect(url)
    }

    if (role === 'customer' && pathname.startsWith('/rider')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
