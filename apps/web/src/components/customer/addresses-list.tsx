'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Address } from '@sendit/types'

interface AddressesListProps {
  addresses: Address[]
  userId: string
}

export function AddressesList({ addresses: initialAddresses, userId }: AddressesListProps) {
  const [addresses, setAddresses] = useState(initialAddresses)

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
    <div>
      {addresses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">No saved addresses</p>
          <p className="text-xs text-gray-500 mt-1">Addresses you save will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`bg-white rounded-2xl border p-4 ${address.is_default ? 'border-orange-200' : 'border-gray-100'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900">{address.label}</p>
                    {address.is_default && (
                      <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full font-medium">Default</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{address.full_address}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
                    className="text-xs text-red-400 hover:text-red-500"
                  >
                    Delete
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
