import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Lock, Globe, Cpu } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'
import { generateShareUrl } from '@/lib/utils'

export default function SharePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('ar_projects').select('*').eq('id', projectId).single()
      .then(({ data }) => { setProject(data); setLoading(false) })
  }, [projectId])

  const shareUrl = generateShareUrl(projectId!)

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
    <div className="skeleton rounded-2xl" style={{ width: '340px', height: '500px' }} />
  </div>

  if (!project || (!project.is_public)) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
      <div className="glass rounded-2xl p-8 text-center max-w-sm mx-4">
        <Lock size={40} className="mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
        <h2 className="font-bold text-xl mb-2" style={{ fontFamily: 'var(--font-display)' }}>Private Project</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>This AR experience is not publicly accessible.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg-base)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #00F5FF, transparent)' }} />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 w-full max-w-sm text-center relative">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, #00F5FF, #7B2FFF)' }}>
          <Cpu size={26} color="#0A0A0F" />
        </div>
        <span className="badge badge-green mb-3"><Globe size={10} /> Public AR Experience</span>
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>{project.name}</h1>
        {project.description && <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>{project.description}</p>}

        <Link to={`/ar-viewer?projectId=${projectId}`}
          className="btn btn-primary w-full text-base py-3 mb-6">
          <Play size={18} /> Start AR Experience
        </Link>

        <div className="flex flex-col items-center gap-3">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Scan QR to open on another device</p>
          <div className="p-3 rounded-xl" style={{ background: '#fff' }}>
            <QRCodeSVG value={shareUrl} size={160} />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
