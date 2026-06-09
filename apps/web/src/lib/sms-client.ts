// SMS and OTP delivery via Termii
// Docs: https://developers.termii.com/messaging

const TERMII_BASE_URL = 'https://api.ng.termii.com/api'

interface SendSmsOptions {
  to: string         // Nigerian phone number e.g. "+2348012345678"
  message: string
  channel?: 'dnd' | 'WhatsApp' | 'generic'
}

export async function sendSms({ to, message, channel = 'dnd' }: SendSmsOptions): Promise<void> {
  const apiKey = process.env.TERMII_API_KEY
  const senderId = process.env.TERMII_SENDER_ID ?? 'SendIt'

  if (!apiKey) {
    console.warn('TERMII_API_KEY not set — SMS skipped')
    return
  }

  const res = await fetch(`${TERMII_BASE_URL}/sms/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      to,
      from: senderId,
      sms: message,
      type: 'plain',
      channel,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Termii SMS error:', err)
  }
}

interface SendOtpOptions {
  to: string
  pin: string
  channel?: 'dnd' | 'WhatsApp' | 'generic'
}

export async function sendOtp({ to, pin, channel = 'dnd' }: SendOtpOptions): Promise<void> {
  const message = `Your SendIt delivery OTP is: ${pin}. Share this code with the rider to confirm delivery.`
  await sendSms({ to, message, channel })
}

export function generateOtp(digits = 4): string {
  return Array.from(
    { length: digits },
    () => Math.floor(Math.random() * 10).toString(),
  ).join('')
}
