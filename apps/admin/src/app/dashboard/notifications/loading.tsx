export default function AdminNotificationsLoading() {
  return (
    <div className="px-6 py-8 max-w-2xl animate-pulse">
      <div className="h-8 w-44 bg-gray-200 rounded-xl mb-2" />
      <div className="h-4 w-56 bg-gray-100 rounded-lg mb-8" />
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="space-y-1">
          <div className="h-3 w-20 bg-gray-100 rounded-lg" />
          <div className="h-12 bg-gray-100 rounded-xl" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-16 bg-gray-100 rounded-lg" />
          <div className="h-12 bg-gray-100 rounded-xl" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-16 bg-gray-100 rounded-lg" />
          <div className="h-28 bg-gray-100 rounded-xl" />
        </div>
        <div className="h-12 w-36 bg-orange-100 rounded-xl" />
      </div>
    </div>
  )
}
