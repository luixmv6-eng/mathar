// MindAR .mind file compiler — runs in a Web Worker to avoid blocking UI

export interface CompileProgress {
  progress: number
  phase: string
}

/**
 * Compiles an image file to a .mind buffer using MindAR's compiler.
 * This runs compiler logic that should be called inside a Web Worker.
 */
export async function compileMindFile(
  imageFile: File,
  onProgress: (p: CompileProgress) => void
): Promise<ArrayBuffer> {
  // Dynamically import MindAR compiler via CDN script
  // The compiler is loaded in mindarCompilerWorker.ts
  onProgress({ progress: 0, phase: 'Loading compiler...' })

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/mindARCompilerWorker.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e) => {
      const { type, data } = e.data
      if (type === 'progress') {
        onProgress(data as CompileProgress)
      } else if (type === 'done') {
        resolve(data as ArrayBuffer)
        worker.terminate()
      } else if (type === 'error') {
        reject(new Error(data))
        worker.terminate()
      }
    }

    worker.onerror = (err) => {
      reject(err)
      worker.terminate()
    }

    worker.postMessage({ imageFile })
  })
}
