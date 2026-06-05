export default function CustomerLoading() {
  return (
    <div className="px-4 py-6 lg:px-8 max-w-4xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-xl" />
        <div className="h-4 w-32 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="h-24 bg-gray-100 rounded-2xl" />
          <div className="h-24 bg-gray-100 rounded-2xl" />
        </div>
        <div className="h-20 bg-gray-100 rounded-2xl" />
        <div className="space-y-2 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
