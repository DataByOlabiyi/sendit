import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Skip auth when Supabase credentials are not yet configured
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url' ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'your_supabase_anon_key'
  ) {
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
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/callback',
    '/auth/verify',
  ]

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Read role from user_metadata (set during registration) — avoids a DB
    // round-trip on every request. The real RLS/role enforcement happens in
    // page layouts and server actions; this is only for routing redirects.
    const role = (user.user_metadata?.role as string | undefined) ?? 'customer'

    if (isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = role === 'rider' ? '/rider/dashboard' : '/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (role === 'rider' && (pathname === '/' || pathname === '/dashboard')) {
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
