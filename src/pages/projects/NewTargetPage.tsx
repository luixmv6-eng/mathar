import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { ArrowLeft, Upload, ImageIcon, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { compileMindFile } from '@/lib/mindARCompiler'
import { useFileUpload } from '@/hooks/useFileUpload'
import { toast } from 'sonner'

type Step = 'upload' | 'compile' | 'done'

export default function NewTargetPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { upload, uploadBuffer, validateFile } = useFileUpload()

  const [step, setStep] = useState<Step>('upload')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [width, setWidth] = useState(0.2)
  const [progress, setProgress] = useState(0)
  const [progressPhase, setProgressPhase] = useState('')

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    const err = validateFile(file, { maxMB: 10, types: ['jpg', 'jpeg', 'png'] })
    if (err) { toast.error(err); return }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
    if (!name) setName(file.name.replace(/\.[^.]+$/, ''))
  }, [name, validateFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] }, maxFiles: 1,
  })

  const handleCompileAndSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageFile || !user) return
    setStep('compile')
    setProgress(0)
    try {
      // 1. Upload reference image
      setProgressPhase('Uploading reference image...')
      setProgress(5)
      const imgPath = `${user.id}/${projectId}/${Date.now()}_${imageFile.name}`
      const imageUrl = await upload(imageFile, { bucket: 'reference-images', path: imgPath })
      setProgress(15)

      // 2. Compile .mind file in Web Worker
      const mindBuffer = await compileMindFile(imageFile, ({ progress: p, phase }) => {
        setProgress(15 + Math.round(p * 0.7))
        setProgressPhase(phase)
      })

      // 3. Upload .mind file
      setProgressPhase('Uploading compiled .mind file...')
      setProgress(88)
      const mindPath = `${user.id}/${projectId}/${Date.now()}.mind`
      const mindUrl = await uploadBuffer(mindBuffer, {
        bucket: 'mind-files', path: mindPath, contentType: 'application/octet-stream'
      })
      setProgress(95)

      // 4. Insert DB record
      setProgressPhase('Saving to database...')
      const { error } = await supabase.from('image_targets').insert({
        project_id: projectId, user_id: user.id, name: name.trim(),
        reference_image_url: imageUrl, mind_file_url: mindUrl, width,
      })
      if (error) throw error

      setProgress(100)
      setProgressPhase('Done!')
      setStep('done')
      toast.success('Image target created!')
      setTimeout(() => navigate(`/projects/${projectId}`), 1200)
    } catch (err: any) {
      toast.error(err.message ?? 'Compilation failed')
      setStep('upload')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto w-full">
      <Link to={`/projects/${projectId}`} className="flex items-center gap-2 mb-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        <ArrowLeft size={15} /> Back to Project
      </Link>
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)' }}>New Image Target</h1>

      {step === 'done' ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass rounded-2xl p-10 text-center">
          <CheckCircle size={48} className="mx-auto mb-4" style={{ color: 'var(--color-cyan)' }} />
          <h2 className="text-xl font-bold mb-2">Target Created!</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>Redirecting to project...</p>
        </motion.div>
      ) : step === 'compile' ? (
        <div className="glass rounded-2xl p-8">
          <h2 className="font-bold mb-6 text-center" style={{ fontFamily: 'var(--font-display)' }}>Compiling AR Target</h2>
          <div className="space-y-4">
            <div className="w-full rounded-full overflow-hidden h-3" style={{ background: 'var(--color-surface)' }}>
              <motion.div className="h-full rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }}
                style={{ background: 'linear-gradient(90deg, #00F5FF, #7B2FFF)' }} />
            </div>
            <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span>{progressPhase}</span>
              <span>{progress}%</span>
            </div>
            <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
              This may take up to a minute depending on image complexity. Please wait...
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCompileAndSave} className="space-y-5">
          {/* Dropzone */}
          <div {...getRootProps()} className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
            style={{ borderColor: isDragActive ? 'var(--color-cyan)' : 'var(--color-border)', background: isDragActive ? 'rgba(0,245,255,0.05)' : 'var(--color-surface)' }}>
            <input {...getInputProps()} />
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="mx-auto max-h-48 rounded-lg object-contain" />
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--color-cyan)' }} />
                <p className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  {isDragActive ? 'Drop image here' : 'Drag & drop or click to upload'}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>JPG or PNG, max 10MB</p>
              </>
            )}
          </div>

          {/* Image quality tip */}
          {imagePreview && (
            <div className="flex gap-2 p-3 rounded-lg text-xs" style={{ background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.15)' }}>
              <AlertCircle size={15} style={{ color: 'var(--color-cyan)', flexShrink: 0, marginTop: '1px' }} />
              <span style={{ color: 'var(--color-text-muted)' }}>
                Best tracking: use images with <strong style={{ color: 'var(--color-text)' }}>rich detail, asymmetry, and high contrast</strong>. Avoid plain backgrounds, logos, or symmetrical patterns.
              </span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Target Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Product Poster" required />
          </div>

          {/* Width */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Physical Width: <span style={{ color: 'var(--color-cyan)' }}>{width}m</span>
            </label>
            <input type="range" min="0.05" max="2" step="0.05" value={width} onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full" style={{ accentColor: 'var(--color-cyan)' }} />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              <span>5cm (small card)</span><span>2m (banner)</span>
            </div>
          </div>

          <button type="submit" disabled={!imageFile || !name} className="btn btn-primary w-full">
            <ImageIcon size={16} /> Compile & Save Target
          </button>
        </form>
      )}
    </div>
  )
}
