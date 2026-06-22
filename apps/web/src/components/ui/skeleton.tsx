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

export function RiderEarningsSkeleton() {
  return (
    <div className="px-4 py-6 lg:px-8 max-w-4xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded-xl mb-2" />
      <div className="h-4 w-56 bg-gray-100 rounded-xl mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
            <div className="h-3 w-24 bg-gray-100 rounded-lg" />
            <div className="h-7 w-28 bg-gray-200 rounded-xl" />
            <div className="h-3 w-16 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="h-4 w-32 bg-gray-200 rounded-xl mt-6 mb-3" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex justify-between">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-100 rounded-lg" />
              <div className="h-3 w-20 bg-gray-100 rounded-lg" />
            </div>
            <div className="h-5 w-16 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function RiderOrdersSkeleton() {
  return (
    <div className="px-4 py-6 lg:px-8 max-w-4xl mx-auto animate-pulse">
      <div className="h-8 w-36 bg-gray-200 rounded-xl mb-2" />
      <div className="h-4 w-48 bg-gray-100 rounded-xl mb-6" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function RiderRatingsSkeleton() {
  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-6">
          <div className="space-y-2">
            <div className="h-12 w-16 bg-gray-200 rounded-xl" />
            <div className="h-4 w-20 bg-gray-100 rounded-lg" />
          </div>
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-3 w-4 bg-gray-100 rounded" />
                <div className="flex-1 h-2 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="h-5 w-24 bg-gray-200 rounded-xl mt-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-28 bg-gray-100 rounded-lg" />
              <div className="h-4 w-16 bg-gray-100 rounded-lg" />
            </div>
            <div className="h-3 w-full bg-gray-100 rounded-lg" />
            <div className="h-3 w-3/4 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-dvh animate-pulse">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <div className="w-8 h-8 rounded-full bg-gray-200" />
        <div className="space-y-1">
          <div className="h-4 w-24 bg-gray-200 rounded-lg" />
          <div className="h-3 w-16 bg-gray-100 rounded-lg" />
        </div>
      </div>
      <div className="flex-1 px-4 py-4 space-y-3 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className={`h-10 rounded-2xl bg-gray-100 ${i % 2 === 0 ? 'w-48' : 'w-56'}`} />
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        <div className="h-12 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  )
}

export function SupportSkeleton() {
  return (
    <div className="px-4 py-6 lg:px-8 max-w-3xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 w-28 bg-gray-200 rounded-xl mb-2" />
      <div className="h-4 w-48 bg-gray-100 rounded-xl mb-6" />
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="h-5 w-36 bg-gray-200 rounded-lg" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="h-5 w-32 bg-gray-200 rounded-lg" />
        <div className="h-12 bg-gray-100 rounded-xl" />
        <div className="h-24 bg-gray-100 rounded-xl" />
        <div className="h-10 w-32 bg-orange-100 rounded-xl" />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex justify-between">
            <div className="space-y-2">
              <div className="h-4 w-40 bg-gray-100 rounded-lg" />
              <div className="h-3 w-24 bg-gray-100 rounded-lg" />
            </div>
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
