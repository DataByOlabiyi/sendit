import { Resend } from 'resend'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@sendit.ng'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sendit.ng'

export async function sendKycNeedsInfoEmail(
  email: string,
  fullName: string,
  adminQuestion: string,
): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const firstName = fullName.split(' ')[0] ?? 'Rider'

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Action required — your SendIt rider application',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <div style="margin-bottom:24px">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;background:#3b82f6;border-radius:10px;color:white;font-size:18px;font-weight:700">?</span>
          </div>
          <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px">Hi ${firstName}, we need a bit more from you</h2>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px">
            Our team reviewed your SendIt rider application and has a question before we can proceed.
          </p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin-bottom:24px">
            <p style="color:#1e40af;font-size:13px;font-weight:600;margin:0 0 6px">Message from our team:</p>
            <p style="color:#1d4ed8;font-size:14px;margin:0;line-height:1.5">${adminQuestion}</p>
          </div>
          <a href="${APP_URL}/rider/onboarding"
             style="display:inline-block;background:#f97316;color:white;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none">
            Open my application
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">
            Log in to your SendIt rider account to respond to this request.
          </p>
        </div>
      `,
      text: `Hi ${firstName}, our team needs more information before we can proceed with your SendIt rider application.\n\nMessage: ${adminQuestion}\n\nLog in at ${APP_URL}/rider/onboarding to respond.`,
    })
  } catch {
    // Fire-and-forget
  }
}

export async function sendKycApprovedEmail(email: string, fullName: string): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const firstName = fullName.split(' ')[0] ?? 'Rider'

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "You're approved! Start delivering with SendIt",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <div style="margin-bottom:24px">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;background:#22c55e;border-radius:10px;color:white;font-size:18px">✓</span>
          </div>
          <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px">Congratulations, ${firstName}!</h2>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px">
            Your SendIt rider application has been approved. You can now log in and start accepting deliveries.
          </p>
          <a href="${APP_URL}/rider/dashboard"
             style="display:inline-block;background:#f97316;color:white;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none">
            Start delivering
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Welcome to the SendIt team!</p>
        </div>
      `,
      text: `Congratulations ${firstName}! Your SendIt rider application has been approved. Log in at ${APP_URL}/rider/dashboard to start delivering.`,
    })
  } catch {
    // Fire-and-forget
  }
}

export async function sendKycRejectedEmail(
  email: string,
  fullName: string,
  reason?: string,
): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const firstName = fullName.split(' ')[0] ?? 'Rider'

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Update on your SendIt rider application',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px">Hi ${firstName},</h2>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 16px">
            After reviewing your SendIt rider application, we&rsquo;re unable to approve it at this time.
          </p>
          ${reason ? `
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-bottom:20px">
            <p style="color:#991b1b;font-size:13px;font-weight:600;margin:0 0 4px">Reason:</p>
            <p style="color:#b91c1c;font-size:14px;margin:0">${reason}</p>
          </div>
          ` : ''}
          <p style="color:#6b7280;font-size:14px;margin:0 0 24px">
            You may update your details and resubmit your application.
          </p>
          <a href="${APP_URL}/rider/onboarding"
             style="display:inline-block;background:#f97316;color:white;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none">
            Resubmit my application
          </a>
        </div>
      `,
      text: `Hi ${firstName}, your SendIt rider application was not approved.${reason ? ` Reason: ${reason}.` : ''} You may resubmit at ${APP_URL}/rider/onboarding`,
    })
  } catch {
    // Fire-and-forget
  }
}

export async function sendKycBannedEmail(email: string, fullName: string): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const firstName = fullName.split(' ')[0] ?? 'Rider'

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Your SendIt account has been suspended',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px">Hi ${firstName},</h2>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 16px">
            Following a review by our team, your SendIt rider account has been permanently suspended.
          </p>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 16px">
            If you believe this is a mistake, please contact us at
            <a href="mailto:support@sendit.ng" style="color:#f97316">support@sendit.ng</a>.
          </p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">SendIt Platform</p>
        </div>
      `,
      text: `Hi ${firstName}, your SendIt rider account has been permanently suspended. If you believe this is a mistake, contact us at support@sendit.ng.`,
    })
  } catch {
    // Fire-and-forget
  }
}
