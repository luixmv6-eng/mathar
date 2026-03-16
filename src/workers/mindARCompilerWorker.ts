// Web Worker for MindAR compilation (CPU-intensive, runs off main thread)
/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope

self.onmessage = async (e: MessageEvent<{ imageFile: File }>) => {
  const { imageFile } = e.data
  try {
    self.postMessage({ type: 'progress', data: { progress: 5, phase: 'Initializing local MindAR compiler...' } })

    // Load MindAR compiler from local public directory
    try {
      importScripts('/libs/mindar-image.js')
    } catch (err) {
      console.error('Failed to load local MindAR script:', err)
      throw new Error('MindAR compiler script could not be loaded from local path. Check public/libs/mindar-image.js exists.')
    }

    // @ts-ignore - MINDAR is loaded globally via importScripts
    const MINDAR_BASE = self.MINDAR || (self as any).MINDAR
    if (!MINDAR_BASE || !MINDAR_BASE.IMAGE || !MINDAR_BASE.IMAGE.Compiler) {
      throw new Error('MindAR compiler failed to initialize correctly from the loaded script.')
    }

    const { Compiler } = MINDAR_BASE.IMAGE

    self.postMessage({ type: 'progress', data: { progress: 10, phase: 'Reading image...' } })

    const compiler = new Compiler()

    const bitmap = await createImageBitmap(imageFile)
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get 2d context')
    ctx.drawImage(bitmap, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    self.postMessage({ type: 'progress', data: { progress: 20, phase: 'Compiling image targets...' } })

    await compiler.compileImageTargets([imageData], (progress: number) => {
      self.postMessage({
        type: 'progress',
        data: { progress: 20 + Math.round(progress * 0.7), phase: 'Extracting features...' },
      })
    })

    self.postMessage({ type: 'progress', data: { progress: 90, phase: 'Exporting .mind file...' } })

    const exportedBuffer = await compiler.exportData()

    self.postMessage({ type: 'progress', data: { progress: 100, phase: 'Done!' } })
    self.postMessage({ type: 'done', data: exportedBuffer }, [exportedBuffer])
  } catch (err: any) {
    self.postMessage({ type: 'error', data: err?.message ?? 'Compilation failed' })
  }
}
