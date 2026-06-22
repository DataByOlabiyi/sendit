export default function RiderOnboardingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white px-4 py-12 animate-pulse">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-200 mb-4" />
          <div className="h-7 w-64 bg-gray-200 rounded-xl mx-auto mb-2" />
          <div className="h-4 w-80 bg-gray-100 rounded-lg mx-auto" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-24 bg-gray-100 rounded-lg" />
              <div className="h-12 bg-gray-100 rounded-xl" />
            </div>
          ))}
          <div className="h-12 bg-orange-100 rounded-xl mt-2" />
        </div>
      </div>
    </div>
  )
}
