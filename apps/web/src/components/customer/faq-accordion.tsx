'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'How do I track my delivery?',
    a: 'Go to My Orders, tap an active order, and you\'ll see your rider\'s live location on the map along with real-time status updates.',
  },
  {
    q: 'Can I cancel an order?',
    a: 'You can cancel a pending order before a rider accepts it. Once a rider is on the way, cancellation may incur a small fee. Go to the order detail page and tap "Cancel Order".',
  },
  {
    q: 'What happens if my rider doesn\'t show up?',
    a: 'If your rider hasn\'t arrived within 15 minutes of the expected time, you\'ll be automatically re-matched with another rider. You can also contact us via a support ticket for immediate help.',
  },
  {
    q: 'How long does a delivery take?',
    a: 'Typical deliveries within the same area take 30–60 minutes. Cross-city deliveries may take 1–3 hours depending on traffic. You\'ll see an estimated time when booking.',
  },
  {
    q: 'How do I get a refund?',
    a: 'Refunds for failed or cancelled deliveries are processed within 3–5 business days back to your original payment method. Open a support ticket with your order reference to request a refund.',
  },
]

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="divide-y divide-gray-100">
      {FAQS.map((faq, i) => (
        <div key={i}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 py-3.5 text-left"
          >
            <span className="text-sm font-medium text-gray-900">{faq.q}</span>
            <svg
              className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === i && (
            <p className="text-sm text-gray-500 pb-4 leading-relaxed">{faq.a}</p>
          )}
        </div>
      ))}
    </div>
  )
}
