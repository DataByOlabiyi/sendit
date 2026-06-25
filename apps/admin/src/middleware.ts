import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
        getAll() { return request.cookies.getAll() },
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

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isLoginPage = pathname === '/auth/login'
  const isMfaPage = pathname === '/auth/mfa'
  const isPublicPath = isLoginPage || pathname === '/unauthorized'

  // Unauthenticated — send to login (allow MFA page through so session can verify)
  if (!user && !isPublicPath && !isMfaPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Check MFA assurance level — if the admin has TOTP enrolled but hasn't
    // verified the second factor in this session, redirect to the MFA challenge.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    const needsMfa = aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2'

    if (needsMfa && !isMfaPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/mfa'
      return NextResponse.redirect(url)
    }

    // MFA verified (or not enrolled) — now check admin role.
    // Always query the DB for role; the decoded JWT claim cannot be trusted
    // for authorisation because a tampered claim could bypass the UI-layer check.
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    if (role !== 'admin' && !isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/unauthorized'
      return NextResponse.redirect(url)
    }

    // Authenticated admin — redirect away from login/MFA pages
    if (isLoginPage || isMfaPage) {
      // Only redirect from MFA page if MFA is not needed
      if (!isMfaPage || !needsMfa) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
