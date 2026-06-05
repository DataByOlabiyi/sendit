'use client'

import Link from 'next/link'
import { formatCurrency, formatDate, formatTime } from '@sendit/utils'
import { StatusBadge } from '@sendit/ui'
import { ORDER_STATUS_LABELS } from '@sendit/constants'
import type { Order, OrderStatus } from '@sendit/types'

const statusSteps: OrderStatus[] = ['pending', 'accepted', 'picked_up', 'in_transit', 'delivered']

interface OrderDetailProps {
  order: Order
}

export function OrderDetail({ order }: OrderDetailProps) {
  const currentStepIndex = statusSteps.indexOf(order.status as OrderStatus)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="px-4 py-6 lg:px-8 max-w-2xl mx-auto">
      {/* Back */}
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to orders
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Order Details</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{order.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Status Timeline */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Delivery Progress</h2>
          <div className="space-y-3">
            {statusSteps.map((step, index) => {
              const isCompleted = index <= currentStepIndex
              const isCurrent = index === currentStepIndex
              return (
                <div key={step} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    isCompleted ? 'bg-orange-500' : 'bg-gray-100'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-gray-300" />
                    )}
                  </div>
                  <span className={`text-sm ${isCurrent ? 'font-semibold text-gray-900' : isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>
                    {ORDER_STATUS_LABELS[step]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
          <p className="text-sm font-medium text-red-700">This order was cancelled</p>
          {order.cancelled_reason && (
            <p className="text-xs text-red-500 mt-1">{order.cancelled_reason}</p>
          )}
        </div>
      )}

      {/* Route */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Route</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium">PICKUP</p>
              <p className="text-sm text-gray-700 mt-0.5">{order.pickup_address}</p>
            </div>
          </div>
          <div className="ml-1 w-0.5 h-4 bg-gray-200" />
          <div className="flex items-start gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-900 mt-1.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium">DELIVERY</p>
              <p className="text-sm text-gray-700 mt-0.5">{order.delivery_address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Package Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Package</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">Description</p>
            <p className="text-gray-700 mt-0.5">{order.package_description}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Size</p>
            <p className="text-gray-700 mt-0.5 capitalize">{order.package_size.replace('_', ' ')}</p>
          </div>
          {order.is_fragile && (
            <div>
              <p className="text-xs text-orange-500 font-medium">⚠️ Fragile</p>
            </div>
          )}
          {order.has_insurance && (
            <div>
              <p className="text-xs text-green-500 font-medium">✅ Insured</p>
            </div>
          )}
        </div>
        {order.special_instructions && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Special Instructions</p>
            <p className="text-sm text-gray-700 mt-0.5">{order.special_instructions}</p>
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Pricing</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Base fee</span>
            <span className="text-gray-700">{formatCurrency(order.base_fee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Distance fee</span>
            <span className="text-gray-700">{formatCurrency(order.distance_fee)}</span>
          </div>
          {order.insurance_fee > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Insurance</span>
              <span className="text-gray-700">{formatCurrency(order.insurance_fee)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-100 font-semibold">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">{formatCurrency(order.total_fee)}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">{formatDate(order.created_at)} at {formatTime(order.created_at)}</p>
      </div>

      {/* Actions */}
      {(order.status === 'in_transit' || order.status === 'accepted' || order.status === 'picked_up') && (
        <Link
          href={`/track/${order.id}`}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Track Live
        </Link>
      )}
    </div>
  )
}
