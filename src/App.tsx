import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { AppLayout } from '@/components/layout/AppLayout'
import AuthPage from '@/pages/auth/AuthPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ProjectDetailPage from '@/pages/projects/ProjectDetailPage'
import NewTargetPage from '@/pages/projects/NewTargetPage'
import TargetEditorPage from '@/pages/projects/TargetEditorPage'
import ARViewerPage from '@/pages/ar-viewer/ARViewerPage'
import SharePage from '@/pages/share/SharePage'
import SettingsPage from '@/pages/settings/SettingsPage'
import AdminPage from '@/pages/admin/AdminPage'

export default function App() {
  const { setSession, setLoading } = useAuthStore()

  useEffect(() => {
    // Initialize auth state from Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/share/:projectId" element={<SharePage />} />
          <Route path="/ar-viewer" element={<ARViewerPage />} />

          {/* Protected app routes */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<DashboardPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="/projects/:projectId/targets/new" element={<NewTargetPage />} />
            <Route path="/projects/:projectId/targets/:targetId" element={<TargetEditorPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  )
}
