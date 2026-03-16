import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Lock, Trash2, HardDrive, HelpCircle, BookOpen } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const { user, signOut } = useAuthStore()
  const { resetTour } = useAppStore()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name ?? '')
  const [newPw, setNewPw] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingName(true)
    const { error } = await supabase.auth.updateUser({ data: { full_name: displayName } })
    if (error) toast.error(error.message); else toast.success('Display name updated')
    setSavingName(false)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) toast.error(error.message); else { toast.success('Password changed!'); setNewPw('') }
    setSavingPw(false)
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure? This will permanently delete your account and all data. This cannot be undone.')) return
    try {
      await supabase.rpc('delete_user')
      await signOut()
      navigate('/auth')
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto w-full pb-24 md:pb-8">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-bold mb-8"
        style={{ fontFamily: 'var(--font-display)' }}>Settings</motion.h1>

      <div className="space-y-5">
        {/* Help & Support */}
        <div className="glass rounded-2xl p-6 border-cyan-400/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,245,255,0.1)' }}>
              <HelpCircle size={16} style={{ color: 'var(--color-cyan)' }} />
            </div>
            <h2 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>Help & Support</h2>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex gap-3">
              <div className="mt-1"><BookOpen size={14} className="text-cyan-400" /></div>
              <div>
                <p className="text-sm font-medium">How it works</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  AR Vision allows you to bind 3D overlays and media to physical images. 
                  Upload a target image, add your media in the editor, and use the AR Viewer to see it in space.
                </p>
              </div>
            </div>
          </div>

          <button onClick={resetTour} className="btn btn-ghost w-full !justify-center gap-2">
            <HelpCircle size={16} />
            Show Interactive Tour
          </button>
        </div>

        {/* Profile */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,245,255,0.1)' }}>
              <User size={16} style={{ color: 'var(--color-cyan)' }} />
            </div>
            <h2 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>Profile</h2>
          </div>
          <div className="mb-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Email: <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{user?.email}</span>
          </div>
          <form onSubmit={handleNameSave} className="space-y-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Display Name</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input" placeholder="Your name" />
            </div>
            <button type="submit" disabled={savingName} className="btn btn-primary">
              {savingName ? 'Saving...' : 'Save Name'}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(123,47,255,0.1)' }}>
              <Lock size={16} style={{ color: '#A87FFF' }} />
            </div>
            <h2 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>Change Password</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>New Password</label>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="input" placeholder="••••••••" minLength={6} required />
            </div>
            <button type="submit" disabled={savingPw} className="btn btn-violet">
              {savingPw ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Usage */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <HardDrive size={16} style={{ color: '#22c55e' }} />
            </div>
            <h2 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>Account Info</h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            User ID: <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text)' }}>{user?.id?.slice(0, 16)}...</span>
          </p>
        </div>

        {/* Danger zone */}
        <div className="glass rounded-2xl p-6" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <Trash2 size={16} style={{ color: '#ef4444' }} />
            </div>
            <h2 className="font-bold text-red-400" style={{ fontFamily: 'var(--font-display)' }}>Danger Zone</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>Permanently delete your account and all associated data. This action cannot be undone.</p>
          <button onClick={handleDeleteAccount} className="btn btn-danger">Delete My Account</button>
        </div>
      </div>
    </div>
  )
}
