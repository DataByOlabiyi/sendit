export default function SecurityEventsLoading() {
  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-gray-100 rounded mt-2 animate-pulse" />
      </div>
      <div className="flex gap-3 mb-6">
        <div className="h-9 w-40 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-9 w-56 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-9 w-32 bg-gray-100 rounded-xl animate-pulse" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex gap-4 px-5 py-4 border-b border-gray-50">
            <div className="h-5 w-40 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
            <div className="h-5 w-28 bg-gray-100 rounded animate-pulse" />
            <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
            <div className="h-5 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
