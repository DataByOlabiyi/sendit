'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { riderBankAccountSchema } from '@sendit/validations'

export async function saveRiderBankAccountAction(data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = riderBankAccountSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid bank account details' }
  }

  const { error } = await supabase
    .from('riders')
    .update({
      bank_account_number: parsed.data.bank_account_number,
      bank_code:           parsed.data.bank_code,
      bank_name:           parsed.data.bank_name,
      bank_account_name:   parsed.data.bank_account_name,
    })
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to save bank account details' }

  revalidatePath('/rider/profile')
  revalidatePath('/rider/earnings')
  return { success: true }
}

export async function requestPayoutAction(amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rider } = await supabase
    .from('riders')
    .select('id, bank_account_number, bank_code, paystack_recipient_code')
    .eq('user_id', user.id)
    .single()

  if (!rider) return { error: 'Rider not found' }

  if (!rider.bank_account_number || !rider.bank_code) {
    return { error: 'Please add your bank account details before requesting a payout' }
  }

  if (amount < 500) return { error: 'Minimum payout amount is ₦500' }

  // Verify wallet has sufficient balance
  const { data: wallet } = await supabase
    .from('rider_wallets')
    .select('balance')
    .eq('rider_id', rider.id)
    .single()

  if (!wallet || wallet.balance < amount) {
    return { error: 'Insufficient wallet balance' }
  }

  const { error } = await supabase.from('rider_payouts').insert({
    rider_id: rider.id,
    amount,
    status: 'pending',
    initiated_at: new Date().toISOString(),
  })

  if (error) return { error: 'Failed to create payout request' }

  revalidatePath('/rider/earnings')
  return { success: true }
}
