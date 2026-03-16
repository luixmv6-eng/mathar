import { useRef, useCallback, useState } from 'react'
import { useARStore } from '@/stores/arStore'

export function useCamera() {
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const { facingMode, torch } = useARStore()

  const startCamera = useCallback(async (videoEl: HTMLVideoElement) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      videoEl.srcObject = stream
      await videoEl.play()
      setHasPermission(true)
      setError(null)
    } catch (err: any) {
      setHasPermission(false)
      if (err.name === 'NotAllowedError') setError('Camera permission denied. Please allow camera access and refresh.')
      else if (err.name === 'NotFoundError') setError('No camera found on this device.')
      else setError(`Camera error: ${err.message}`)
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const setTorch = useCallback(async (enabled: boolean) => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      // @ts-ignore - torch is not in all TS types yet
      await track.applyConstraints({ advanced: [{ torch: enabled }] })
    } catch {
      console.warn('Torch not supported on this device')
    }
  }, [])

  const takePicture = useCallback((): string | null => {
    const video = streamRef.current?.getVideoTracks()[0]
    if (!video) return null
    const track = streamRef.current!.getVideoTracks()[0]
    const settings = track.getSettings()
    const canvas = document.createElement('canvas')
    canvas.width = settings.width ?? 1280
    canvas.height = settings.height ?? 720
    // ARViewer will handle capturing from the renderer canvas
    return canvas.toDataURL('image/jpeg', 0.9)
  }, [])

  return { startCamera, stopCamera, setTorch, takePicture, error, hasPermission, stream: streamRef }
}
