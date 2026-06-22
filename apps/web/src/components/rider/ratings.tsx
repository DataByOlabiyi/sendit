'use client'

import { formatRelativeTime } from '@sendit/utils'
import { EmptyState } from '@sendit/ui'
import { Star } from 'lucide-react'

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer?: { full_name: string } | null
}

interface RiderRatingsProps {
  rating: number
  totalDeliveries: number
  reviews: Review[]
  ratingBreakdown: Record<number, number>
}

function StarDisplay({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-7 h-7' }
  const cls = sizes[size]
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${cls} ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

const LABELS: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great', 5: 'Excellent' }

export function RiderRatings({ rating, totalDeliveries, reviews, ratingBreakdown }: RiderRatingsProps) {
  const totalReviews = reviews.length

  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Ratings</h1>
        <p className="text-sm text-gray-500 mt-1">What customers say about your deliveries</p>
      </div>

      {/* Overall score */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-5xl font-bold text-gray-900">{rating.toFixed(1)}</p>
            <StarDisplay rating={rating} size="lg" />
            <p className="text-xs text-gray-400 mt-1">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingBreakdown[star] ?? 0
              const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-4 shrink-0">{star}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-7 text-right shrink-0">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 text-sm text-gray-500">
          <span><strong className="text-gray-900">{totalDeliveries}</strong> total deliveries</span>
        </div>
      </div>

      {/* Reviews list */}
      <div className="space-y-3">
        {totalReviews === 0 ? (
          <EmptyState
            icon={Star}
            title="No reviews yet"
            description="Complete deliveries to start receiving customer feedback"
          />
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <StarDisplay rating={review.rating} size="sm" />
                  <span className="text-xs font-medium text-gray-700">{LABELS[review.rating]}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{formatRelativeTime(review.created_at)}</span>
              </div>
              {review.comment && (
                <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
              )}
              {review.reviewer && (
                <p className="text-xs text-gray-400 mt-2">— {review.reviewer.full_name}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
