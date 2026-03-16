import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Play, Trash2, Image as ImageIcon, Video, Type, Box, Eye, Move } from 'lucide-react'
import { useProjectStore, type AROverlay } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'
import { useFileUpload } from '@/hooks/useFileUpload'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type OverlayTab = 'image' | 'video' | 'text' | 'model3d'

const TAB_CONFIG: { type: OverlayTab; label: string; icon: any; ext: string[]; maxMB: number }[] = [
  { type: 'image', label: 'Image', icon: ImageIcon, ext: ['jpg', 'jpeg', 'png', 'gif'], maxMB: 20 },
  { type: 'video', label: 'Video', icon: Video, ext: ['mp4', 'webm'], maxMB: 100 },
  { type: 'text', label: 'Text', icon: Type, ext: [], maxMB: 0 },
  { type: 'model3d', label: '3D', icon: Box, ext: ['glb'], maxMB: 50 },
]

export default function TargetEditorPage() {
  const { projectId, targetId } = useParams<{ projectId: string; targetId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentTarget, overlays, fetchTarget, fetchOverlays, createOverlay, updateOverlay, deleteOverlay } = useProjectStore()
  const { upload, validateFile } = useFileUpload()
  const [tab, setTab] = useState<OverlayTab>('image')
  const [uploading, setUploading] = useState(false)
  const [textContent, setTextContent] = useState('')
  const [overlayFile, setOverlayFile] = useState<File | null>(null)
  const [loopVideo, setLoopVideo] = useState(true)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    if (targetId) { fetchTarget(targetId); fetchOverlays(targetId) }
  }, [targetId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const tabConfig = TAB_CONFIG.find(t => t.type === tab)!
    const err = validateFile(file, { maxMB: tabConfig.maxMB, types: tabConfig.ext })
    if (err) { toast.error(err); return }
    setOverlayFile(file)
  }

  const handleAddOverlay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !targetId) return
    setUploading(true)
    try {
      let contentUrl: string | undefined
      if (tab !== 'text' && overlayFile) {
        const path = `${user.id}/${targetId}/${Date.now()}_${overlayFile.name}`
        contentUrl = await upload(overlayFile, { bucket: 'ar-overlays', path })
      }
      await createOverlay({
        target_id: targetId, user_id: user.id, type: tab,
        content_url: contentUrl, content_text: tab === 'text' ? textContent : undefined,
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
        opacity, loop_video: loopVideo, autoplay: true,
      })
      toast.success('Overlay added!'); setOverlayFile(null); setTextContent('')
    } catch (err: any) { toast.error(err.message) }
    finally { setUploading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this overlay?')) return
    try { await deleteOverlay(id); toast.success('Overlay removed') }
    catch (err: any) { toast.error(err.message) }
  }

  const updateTransform = async (overlay: AROverlay, field: 'position' | 'scale' | 'rotation', axis: 'x' | 'y' | 'z', value: number) => {
    const updated = { ...overlay[field], [axis]: value }
    await updateOverlay(overlay.id, { [field]: updated })
  }

  const typeIcon = (type: string) => {
    if (type === 'image' || type === 'gif') return <ImageIcon size={14} />
    if (type === 'video') return <Video size={14} />
    if (type === 'text') return <Type size={14} />
    return <Box size={14} />
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen" style={{ background: 'var(--color-bg-base)' }}>
      {/* Left panel */}
      <div className="lg:w-64 p-5 border-r flex-shrink-0" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <Link to={`/projects/${projectId}`} className="flex items-center gap-1.5 mb-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={13} /> Project
        </Link>
        <h2 className="font-bold mb-1 text-sm" style={{ fontFamily: 'var(--font-display)' }}>{currentTarget?.name ?? 'Target'}</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Physical width: {currentTarget?.width}m</p>
        {currentTarget?.reference_image_url && (
          <img src={currentTarget.reference_image_url} alt="Reference" className="w-full rounded-lg object-cover max-h-40"
            style={{ border: '1px solid var(--color-border)' }} />
        )}
        <Link to={`/ar-viewer?projectId=${projectId}&targetId=${targetId}`}
          className="btn btn-primary w-full mt-4 text-sm">
          <Play size={14} /> Test in AR
        </Link>
      </div>

      {/* Center panel - overlay list */}
      <div className="flex-1 p-5">
        <h2 className="font-bold text-lg mb-4" style={{ fontFamily: 'var(--font-display)' }}>Overlays ({overlays.length})</h2>
        {overlays.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Eye size={32} className="mx-auto mb-3 opacity-30" />
            <p style={{ color: 'var(--color-text-muted)' }}>No overlays yet. Add some from the panel →</p>
          </div>
        ) : (
          <div className="space-y-3">
            {overlays.map((overlay, i) => (
              <motion.div key={overlay.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,245,255,0.1)', color: 'var(--color-cyan)' }}>
                    {typeIcon(overlay.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{overlay.type}</p>
                    {overlay.content_text && <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{overlay.content_text}</p>}
                  </div>
                  <button onClick={() => handleDelete(overlay.id)} className="p-1.5 rounded" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                {/* Transform controls */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['x', 'y', 'z'] as const).map(axis => (
                    <div key={axis}>
                      <label className="flex items-center gap-1 mb-1" style={{ color: 'var(--color-text-muted)' }}>
                        <Move size={10} /> Pos {axis.toUpperCase()}
                      </label>
                      <input type="number" step="0.1" defaultValue={overlay.position[axis]}
                        onChange={(e) => updateTransform(overlay, 'position', axis, Number(e.target.value))}
                        className="input text-xs py-1" style={{ padding: '4px 8px' }} />
                    </div>
                  ))}
                  {(['x', 'y', 'z'] as const).map(axis => (
                    <div key={`s-${axis}`}>
                      <label className="flex items-center gap-1 mb-1" style={{ color: 'var(--color-text-muted)' }}>Scale {axis.toUpperCase()}</label>
                      <input type="number" step="0.1" min="0.01" defaultValue={overlay.scale[axis]}
                        onChange={(e) => updateTransform(overlay, 'scale', axis, Number(e.target.value))}
                        className="input text-xs" style={{ padding: '4px 8px' }} />
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Right panel - add overlay */}
      <div className="lg:w-72 p-5 border-l flex-shrink-0" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <h2 className="font-bold text-sm mb-4" style={{ fontFamily: 'var(--font-display)' }}>Add Overlay</h2>
        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
          {TAB_CONFIG.map(({ type, label, icon: Icon }) => (
            <button key={type} onClick={() => setTab(type)} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-md text-xs transition-all"
              style={{ background: tab === type ? 'var(--color-surface)' : 'transparent', color: tab === type ? 'var(--color-cyan)' : 'var(--color-text-muted)', border: tab === type ? '1px solid var(--color-border)' : 'none' }}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        <form onSubmit={handleAddOverlay} className="space-y-4">
          {tab === 'text' ? (
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Text Content</label>
              <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} className="input min-h-20 resize-y"
                placeholder="Enter AR text overlay..." required />
            </div>
          ) : (
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                {tab === 'image' ? 'Image file (JPG/PNG/GIF)' : tab === 'video' ? 'Video file (MP4/WebM)' : '3D Model (.glb)'}
              </label>
              <label className="flex flex-col items-center gap-2 p-4 rounded-lg border-dashed border-2 cursor-pointer transition-all"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)' }}>
                <Upload size={20} style={{ color: overlayFile ? 'var(--color-cyan)' : 'var(--color-text-muted)' }} />
                <span className="text-xs text-center" style={{ color: overlayFile ? 'var(--color-cyan)' : 'var(--color-text-muted)' }}>
                  {overlayFile ? overlayFile.name : 'Click to select file'}
                </span>
                <input type="file" className="hidden" onChange={handleFileChange}
                  accept={TAB_CONFIG.find(t => t.type === tab)?.ext.map(e => `.${e}`).join(',')} />
              </label>
            </div>
          )}

          {/* Opacity */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Opacity: {Math.round(opacity * 100)}%</label>
            <input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full" style={{ accentColor: 'var(--color-cyan)' }} />
          </div>

          {tab === 'video' && (
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
              <input type="checkbox" checked={loopVideo} onChange={(e) => setLoopVideo(e.target.checked)} style={{ accentColor: 'var(--color-cyan)' }} />
              Loop video
            </label>
          )}

          <button type="submit" disabled={uploading || (tab !== 'text' && !overlayFile)} className="btn btn-violet w-full">
            {uploading ? 'Uploading...' : <><Plus size={15} /> Add Overlay</>}
          </button>
        </form>
      </div>
    </div>
  )
}

function Upload({ size, style }: { size: number; style?: React.CSSProperties }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
}
