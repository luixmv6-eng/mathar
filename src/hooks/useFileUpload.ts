import { useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface UploadOptions {
  bucket: string
  path: string
  onProgress?: (pct: number) => void
}

export function useFileUpload() {
  const abortRef = useRef<AbortController | null>(null)

  const upload = useCallback(async (file: File, options: UploadOptions): Promise<string> => {
    abortRef.current = new AbortController()
    const { bucket, path } = options

    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) throw error

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }, [])

  const uploadBuffer = useCallback(async (buffer: ArrayBuffer, options: UploadOptions & { contentType: string }): Promise<string> => {
    const blob = new Blob([buffer], { type: options.contentType })
    const { error } = await supabase.storage.from(options.bucket).upload(options.path, blob, { upsert: true, contentType: options.contentType })
    if (error) throw error
    const { data } = supabase.storage.from(options.bucket).getPublicUrl(options.path)
    return data.publicUrl
  }, [])

  const validateFile = (file: File, rules: { maxMB: number; types: string[] }): string | null => {
    if (file.size > rules.maxMB * 1024 * 1024) return `File too large. Max ${rules.maxMB}MB allowed.`
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!rules.types.includes(ext)) return `Invalid type. Allowed: ${rules.types.join(', ')}`
    return null
  }

  const abort = useCallback(() => abortRef.current?.abort(), [])

  return { upload, uploadBuffer, validateFile, abort }
}
