'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  respondToAdminKycRequestAction,
  uploadRiderDocToStorageAction,
  uploadRiderDocumentAction,
} from '@/app/rider/profile-actions'
import { riderProfileSchema } from '@sendit/validations'
import { PasswordInput } from '@sendit/ui'

const VEHICLE_TYPES = [
  { value: 'bicycle',    label: '🚲 Bicycle' },
  { value: 'motorcycle', label: '🏍️ Motorcycle' },
  { value: 'car',        label: '🚗 Car' },
  { value: 'van',        label: '🚐 Van' },
] as const

interface DocState {
  file: File | null
  storagePath: string | null
  isUploading: boolean
  error: string | null
}

const EMPTY_DOC: DocState = { file: null, storagePath: null, isUploading: false, error: null }

function DocUploadButton({
  label,
  state,
  onFileChange,
}: {
  label: string
  state: DocState
  onFileChange: (file: File) => void
}) {
  return (
    <label className="block cursor-pointer">
      <span className="block text-xs font-medium text-gray-600 mb-1.5">{label}</span>
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFileChange(f)
          e.target.value = ''
        }}
        className="sr-only"
      />
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition ${
        state.storagePath
          ? 'border-green-400 bg-green-50'
          : state.error
          ? 'border-red-300 bg-red-50'
          : 'border-gray-200 hover:border-orange-300 bg-gray-50'
      }`}>
        {state.isUploading ? (
          <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />
        ) : state.storagePath ? (
          <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        )}
        <span className="text-xs text-gray-600">
          {state.isUploading
            ? 'Uploading...'
            : state.storagePath
            ? `✓ ${state.file?.name}`
            : state.error
            ? state.error
            : 'Tap to upload replacement'}
        </span>
      </div>
    </label>
  )
}

export function NeedsInfoForm({
  adminQuestion,
  existingBvn,
  existingNin,
  existingVehicleType,
  existingVehiclePlate,
  existingVehicleModel,
  existingLicenseNumber,
}: {
  adminQuestion: string
  existingBvn?: string
  existingNin?: string
  existingVehicleType?: string
  existingVehiclePlate?: string
  existingVehicleModel?: string
  existingLicenseNumber?: string
}) {
  const [note, setNote] = useState('')
  const [bvn, setBvn] = useState(existingBvn ?? '')
  const [nin, setNin] = useState(existingNin ?? '')
  const [identityError, setIdentityError] = useState<string | null>(null)
  const [vehicleType, setVehicleType] = useState(existingVehicleType ?? 'motorcycle')
  const [vehiclePlate, setVehiclePlate] = useState(existingVehiclePlate ?? '')
  const [vehicleModel, setVehicleModel] = useState(existingVehicleModel ?? '')
  const [licenseNumber, setLicenseNumber] = useState(existingLicenseNumber ?? '')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [licenseDoc, setLicenseDoc] = useState<DocState>(EMPTY_DOC)
  const [vehicleDoc, setVehicleDoc] = useState<DocState>(EMPTY_DOC)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function uploadDoc(
    file: File,
    docType: 'license' | 'vehicle',
    setState: React.Dispatch<React.SetStateAction<DocState>>,
  ) {
    setState({ file, storagePath: null, isUploading: true, error: null })

    const formData = new FormData()
    formData.append('file', file)
    const result = await uploadRiderDocToStorageAction(docType, formData)

    if (result.error) {
      setState({ file, storagePath: null, isUploading: false, error: result.error })
      return
    }
    setState({ file, storagePath: result.path!, isUploading: false, error: null })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    const profileParsed = riderProfileSchema.safeParse({
      vehicle_type: vehicleType,
      vehicle_plate: vehiclePlate,
      vehicle_model: vehicleModel,
      license_number: licenseNumber,
    })
    if (!profileParsed.success) {
      setProfileError(profileParsed.error.issues[0]?.message ?? 'Check your vehicle & license details')
      return
    }
    setProfileError(null)

    if (bvn && !/^\d{11}$/.test(bvn)) {
      setIdentityError('BVN must be exactly 11 digits')
      return
    }
    if (nin && !/^\d{11}$/.test(nin)) {
      setIdentityError('NIN must be exactly 11 digits')
      return
    }
    setIdentityError(null)

    setIsLoading(true)
    try {
      const uploadTasks: Promise<unknown>[] = []
      if (licenseDoc.storagePath) {
        uploadTasks.push(uploadRiderDocumentAction('license', licenseDoc.storagePath))
      }
      if (vehicleDoc.storagePath) {
        uploadTasks.push(uploadRiderDocumentAction('vehicle', vehicleDoc.storagePath))
      }
      await Promise.all(uploadTasks)

      const result = await respondToAdminKycRequestAction({
        note: note.trim() || undefined,
        licenseStoragePath: licenseDoc.storagePath ?? undefined,
        vehicleStoragePath: vehicleDoc.storagePath ?? undefined,
        bvn: bvn.trim() || undefined,
        nin: nin.trim() || undefined,
        ...profileParsed.data,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Response submitted — awaiting admin review.')
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Admin's question */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Admin message</p>
        <p className="text-sm text-blue-800 leading-relaxed">{adminQuestion}</p>
      </div>

      {/* Vehicle & license details */}
      <div className="pt-2 border-t border-gray-100 space-y-3">
        <p className="text-sm font-semibold text-gray-900">Vehicle & license details</p>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Vehicle Type</label>
          <select
            value={vehicleType}
            onChange={(e) => { setVehicleType(e.target.value); setProfileError(null) }}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            {VEHICLE_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Plate Number</label>
          <input
            type="text"
            value={vehiclePlate}
            onChange={(e) => { setVehiclePlate(e.target.value); setProfileError(null) }}
            placeholder="e.g. ABC-123-XY"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Vehicle Model</label>
          <input
            type="text"
            value={vehicleModel}
            onChange={(e) => { setVehicleModel(e.target.value); setProfileError(null) }}
            placeholder="e.g. Honda CB500, Toyota Camry"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">License Number</label>
          <input
            type="text"
            value={licenseNumber}
            onChange={(e) => { setLicenseNumber(e.target.value); setProfileError(null) }}
            placeholder="Driver's license number"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-gray-400"
          />
        </div>
        {profileError && <p className="text-xs text-red-500">{profileError}</p>}
      </div>

      {/* Identity details */}
      <div className="pt-2 border-t border-gray-100 space-y-3">
        <p className="text-sm font-semibold text-gray-900">
          Identity details <span className="text-gray-400 font-normal">(optional — update if requested)</span>
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">BVN</label>
          <PasswordInput
            inputMode="numeric"
            maxLength={11}
            value={bvn}
            onChange={(e) => { setBvn(e.target.value.replace(/\D/g, '')); setIdentityError(null) }}
            placeholder="11-digit Bank Verification Number"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">NIN</label>
          <PasswordInput
            inputMode="numeric"
            maxLength={11}
            value={nin}
            onChange={(e) => { setNin(e.target.value.replace(/\D/g, '')); setIdentityError(null) }}
            placeholder="11-digit National Identification Number"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-gray-400"
          />
        </div>
        {identityError && <p className="text-xs text-red-500">{identityError}</p>}
      </div>

      {/* Rider's note */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Your response <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Explain any changes you've made or add context for the admin…"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none placeholder:text-gray-400"
        />
      </div>

      {/* Optional doc re-upload */}
      <div className="pt-2 border-t border-gray-100 space-y-3">
        <p className="text-sm font-semibold text-gray-900">
          Replace documents <span className="text-gray-400 font-normal">(optional — only if requested)</span>
        </p>
        <DocUploadButton
          label="Driver's License"
          state={licenseDoc}
          onFileChange={(f) => uploadDoc(f, 'license', setLicenseDoc)}
        />
        <DocUploadButton
          label="Vehicle Registration"
          state={vehicleDoc}
          onFileChange={(f) => uploadDoc(f, 'vehicle', setVehicleDoc)}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || licenseDoc.isUploading || vehicleDoc.isUploading}
        className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
      >
        {isLoading ? 'Submitting...' : 'Submit Response'}
      </button>
    </form>
  )
}
