import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Flashlight, RotateCcw, Camera, Zap, ZapOff, SwitchCamera } from 'lucide-react'
import * as THREE from 'three'
import { useARStore } from '@/stores/arStore'
import { useProjectStore } from '@/stores/projectStore'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

declare global {
  interface Window {
    MINDAR: any
    MindARThree: any
  }
}

// Dynamically load MindAR from CDN
function loadMindAR(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('[data-mindar]')) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js'
    script.dataset.mindar = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load MindAR'))
    document.head.appendChild(script)
  })
}

export default function ARViewerPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const projectId = searchParams.get('projectId')
  const containerRef = useRef<HTMLDivElement>(null)
  const mindarRef = useRef<any>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const { isRunning, setRunning, addDetected, removeDetected, torch, toggleTorch, facingMode, toggleCamera, reset } = useARStore()
  const { targets, overlays: allOverlays, fetchTargets, fetchOverlays } = useProjectStore()

  const [status, setStatus] = useState<'loading' | 'running' | 'error' | 'denied'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [detectedSet, setDetectedSet] = useState<Set<number>>(new Set())
  const [projectName, setProjectName] = useState('')
  const [loadedTargets, setLoadedTargets] = useState<any[]>([])

  useEffect(() => {
    init()
    return () => { cleanup() }
  }, [projectId])

  async function init() {
    if (!projectId) { setStatus('error'); setErrorMsg('No project specified'); return }
    try {
      // Fetch project info
      const { data: proj } = await supabase.from('ar_projects').select('name').eq('id', projectId).single()
      if (proj) setProjectName(proj.name)

      // Fetch targets with mind files
      const { data: tgts } = await supabase.from('image_targets').select('*, ar_overlays(*)').eq('project_id', projectId)
      const compiledTargets = (tgts ?? []).filter((t: any) => t.mind_file_url)

      if (compiledTargets.length === 0) {
        setStatus('error'); setErrorMsg('No compiled targets found. Please compile image targets first.'); return
      }
      setLoadedTargets(compiledTargets)

      // Load MindAR
      setStatus('loading')
      await loadMindAR()

      // Use first target's mind file (MindAR loads one .mind file containing all compiled targets)
      // For simplicity, we load each target's .mind file separately
      const mindSrc = compiledTargets[0].mind_file_url
      await startAR(mindSrc, compiledTargets)
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setStatus('denied')
      else { setStatus('error'); setErrorMsg(err.message) }
    }
  }

  async function startAR(mindSrc: string, targets: any[]) {
    if (!containerRef.current || !window.MindARThree) return

    const mindarThree = new window.MindARThree({
      container: containerRef.current,
      imageTargetSrc: mindSrc,
      maxTrack: Math.min(targets.length, 3),
      uiLoading: 'no', uiScanning: 'no', uiError: 'no',
    })
    mindarRef.current = mindarThree

    const { renderer, scene, camera } = mindarThree

    // Attach overlays to each anchor
    targets.forEach((target, idx) => {
      const anchor = mindarThree.addAnchor(idx)
      const group = anchor.group

      anchor.onTargetFound = () => {
        setDetectedSet((prev) => new Set([...prev, idx]))
        addDetected(idx)
        group.traverse((o: any) => { if (o.material) o.material.opacity = 0 })
        // Fade in
        let t = 0
        const fade = () => {
          t += 0.05
          group.traverse((o: any) => { if (o.material) o.material.opacity = Math.min(t, o.userData.targetOpacity ?? 1) })
          if (t < 1) requestAnimationFrame(fade)
        }
        fade()
      }

      anchor.onTargetLost = () => {
        setDetectedSet((prev) => { const next = new Set(prev); next.delete(idx); return next })
        removeDetected(idx)
      }

      // Build overlays for this target
      const targetOverlays: any[] = target.ar_overlays ?? []
      targetOverlays.forEach((overlay: any) => {
        const mesh = buildOverlayMesh(overlay)
        if (mesh) group.add(mesh)
      })
    })

    try {
      await mindarThree.start()
      setRunning(true)
      setStatus('running')
      renderer.setAnimationLoop(() => renderer.render(scene, camera))
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setStatus('denied')
      else { setStatus('error'); setErrorMsg(err.message) }
    }
  }

  function buildOverlayMesh(overlay: any): THREE.Object3D | null {
    const pos = overlay.position ?? { x: 0, y: 0, z: 0 }
    const scale = overlay.scale ?? { x: 1, y: 1, z: 1 }
    const rot = overlay.rotation ?? { x: 0, y: 0, z: 0 }

    const applyTransform = (obj: THREE.Object3D) => {
      obj.position.set(pos.x, pos.y, pos.z)
      obj.scale.set(scale.x, scale.y, scale.z)
      obj.rotation.set(rot.x, rot.y, rot.z)
      return obj
    }

    if (overlay.type === 'image' || overlay.type === 'gif') {
      const loader = new THREE.TextureLoader()
      const texture = loader.load(overlay.content_url)
      const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: overlay.opacity ?? 1 })
      mat.userData = {}
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
      mesh.userData.targetOpacity = overlay.opacity ?? 1
      return applyTransform(mesh)
    }

    if (overlay.type === 'video') {
      const video = document.createElement('video')
      video.src = overlay.content_url
      video.loop = overlay.loop_video ?? true
      video.muted = true
      video.playsInline = true
      video.autoplay = true
      if (overlay.autoplay) video.play().catch(() => {})
      const texture = new THREE.VideoTexture(video)
      const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: overlay.opacity ?? 1 })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 9 / 16), mat)
      mesh.userData.targetOpacity = overlay.opacity ?? 1
      return applyTransform(mesh)
    }

    if (overlay.type === 'text') {
      const canvas = document.createElement('canvas')
      canvas.width = 512; canvas.height = 128
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(0, 0, 512, 128)
      ctx.fillStyle = '#00F5FF'
      ctx.font = 'bold 48px DM Sans, Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(overlay.content_text ?? '', 256, 64)
      const texture = new THREE.CanvasTexture(canvas)
      const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: overlay.opacity ?? 1 })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.5), mat)
      mesh.userData.targetOpacity = overlay.opacity ?? 1
      return applyTransform(mesh)
    }

    // 3D model - dynamic import of GLTFLoader
    if (overlay.type === 'model3d') {
      const group = new THREE.Group()
      import('three/addons/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
        const loader = new GLTFLoader()
        loader.load(overlay.content_url, (gltf) => {
          applyTransform(gltf.scene)
          group.add(gltf.scene)
        })
      })
      return group
    }

    return null
  }

  async function cleanup() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (mindarRef.current) {
      try { await mindarRef.current.stop() } catch {}
      mindarRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    reset()
    setRunning(false)
  }

  const handleTorch = async () => {
    toggleTorch()
    // Try to toggle torch via track constraints
    const track = (mindarRef.current as any)?.video?.srcObject?.getVideoTracks?.()[0]
    if (track) {
      try { await track.applyConstraints({ advanced: [{ torch: !torch }] }) }
      catch { toast.warning('Torch not supported on this device') }
    }
  }

  const handleScreenshot = () => {
    const canvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `ar-capture-${Date.now()}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.9)
    link.click()
    toast.success('Screenshot saved!')
  }

  return (
    <div className="fixed inset-0 z-50" style={{ background: '#000' }} ref={containerRef} id="ar-container">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)' }}>
        <button onClick={() => { cleanup(); navigate(-1) }} className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', color: '#fff' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-white text-sm font-medium" style={{ fontFamily: 'var(--font-display)' }}>{projectName || 'AR Viewer'}</p>
          <p className="text-xs text-white/60">{loadedTargets.length} target(s) loaded</p>
        </div>
        {/* Detection indicator */}
        {isRunning && (
          <div className="flex items-center gap-2">
            <div className="relative w-3 h-3">
              <div className="w-3 h-3 rounded-full" style={{ background: detectedSet.size > 0 ? '#22c55e' : '#6b7280' }} />
              {detectedSet.size > 0 && <div className="pulse-dot absolute inset-0 rounded-full" style={{ color: '#22c55e' }} />}
            </div>
            <span className="text-xs text-white/60">{detectedSet.size > 0 ? `${detectedSet.size} detected` : 'Scanning...'}</span>
          </div>
        )}
      </div>

      {/* Overlays for status */}
      <AnimatePresence>
        {status === 'loading' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
            style={{ background: 'rgba(10,10,15,0.85)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse"
              style={{ background: 'linear-gradient(135deg, #00F5FF, #7B2FFF)' }}>
              <Zap size={28} color="#0A0A0F" />
            </div>
            <p className="text-white font-medium">Initializing AR...</p>
            <p className="text-white/50 text-sm">Loading MindAR engine</p>
          </motion.div>
        )}
        {status === 'denied' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 p-8 text-center"
            style={{ background: 'rgba(10,10,15,0.95)' }}>
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
              <Camera size={28} color="#ef4444" />
            </div>
            <h2 className="text-xl font-bold text-white">Camera Access Denied</h2>
            <p className="text-white/60 text-sm max-w-xs">Please allow camera access in your browser settings and refresh the page to use AR.</p>
            <button onClick={() => navigate(-1)} className="btn btn-ghost text-white">Go Back</button>
          </motion.div>
        )}
        {status === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 p-8 text-center"
            style={{ background: 'rgba(10,10,15,0.95)' }}>
            <h2 className="text-xl font-bold text-white">AR Error</h2>
            <p className="text-white/60 text-sm">{errorMsg}</p>
            <button onClick={() => navigate(-1)} className="btn btn-ghost text-white">Go Back</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      {status === 'running' && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-4 pb-8 pt-4"
          style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)' }}>
          <button onClick={handleTorch} className="flex flex-col items-center gap-1 p-3 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', color: '#fff' }}>
            {torch ? <ZapOff size={20} /> : <Zap size={20} />}
          </button>
          <button onClick={handleScreenshot} className="flex flex-col items-center gap-1 p-4 rounded-full"
            style={{ background: 'rgba(0,245,255,0.3)', backdropFilter: 'blur(8px)', border: '2px solid rgba(0,245,255,0.5)', cursor: 'pointer', color: '#00F5FF' }}>
            <Camera size={24} />
          </button>
          <button onClick={() => { cleanup(); setTimeout(() => init(), 300) }} className="flex flex-col items-center gap-1 p-3 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', color: '#fff' }}>
            <SwitchCamera size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
