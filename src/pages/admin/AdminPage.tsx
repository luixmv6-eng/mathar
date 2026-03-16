import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, FolderOpen, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([])
  const [stats, setStats] = useState({ totalUsers: 0, totalProjects: 0, totalTargets: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [usersRes, projectsRes, targetsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('ar_projects').select('count').single(),
      supabase.from('image_targets').select('count').single(),
    ])
    setUsers(usersRes.data ?? [])
    setStats({
      totalUsers: usersRes.data?.length ?? 0,
      totalProjects: (projectsRes.data as any)?.count ?? 0,
      totalTargets: (targetsRes.data as any)?.count ?? 0,
    })
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <Shield size={20} style={{ color: 'var(--color-cyan)' }} />
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Admin Panel</h1>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: '#00F5FF' },
          { label: 'Total Projects', value: stats.totalProjects, icon: FolderOpen, color: '#7B2FFF' },
          { label: 'Total Targets', value: stats.totalTargets, icon: Shield, color: '#22c55e' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
              <Icon size={14} style={{ color }} />
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>All Users ({users.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Email', 'Name', 'Joined', 'Role'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={4} className="px-5 py-3"><div className="skeleton rounded h-5 w-full" /></td></tr>
                ))
              ) : users.map((u, i) => (
                <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-5 py-3" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{u.email}</td>
                  <td className="px-5 py-3">{u.full_name ?? '—'}</td>
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatDate(u.created_at)}</td>
                  <td className="px-5 py-3"><span className={`badge ${u.role === 'superadmin' ? 'badge-violet' : 'badge-cyan'}`}>{u.role ?? 'user'}</span></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
