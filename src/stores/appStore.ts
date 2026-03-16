import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  hasSeenTour: boolean
  isTourOpen: boolean
  tourStep: number
  setHasSeenTour: (value: boolean) => void
  setTourOpen: (open: boolean) => void
  setTourStep: (step: number) => void
  resetTour: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasSeenTour: false,
      isTourOpen: false,
      tourStep: 0,
      setHasSeenTour: (hasSeenTour) => set({ hasSeenTour }),
      setTourOpen: (isTourOpen) => set({ isTourOpen }),
      setTourStep: (tourStep) => set({ tourStep }),
      resetTour: () => set({ tourStep: 0, isTourOpen: true }),
    }),
    {
      name: 'ar-vision-settings',
      partialize: (state) => ({ hasSeenTour: state.hasSeenTour }),
    }
  )
)
