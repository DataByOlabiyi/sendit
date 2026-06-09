'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { DisputeType } from '@sendit/types'

interface DisputeFormProps {
  orderId: string
  riderId: string | null
  onSuccess?: () => void
  onCancel?: () => void
}

const DISPUTE_TYPES: { value: DisputeType; label: string; icon: string }[] = [
  { value: 'missing_item',  label: 'Item missing from package',   icon: '📦' },
  { value: 'damaged_item',  label: 'Item arrived damaged',         icon: '💔' },
  { value: 'wrong_delivery', label: 'Wrong delivery location',     icon: '📍' },
  { value: 'late_delivery', label: 'Very late delivery',           icon: '⏱️' },
  { value: 'rider_conduct', label: 'Rider conduct issue',          icon: '🛡️' },
  { value: 'overcharge',    label: 'Charged more than quoted',     icon: '💸' },
  { value: 'other',         label: 'Other issue',                  icon: '❓' },
]

export function DisputeForm({ orderId, riderId, onSuccess, onCancel }: DisputeFormProps) {
  const [type, setType] = useState<DisputeType | ''>('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function handleEvidenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); return }
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `disputes/${orderId}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage
        .from('proof-of-delivery')
        .upload(path, file, { upsert: false })
      if (error) { toast.error('Upload failed'); return }
      const { data: { publicUrl } } = supabase.storage
        .from('proof-of-delivery')
        .getPublicUrl(data.path)
      setEvidenceUrls((prev) => [...prev, publicUrl])
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type) { toast.error('Please select a dispute type'); return }
    if (description.trim().length < 20) {
      toast.error('Please describe the issue in at least 20 characters')
      return
    }
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); return }
      const { error } = await supabase.from('disputes').insert({
        order_id: orderId,
        customer_id: user.id,
        rider_id: riderId,
        type,
        description: description.trim(),
        evidence_urls: evidenceUrls,
        status: 'open',
      })
      if (error) {
        toast.error('Failed to submit dispute')
        return
      }
      toast.success('Dispute submitted. Our team will review within 24 hours.')
      onSuccess?.()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">What went wrong?</label>
        <div className="grid grid-cols-1 gap-2">
          {DISPUTE_TYPES.map((dt) => (
            <button
              key={dt.value}
              type="button"
              onClick={() => setType(dt.value)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition ${
                type === dt.value
                  ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium'
                  : 'border-gray-200 text-gray-700 hover:border-orange-300'
              }`}
            >
              <span className="text-base">{dt.icon}</span>
              <span>{dt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Please describe what happened in detail..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">{description.length}/500</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Evidence (optional)</label>
        <p className="text-xs text-gray-400 mb-2">Upload photos to support your dispute</p>
        {evidenceUrls.map((url, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <span className="text-xs text-green-600">✓ Photo {i + 1} uploaded</span>
            <button
              type="button"
              onClick={() => setEvidenceUrls((prev) => prev.filter((_, j) => j !== i))}
              className="text-xs text-red-500"
            >
              Remove
            </button>
          </div>
        ))}
        {evidenceUrls.length < 3 && (
          <label className="block cursor-pointer">
            <input type="file" accept="image/*" onChange={handleEvidenceUpload} className="sr-only" disabled={uploading} />
            <div className="px-4 py-2.5 rounded-xl border border-dashed border-gray-200 hover:border-orange-300 text-center text-sm text-gray-500 transition">
              {uploading ? 'Uploading...' : '+ Add photo'}
            </div>
          </label>
        )}
      </div>

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 text-sm text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || uploading}
          className="flex-1 py-3 text-sm text-white bg-orange-500 rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : 'Submit Dispute'}
        </button>
      </div>
    </form>
  )
}
