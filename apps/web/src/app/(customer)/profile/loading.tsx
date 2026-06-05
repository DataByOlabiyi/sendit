export default function ProfileLoading() {
  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 w-32 bg-gray-200 rounded-xl mb-6" />
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-200" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-gray-200 rounded-lg" />
            <div className="h-4 w-48 bg-gray-100 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="h-5 w-40 bg-gray-200 rounded-lg" />
        <div className="h-12 bg-gray-100 rounded-xl" />
        <div className="h-12 bg-gray-100 rounded-xl" />
        <div className="h-12 bg-gray-100 rounded-xl" />
        <div className="h-12 bg-orange-100 rounded-xl" />
      </div>
    </div>
  )
}
