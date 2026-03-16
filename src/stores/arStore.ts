import { create } from 'zustand'

interface ARState {
  isRunning: boolean
  currentProjectId: string | null
  detectedTargets: Set<number>
  torch: boolean
  facingMode: 'environment' | 'user'
  setRunning: (v: boolean) => void
  setProjectId: (id: string | null) => void
  addDetected: (idx: number) => void
  removeDetected: (idx: number) => void
  toggleTorch: () => void
  toggleCamera: () => void
  reset: () => void
}

export const useARStore = create<ARState>((set) => ({
  isRunning: false,
  currentProjectId: null,
  detectedTargets: new Set(),
  torch: false,
  facingMode: 'environment',
  setRunning: (v) => set({ isRunning: v }),
  setProjectId: (id) => set({ currentProjectId: id }),
  addDetected: (idx) => set((s) => ({ detectedTargets: new Set([...s.detectedTargets, idx]) })),
  removeDetected: (idx) => set((s) => {
    const next = new Set(s.detectedTargets); next.delete(idx); return { detectedTargets: next }
  }),
  toggleTorch: () => set((s) => ({ torch: !s.torch })),
  toggleCamera: () => set((s) => ({ facingMode: s.facingMode === 'environment' ? 'user' : 'environment' })),
  reset: () => set({ isRunning: false, detectedTargets: new Set(), torch: false }),
}))
