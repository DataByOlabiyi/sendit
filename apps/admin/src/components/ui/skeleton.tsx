function pulse(className: string) {
  return `animate-pulse ${className}`
}

export function AdminTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="px-6 py-4 border-b border-gray-50 flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 bg-gray-100 rounded-lg" style={{ width: `${[15, 25, 20, 12][i - 1]}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4 border-b border-gray-50 last:border-0 flex gap-4 items-center">
          <div className="h-4 bg-gray-100 rounded-lg w-[15%]" />
          <div className="h-4 bg-gray-100 rounded-lg w-[25%]" />
          <div className="h-4 bg-gray-100 rounded-lg w-[20%]" />
          <div className="h-5 w-20 bg-gray-100 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function AdminStatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4 mb-6 animate-pulse`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100" />
          <div className="h-8 w-24 bg-gray-200 rounded-xl" />
          <div className="h-3 w-32 bg-gray-100 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function AdminPageSkeleton({ statCount = 4, rows = 8 }: { statCount?: number; rows?: number }) {
  return (
    <div className="px-6 py-8">
      <div className="mb-8 animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded-xl mb-2" />
        <div className="h-4 w-56 bg-gray-100 rounded-lg" />
      </div>
      {statCount > 0 && <AdminStatCardsSkeleton count={statCount} />}
      <AdminTableSkeleton rows={rows} />
    </div>
  )
}

export function AdminAnalyticsSkeleton() {
  return (
    <div className="px-6 py-8 space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-32 bg-gray-200 rounded-xl mb-2" />
        <div className="h-4 w-48 bg-gray-100 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
            <div className="h-3 w-20 bg-gray-100 rounded-lg" />
            <div className="h-8 w-28 bg-gray-200 rounded-xl" />
            <div className="h-3 w-16 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 h-64" />
        <div className="bg-white rounded-2xl border border-gray-100 p-5 h-64" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 h-48" />
    </div>
  )
}

export function AdminOpsSkeleton() {
  return (
    <div className="px-6 py-8 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-xl mb-2" />
      <div className="h-4 w-64 bg-gray-100 rounded-lg mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
            <div className="h-3 w-24 bg-gray-100 rounded-lg" />
            <div className="h-8 w-16 bg-gray-200 rounded-xl" />
          </div>
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="h-5 w-36 bg-gray-200 rounded-lg" />
          {[1, 2].map((j) => (
            <div key={j} className="h-12 bg-gray-100 rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function AdminSettingsSkeleton() {
  return (
    <div className="px-6 py-8 max-w-2xl animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded-xl mb-2" />
      <div className="h-4 w-56 bg-gray-100 rounded-lg mb-8" />
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-28 bg-gray-100 rounded-lg" />
            <div className="h-12 bg-gray-100 rounded-xl" />
          </div>
        ))}
        <div className="h-12 w-36 bg-orange-100 rounded-xl mt-2" />
      </div>
    </div>
  )
}
