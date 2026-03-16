// Web Worker for MindAR compilation (CPU-intensive, runs off main thread)
/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope

self.onmessage = async (e: MessageEvent<{ imageFile: File }>) => {
  const { imageFile } = e.data
  try {
    self.postMessage({ type: 'progress', data: { progress: 5, phase: 'Initializing MindAR compiler...' } })

    // Load MindAR compiler via importScripts (CDN)
    // We use the production bundle that exports Compiler
    // @ts-ignore
    importScripts('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js')

    // @ts-ignore - MindAR is loaded globally
    const { Compiler } = MINDAR

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
