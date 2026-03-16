import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Cpu, Chrome } from 'lucide-react'
import { toast } from 'sonner'

type AuthMode = 'login' | 'signup' | 'forgot'

export default function AuthPage() {
  const { user } = useAuthStore()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Welcome back!')
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
        if (error) throw error
        toast.success('Account created! Check your email to verify.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth?mode=reset` })
        if (error) throw error
        toast.success('Password reset email sent!')
        setMode('login')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) toast.error(error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--color-bg-base)' }}>
      {/* Animated background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #00F5FF, transparent)' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #7B2FFF, transparent)' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="glass rounded-2xl p-8 w-full max-w-md relative">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00F5FF, #7B2FFF)' }}>
            <Cpu size={26} color="#0A0A0F" />
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
            AR Vision
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            {mode === 'login' ? 'Sign in to your account' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
          </p>
        </div>

        {/* Mode tabs */}
        {mode !== 'forgot' && (
          <div className="flex rounded-lg p-1 mb-6" style={{ background: 'var(--color-surface)' }}>
            {(['login', 'signup'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className="flex-1 py-2 rounded-md text-sm font-medium transition-all capitalize"
                style={{ background: mode === m ? 'var(--color-surface-2)' : 'transparent', color: mode === m ? 'var(--color-cyan)' : 'var(--color-text-muted)', border: mode === m ? '1px solid var(--color-border)' : 'none' }}>
                {m}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.form key={mode} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }} onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Email</label>
              <div className="relative flex items-center">
                <Mail size={15} className="absolute left-3" style={{ color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="input pl-10 h-11" placeholder="you@example.com" />
              </div>
            </div>

            {/* Password */}
            {mode !== 'forgot' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Password</label>
                <div className="relative flex items-center">
                  <Lock size={15} className="absolute left-3" style={{ color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="input pl-10 pr-10 h-11" placeholder="••••••••" minLength={6} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 flex items-center justify-center h-full"
                    style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {mode === 'login' && (
                  <button type="button" onClick={() => setMode('forgot')} className="text-xs mt-1"
                    style={{ color: 'var(--color-cyan)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
            </button>

            {mode === 'forgot' && (
              <button type="button" onClick={() => setMode('login')} className="btn btn-ghost w-full">
                Back to Sign In
              </button>
            )}
          </motion.form>
        </AnimatePresence>

        {/* Divider + OAuth */}
        {mode !== 'forgot' && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            </div>
            <button onClick={handleGoogle} className="btn btn-ghost w-full">
              <Chrome size={16} /> Continue with Google
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}
