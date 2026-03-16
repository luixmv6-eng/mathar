import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, Settings, HelpCircle } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  const location = useLocation()
  const { resetTour } = useAppStore()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t"
      style={{ background: 'rgba(10, 10, 15, 0.92)', backdropFilter: 'blur(20px)', borderColor: 'var(--color-border)' }}>
      {navItems.map(({ to, icon: Icon, label }) => {
        const active = location.pathname.startsWith(to)
        return (
          <Link key={to} to={to} className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors"
            style={{ color: active ? 'var(--color-cyan)' : 'var(--color-text-muted)' }}>
            <Icon size={20} />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        )
      })}
      <button onClick={resetTour} className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors"
        style={{ color: 'var(--color-text-muted)' }}>
        <HelpCircle size={20} />
        <span className="text-xs font-medium">Help</span>
      </button>
    </nav>
  )
}
