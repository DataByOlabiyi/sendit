import { Resend } from 'resend'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'security@sendit.ng'

export async function sendAdminLockoutEmail(email: string): Promise<void> {
  const resend = getResend()
  if (!resend) return

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Admin account locked — SendIt',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px">Admin account locked</h2>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 16px">
            5 consecutive failed login attempts were made on the SendIt admin panel using this email address.
            The account has been locked for <strong>15 minutes</strong>.
          </p>
          <div style="background:#fef2f2;border-radius:10px;padding:16px;margin-bottom:24px">
            <p style="color:#991b1b;font-size:13px;margin:0;font-weight:600">
              If this wasn&rsquo;t you, treat this as a potential credential compromise.
              Change your password immediately and review recent admin actions.
            </p>
          </div>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">
            SendIt Platform Security
          </p>
        </div>
      `,
      text: `Admin account locked: 5 consecutive failed login attempts on the SendIt admin panel. Locked for 15 minutes. If this wasn't you, change your password immediately.`,
    })
  } catch {
    // Fire-and-forget
  }
}
