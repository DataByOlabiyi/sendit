import { Resend } from 'resend'

// Gracefully no-ops when RESEND_API_KEY is absent (local dev / staging).
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'security@sendit.ng'

export async function sendAccountLockoutEmail(email: string): Promise<void> {
  const resend = getResend()
  if (!resend) return

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Unusual sign-in activity on your SendIt account',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <div style="margin-bottom:24px">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;background:#f97316;border-radius:10px">
              <span style="color:white;font-size:20px">&#10141;</span>
            </span>
          </div>
          <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px">Security alert</h2>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 16px">
            We detected 5 consecutive failed login attempts on your SendIt account.
            Your account has been temporarily locked for <strong>15 minutes</strong> as a precaution.
          </p>
          <div style="background:#fef3c7;border-radius:10px;padding:16px;margin-bottom:24px">
            <p style="color:#92400e;font-size:13px;margin:0">
              If this was you, wait 15 minutes and try again. If it wasn&rsquo;t you,
              consider resetting your password immediately.
            </p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://sendit.ng'}/auth/forgot-password"
             style="display:inline-block;background:#f97316;color:white;font-size:14px;font-weight:600;
                    padding:12px 24px;border-radius:10px;text-decoration:none">
            Reset my password
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">
            You&rsquo;re receiving this because someone attempted to sign into your SendIt account.
          </p>
        </div>
      `,
      text: `Security alert: 5 consecutive failed login attempts were made on your SendIt account. Your account is locked for 15 minutes. If this wasn't you, reset your password at ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://sendit.ng'}/auth/forgot-password`,
    })
  } catch {
    // Fire-and-forget — never block the auth flow
  }
}
