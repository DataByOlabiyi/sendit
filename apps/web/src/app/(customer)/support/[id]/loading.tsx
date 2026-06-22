export default function SupportTicketLoading() {
  return (
    <div className="px-4 py-6 lg:px-8 max-w-3xl mx-auto space-y-4 animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gray-200 rounded-xl" />
        <div className="h-7 w-48 bg-gray-200 rounded-xl" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="flex justify-between">
          <div className="h-4 w-32 bg-gray-100 rounded-lg" />
          <div className="h-5 w-20 bg-gray-100 rounded-full" />
        </div>
        <div className="h-3 w-24 bg-gray-100 rounded-lg" />
        <div className="h-3 w-40 bg-gray-100 rounded-lg" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 w-3/4 space-y-2">
              <div className="h-4 w-full bg-gray-100 rounded-lg" />
              <div className="h-4 w-2/3 bg-gray-100 rounded-lg" />
              <div className="h-3 w-20 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="h-20 bg-gray-100 rounded-xl" />
        <div className="h-10 w-24 bg-orange-100 rounded-xl" />
      </div>
    </div>
  )
}
