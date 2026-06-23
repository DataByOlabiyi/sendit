import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="lg:pl-64">
        <main className="min-h-screen pt-14 lg:pt-0">{children}</main>
      </div>
    </div>
  )
}
