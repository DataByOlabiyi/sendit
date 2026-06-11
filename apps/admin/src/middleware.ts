import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Decodes a JWT payload without verifying the signature.
// Safe here because getUser() has already verified the token with Supabase.
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return {}
  }
}

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

  // Verify the token with Supabase (1 JWKS verification — no DB call)
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isPublicPath = pathname === '/auth/login' || pathname === '/unauthorized'

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Prefer the JWT claim set by custom_access_token_hook (zero extra DB calls).
    // Falls back to a DB query for tokens issued before the hook was registered.
    const sessionCookie = request.cookies.getAll().find(
      (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'),
    )
    let role: string | undefined

    if (sessionCookie) {
      try {
        const tokenData = JSON.parse(decodeURIComponent(sessionCookie.value))
        const accessToken = Array.isArray(tokenData) ? tokenData[0] : tokenData?.access_token
        if (accessToken) {
          const claims = decodeJwtPayload(accessToken)
          role = claims.user_role as string | undefined
        }
      } catch { /* fall through to DB */ }
    }

    if (!role) {
      // Fallback DB query — only runs while tokens lack the custom claim
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      role = profile?.role
    }

    if (role !== 'admin' && !isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/unauthorized'
      return NextResponse.redirect(url)
    }

    if (pathname === '/auth/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
