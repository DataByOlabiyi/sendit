import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If a specific next param was provided (e.g. password reset), honour it.
      // Validate it is an internal path before redirecting to prevent open-redirect
      // attacks where a crafted link sends the user to an external domain.
      if (next) {
        const isSafePath = next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')
        return NextResponse.redirect(`${origin}${isSafePath ? next : '/dashboard'}`)
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile?.role === 'rider') {
          return NextResponse.redirect(`${origin}/rider/dashboard`)
        }
      }
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=verification_failed`)
}
