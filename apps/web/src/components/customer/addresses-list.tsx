'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { AddressAutocomplete } from '@/components/maps/address-autocomplete'
import type { Address } from '@sendit/types'
import type { PlaceDetails } from '@/hooks/use-places-autocomplete'

const LABEL_PRESETS = ['Home', 'Office', 'Other']

interface AddressesListProps {
  addresses: Address[]
  userId: string
}

export function AddressesList({ addresses: initialAddresses, userId }: AddressesListProps) {
  const [addresses, setAddresses] = useState(initialAddresses)
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('Home')
  const [customLabel, setCustomLabel] = useState('')
  const [place, setPlace] = useState<PlaceDetails | null>(null)
  const [addressValue, setAddressValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleAdd() {
    const finalLabel = label === 'Other' ? customLabel.trim() : label
    if (!finalLabel) { toast.error('Please enter a label'); return }
    if (!place) { toast.error('Please select an address from the suggestions'); return }

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('addresses')
        .insert({
          user_id: userId,
          label: finalLabel,
          full_address: place.address,
          lat: place.lat,
          lng: place.lng,
          is_default: addresses.length === 0,
        })
        .select()
        .single()
      if (error) throw error
      setAddresses((prev) => [...prev, data as Address])
      toast.success('Address saved')
      setShowForm(false)
      setLabel('Home')
      setCustomLabel('')
      setPlace(null)
      setAddressValue('')
    } catch {
      toast.error('Failed to save address')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('addresses').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete address')
    } else {
      setAddresses((prev) => prev.filter((a) => a.id !== id))
      toast.success('Address deleted')
    }
  }

  async function handleSetDefault(id: string) {
    const supabase = createClient()
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId)
    const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id)
    if (error) {
      toast.error('Failed to set default address')
    } else {
      setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })))
      toast.success('Default address updated')
    }
  }

  return (
    <div className="space-y-4">
      {/* Add address button / form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/40 text-sm font-medium text-gray-500 hover:text-orange-600 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Address
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-orange-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">New Address</h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Label presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
              <div className="flex gap-2 mb-2">
                {LABEL_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setLabel(preset)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      label === preset
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              {label === 'Other' && (
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Gym, School"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
                />
              )}
            </div>

            {/* Address search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
              <AddressAutocomplete
                value={addressValue}
                placeholder="Search for your address"
                onSelect={(details: PlaceDetails) => {
                  setPlace(details)
                  setAddressValue(details.address)
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={isSaving}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
            >
              {isSaving ? 'Saving…' : 'Save Address'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {addresses.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-900">No saved addresses</p>
          <p className="text-xs text-gray-500 mt-1">Save your frequent locations for faster booking</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add your first address
          </button>
        </div>
      )}

      {/* Address list */}
      {addresses.length > 0 && (
        <div className="space-y-3">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`bg-white rounded-2xl border p-4 ${address.is_default ? 'border-orange-200' : 'border-gray-100'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${address.is_default ? 'bg-orange-100' : 'bg-gray-100'}`}>
                    <svg className={`w-4 h-4 ${address.is_default ? 'text-orange-500' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900">{address.label}</p>
                      {address.is_default && (
                        <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full font-medium">Default</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{address.full_address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!address.is_default && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                    >
                      Set default
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
