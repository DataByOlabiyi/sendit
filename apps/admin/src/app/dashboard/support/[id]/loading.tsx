export default function AdminSupportTicketLoading() {
  return (
    <div className="px-6 py-8 max-w-3xl animate-pulse">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 bg-gray-200 rounded-xl" />
        <div className="h-7 w-56 bg-gray-200 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="h-5 w-40 bg-gray-200 rounded-lg" />
            <div className="h-4 w-full bg-gray-100 rounded-lg" />
            <div className="h-4 w-3/4 bg-gray-100 rounded-lg" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-gray-100 rounded-lg" />
                <div className="h-3 w-16 bg-gray-100 rounded-lg" />
              </div>
              <div className="h-4 w-full bg-gray-100 rounded-lg" />
              <div className="h-4 w-2/3 bg-gray-100 rounded-lg" />
            </div>
          ))}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="h-20 bg-gray-100 rounded-xl" />
            <div className="h-10 w-24 bg-orange-100 rounded-xl" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-16 bg-gray-100 rounded-lg" />
                <div className="h-4 w-32 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
          <div className="h-10 bg-gray-100 rounded-xl" />
          <div className="h-10 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
