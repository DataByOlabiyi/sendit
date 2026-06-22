import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const updateClaimSchema = z.object({
  claimId: z.string().uuid('Invalid claim ID'),
  status: z.enum(['under_review', 'approved', 'paid', 'rejected']),
  payoutAmount: z.number().int().positive().optional(),
  resolutionNote: z.string().max(1000).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = updateClaimSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { claimId, status, payoutAmount, resolutionNote } = parsed.data

  const admin = createAdminClient()

  const updates: Record<string, unknown> = {
    status,
    resolved_by: user.id,
    resolved_at: ['approved', 'paid', 'rejected'].includes(status) ? new Date().toISOString() : null,
  }
  if (payoutAmount !== undefined) updates.payout_amount = payoutAmount
  if (resolutionNote !== undefined) updates.resolution_note = resolutionNote

  const { error } = await admin
    .from('insurance_claims')
    .update(updates)
    .eq('id', claimId)

  if (error) {
    console.error('Claim update error:', error)
    return NextResponse.json({ error: 'Failed to update claim' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
