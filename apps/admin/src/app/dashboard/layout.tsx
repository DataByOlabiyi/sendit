import { AdminSidebar } from '@/components/admin/sidebar'
import { Toaster } from 'sonner'

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="lg:pl-64">
        <main className="min-h-screen">{children}</main>
      </div>
      <Toaster position="top-center" richColors closeButton />
    </div>
  )
}
