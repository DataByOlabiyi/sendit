import { AdminStatCardsSkeleton } from '@/components/ui/skeleton'

export default function AdminDashboardLoading() {
  return (
    <div className="px-6 py-8 animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-36 bg-gray-200 rounded-xl mb-2" />
        <div className="h-4 w-40 bg-gray-100 rounded-lg" />
      </div>
      <AdminStatCardsSkeleton count={4} />
      <div className="bg-white rounded-2xl border border-gray-100 p-6 h-32" />
    </div>
  )
}
