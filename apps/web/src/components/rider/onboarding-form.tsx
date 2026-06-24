'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { riderProfileSchema, type RiderProfileInput } from '@sendit/validations'
import {
  createRiderProfileAction,
  uploadRiderDocumentAction,
  submitRiderKycAction,
  uploadRiderDocToStorageAction,
} from '@/app/rider/profile-actions'

interface DocUploadState {
  file: File | null
  previewUrl: string | null
  storagePath: string | null
  isUploading: boolean
  error: string | null
}

const EMPTY_DOC: DocUploadState = {
  file: null,
  previewUrl: null,
  storagePath: null,
  isUploading: false,
  error: null,
}

function DocUpload({
  label,
  hint,
  state,
  onFileChange,
}: {
  label: string
  hint: string
  state: DocUploadState
  onFileChange: (file: File) => void
}) {
  const hasUploaded = !!state.storagePath
  const hasError = !!state.error

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      <label className="block cursor-pointer">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFileChange(f)
            // Reset so same file can be re-selected after an error
            e.target.value = ''
          }}
          className="sr-only"
        />
        <div
          className={`relative border-2 border-dashed rounded-xl transition ${
            hasUploaded
              ? 'border-green-400 bg-green-50'
              : hasError
              ? 'border-red-300 bg-red-50'
              : 'border-gray-200 hover:border-orange-300 bg-gray-50'
          }`}
        >
          {hasUploaded ? (
            <div className="flex items-center gap-3 p-4">
              {state.previewUrl && state.file?.type.startsWith('image/') ? (
                <img src={state.previewUrl} alt={label} className="w-14 h-14 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-700">✓ Uploaded</p>
                <p className="text-xs text-gray-500 truncate">{state.file?.name}</p>
              </div>
              <p className="text-xs text-orange-500 shrink-0">Tap to replace</p>
            </div>
          ) : state.isUploading ? (
            <div className="flex items-center justify-center gap-2 p-6">
              <span className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Uploading...</span>
            </div>
          ) : hasError ? (
            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-600">Upload failed</p>
                <p className="text-xs text-red-400 truncate">{state.error}</p>
              </div>
              <p className="text-xs text-orange-500 shrink-0">Tap to retry</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm text-gray-500">Tap to upload</p>
              <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or PDF</p>
            </div>
          )}
        </div>
      </label>
    </div>
  )
}

export function RiderOnboardingForm({ isResubmit = false }: { isResubmit?: boolean }) {
  const [isLoading, setIsLoading] = useState(false)
  const [licenseDoc, setLicenseDoc] = useState<DocUploadState>(EMPTY_DOC)
  const [vehicleDoc, setVehicleDoc] = useState<DocUploadState>(EMPTY_DOC)
  const [bvn, setBvn] = useState('')
  const [nin, setNin] = useState('')
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm<RiderProfileInput>({
    resolver: zodResolver(riderProfileSchema),
    defaultValues: { vehicle_type: 'motorcycle' },
  })

  async function uploadDoc(
    file: File,
    docType: 'license' | 'vehicle',
    setState: React.Dispatch<React.SetStateAction<DocUploadState>>,
  ) {
    setState((prev) => {
      if (prev.previewUrl) URL.revokeObjectURL(prev.previewUrl)
      return { file, previewUrl: null, storagePath: null, isUploading: true, error: null }
    })

    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadRiderDocToStorageAction(docType, formData)

    if (result.error) {
      setState({ file, previewUrl: null, storagePath: null, isUploading: false, error: result.error })
      return
    }

    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setState({ file, previewUrl, storagePath: result.path!, isUploading: false, error: null })
  }

  async function onSubmit(data: RiderProfileInput) {
    if (!licenseDoc.storagePath) {
      toast.error("Please upload your driver's license")
      return
    }
    if (!vehicleDoc.storagePath) {
      toast.error('Please upload your vehicle registration document')
      return
    }

    setIsLoading(true)
    try {
      const result = await createRiderProfileAction(data)
      if (result.error) {
        toast.error(result.error)
        setIsLoading(false)
        return
      }

      const kycPayload =
        bvn.trim().length === 11 || nin.trim().length === 11
          ? submitRiderKycAction({ bvn: bvn.trim(), nin: nin.trim() })
          : Promise.resolve({ success: true })

      await Promise.all([
        uploadRiderDocumentAction('license', licenseDoc.storagePath!),
        uploadRiderDocumentAction('vehicle', vehicleDoc.storagePath!),
        kycPayload,
      ])

      toast.success('Profile submitted! Awaiting admin approval.')
      router.push('/rider/dashboard')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Type</label>
          <select
            {...register('vehicle_type')}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          >
            <option value="bicycle">🚲 Bicycle</option>
            <option value="motorcycle">🏍️ Motorcycle</option>
            <option value="car">🚗 Car</option>
            <option value="van">🚐 Van</option>
          </select>
          {errors.vehicle_type && <p className="mt-1.5 text-xs text-red-500">{errors.vehicle_type.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Plate Number</label>
          <input
            {...register('vehicle_plate')}
            type="text"
            placeholder="e.g. ABC-123-XY"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
          />
          {errors.vehicle_plate && <p className="mt-1.5 text-xs text-red-500">{errors.vehicle_plate.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Model</label>
          <input
            {...register('vehicle_model')}
            type="text"
            placeholder="e.g. Honda CB500, Toyota Camry"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
          />
          {errors.vehicle_model && <p className="mt-1.5 text-xs text-red-500">{errors.vehicle_model.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">License Number</label>
          <input
            {...register('license_number')}
            type="text"
            placeholder="Driver's license number"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
          />
          {errors.license_number && <p className="mt-1.5 text-xs text-red-500">{errors.license_number.message}</p>}
        </div>

        {/* KYC: BVN / NIN */}
        <div className="pt-2 border-t border-gray-100 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Identity Verification (KYC)</h3>
            <p className="text-xs text-gray-400 mt-0.5">Required by CBN regulations. Stored securely and never shared.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              BVN <span className="text-gray-400 font-normal">(Bank Verification Number)</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={bvn}
              onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="11-digit BVN"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              NIN <span className="text-gray-400 font-normal">(National Identification Number)</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={nin}
              onChange={(e) => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="11-digit NIN"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Document uploads */}
        <div className="pt-2 border-t border-gray-100 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Verification Documents</h3>

          <DocUpload
            label="Driver's License"
            hint="Upload a clear photo of your valid driver's license (front)"
            state={licenseDoc}
            onFileChange={(f) => uploadDoc(f, 'license', setLicenseDoc)}
          />

          <DocUpload
            label="Vehicle Registration"
            hint="Upload your vehicle registration certificate or proof of ownership"
            state={vehicleDoc}
            onFileChange={(f) => uploadDoc(f, 'vehicle', setVehicleDoc)}
          />
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-xs text-yellow-700">
            <strong>Note:</strong> Your account will be reviewed by an admin. This usually takes 24–48 hours after document submission.
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || licenseDoc.isUploading || vehicleDoc.isUploading}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
        >
          {isLoading ? 'Submitting...' : isResubmit ? 'Resubmit for Review' : 'Submit for Review'}
        </button>
      </form>
    </div>
  )
}
