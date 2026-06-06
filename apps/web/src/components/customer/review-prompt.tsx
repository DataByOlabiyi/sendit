'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { submitReviewAction } from '@/app/(customer)/orders/[id]/actions'

interface ReviewPromptProps {
  orderId: string
  riderName: string
}

export function ReviewPrompt({ orderId, riderName }: ReviewPromptProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-100 rounded-2xl p-5 text-center">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-green-800">Thank you for your review!</p>
        <p className="text-xs text-green-600 mt-1">Your feedback helps improve service quality.</p>
      </div>
    )
  }

  async function handleSubmit() {
    if (rating === 0) {
      toast.error('Please select a star rating')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await submitReviewAction({ orderId, rating, comment: comment.trim() || undefined })
      if (result.error) {
        toast.error(result.error)
      } else {
        setSubmitted(true)
        toast.success('Review submitted!')
      }
    } catch {
      toast.error('Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Rate your delivery</h2>
      <p className="text-xs text-gray-500 mb-4">How was your experience with {riderName}?</p>

      {/* Stars */}
      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-1 transition-transform hover:scale-110 touch-manipulation"
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
          >
            <svg
              className={`w-8 h-8 transition-colors ${
                star <= (hoveredRating || rating) ? 'text-yellow-400' : 'text-gray-200'
              }`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-gray-500">
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
          </span>
        )}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment (optional)"
        rows={3}
        maxLength={1000}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-gray-400 mb-4"
      />

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || rating === 0}
        className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl transition text-sm"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  )
}
