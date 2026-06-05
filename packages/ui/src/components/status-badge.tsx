import { cn } from '../lib/utils'
import type { OrderStatus } from '@sendit/types'

const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  accepted: 'bg-blue-100 text-blue-800 border-blue-200',
  picked_up: 'bg-purple-100 text-purple-800 border-purple-200',
  in_transit: 'bg-orange-100 text-orange-800 border-orange-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

interface StatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  )
}
