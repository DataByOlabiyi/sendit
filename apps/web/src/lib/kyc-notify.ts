import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@sendit/notifications'

// Notifies every admin that a rider has submitted (or resubmitted) KYC
// documents for review. Called from every code path that sets
// riders.kyc_status = 'submitted'.
export async function notifyAdminsOfKycSubmission(riderName: string): Promise<void> {
  const admin = createAdminClient()

  const { data: admins } = await admin.from('users').select('id').eq('role', 'admin')
  if (!admins?.length) return

  const title = 'New KYC Submission'
  const body = `${riderName} submitted identity documents for review.`
  const adminIds = admins.map((a) => a.id)

  await admin.from('notifications').insert(
    adminIds.map((userId) => ({
      user_id: userId,
      type: 'system' as const,
      title,
      body,
      is_read: false,
    })),
  )

  sendPushToUsers(admin, adminIds, {
    title,
    body,
    url: '/dashboard/kyc',
    tag: 'kyc-submission',
  }).catch(console.error)
}
