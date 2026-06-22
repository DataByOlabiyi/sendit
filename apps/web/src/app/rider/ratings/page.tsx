import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { RiderRatings } from '@/components/rider/ratings'

export const metadata: Metadata = { title: 'My Ratings' }

export default async function RiderRatingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rider } = await supabase
    .from('riders')
    .select('id, rating, total_deliveries')
    .eq('user_id', user!.id)
    .single()

  const { data: reviews } = rider
    ? await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, reviewer:reviewer_id(full_name)')
        .eq('reviewee_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  const safeReviews = (reviews ?? []) as unknown as {
    id: string
    rating: number
    comment: string | null
    created_at: string
    reviewer: { full_name: string } | null
  }[]

  const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of safeReviews) {
    if (r.rating >= 1 && r.rating <= 5) ratingBreakdown[r.rating]++
  }

  return (
    <RiderRatings
      rating={rider?.rating ?? 5.0}
      totalDeliveries={rider?.total_deliveries ?? 0}
      reviews={safeReviews}
      ratingBreakdown={ratingBreakdown}
    />
  )
}
