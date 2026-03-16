import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { useAuthStore } from '@/stores/authStore'
import { Toaster } from 'sonner'
import AppTour from '@/components/common/AppTour'

export function AppLayout() {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center animate-pulse" style={{ background: 'linear-gradient(135deg, #00F5FF, #7B2FFF)' }} />
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg-base)' }}>
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-auto pb-20 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
      <AppTour />
      <Toaster theme="dark" richColors position="top-right" />
    </div>
  )
}
