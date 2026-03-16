import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, Settings, Shield, LogOut, Cpu, HelpCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { motion } from 'framer-motion'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const location = useLocation()
  const { user, signOut } = useAuthStore()
  const { resetTour } = useAppStore()
  const isAdmin = (user?.app_metadata as any)?.role === 'superadmin'

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen border-r"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00F5FF, #7B2FFF)' }}>
          <Cpu size={18} color="#0A0A0F" />
        </div>
        <div>
          <p className="font-bold text-sm" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-cyan)' }}>AR Vision</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>AR Platform</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to)
          return (
            <Link key={to} to={to}>
              <motion.div
                whileHover={{ x: 3 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium"
                style={{
                  background: active ? 'rgba(0, 245, 255, 0.08)' : 'transparent',
                  color: active ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                  borderLeft: active ? '2px solid var(--color-cyan)' : '2px solid transparent',
                }}
              >
                <Icon size={16} />
                {label}
              </motion.div>
            </Link>
          )
        })}
        {/* Help button */}
        <button onClick={resetTour} className="w-full text-left">
          <motion.div
            whileHover={{ x: 3 }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <HelpCircle size={16} />
            Help & Tour
          </motion.div>
        </button>
        {isAdmin && (
          <Link to="/admin">
            <motion.div whileHover={{ x: 3 }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium"
              style={{ color: 'var(--color-text-muted)' }}>
              <Shield size={16} />Admin
            </motion.div>
          </Link>
        )}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #00F5FF30, #7B2FFF30)', color: 'var(--color-cyan)', border: '1px solid var(--color-border)' }}>
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
              {user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
              {user?.email}
            </p>
          </div>
        </div>
        <button onClick={signOut} className="btn btn-ghost w-full text-xs">
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </aside>
  )
}
