import { OrderCardSkeleton } from '@/components/ui/skeleton'

export default function OrdersLoading() {
  return (
    <div className="px-4 py-6 lg:px-8 max-w-4xl mx-auto">
      <div className="h-8 w-32 bg-gray-200 rounded-xl animate-pulse mb-2" />
      <div className="h-4 w-48 bg-gray-100 rounded-xl animate-pulse mb-6" />
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-20 bg-gray-100 rounded-full animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
