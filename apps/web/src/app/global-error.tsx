'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '1rem',
          textAlign: 'center',
        }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              A critical error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#f97316',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
