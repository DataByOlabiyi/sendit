import { cn } from '@sendit/ui'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded-xl bg-gray-100', className)} />
  )
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
            <div className="h-5 w-20 bg-gray-100 rounded-full" />
          </div>
          <div className="h-4 w-3/4 bg-gray-100 rounded-lg" />
          <div className="h-3 w-1/2 bg-gray-100 rounded-lg" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-5 w-16 bg-gray-100 rounded-lg" />
          <div className="h-4 w-12 bg-gray-100 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="px-4 py-6 lg:px-8 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-56 bg-gray-200 rounded-xl mb-2" />
        <div className="h-4 w-40 bg-gray-100 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-24 bg-gray-100 rounded-2xl" />
        <div className="h-24 bg-gray-100 rounded-2xl" />
      </div>
      <div className="h-20 bg-orange-100 rounded-2xl" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
