// Paystack client-side utilities

export interface PaystackConfig {
  key: string
  email: string
  amount: number // in kobo (multiply NGN by 100)
  reference: string
  currency?: string
  metadata?: Record<string, unknown>
  onSuccess: (reference: string) => void
  onClose: () => void
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: {
        key: string
        email: string
        amount: number
        ref: string
        currency: string
        metadata?: Record<string, unknown>
        callback: (response: { reference: string }) => void
        onClose: () => void
      }) => { openIframe: () => void }
    }
  }
}

export function loadPaystack(): Promise<void> {
  return new Promise((resolve) => {
    if (window.PaystackPop) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.onload = () => resolve()
    document.head.appendChild(script)
  })
}

export async function initializePaystackPayment(config: PaystackConfig): Promise<void> {
  await loadPaystack()

  const handler = window.PaystackPop.setup({
    key: config.key,
    email: config.email,
    amount: config.amount * 100, // convert to kobo
    ref: config.reference,
    currency: config.currency ?? 'NGN',
    metadata: config.metadata,
    callback: (response) => {
      config.onSuccess(response.reference)
    },
    onClose: config.onClose,
  })

  handler.openIframe()
}

export function generatePaystackReference(orderId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `SDT-${orderId.slice(0, 8)}-${timestamp}-${random}`
}
