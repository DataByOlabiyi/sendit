import Link from 'next/link'

export default function AdminNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 mb-6">Page not found</p>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition text-sm"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
