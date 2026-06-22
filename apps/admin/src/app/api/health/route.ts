import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('users').select('id').limit(1)
    if (error) throw error

    return NextResponse.json({ status: 'ok', ts: new Date().toISOString() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ status: 'error', message }, { status: 503 })
  }
}
