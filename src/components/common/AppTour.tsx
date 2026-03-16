import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'

const TOUR_STEPS = [
  {
    title: 'Welcome to AR Vision!',
    content: 'Let\'s take a quick look at how to create your augmented reality experiences.',
    icon: '👋',
  },
  {
    title: 'Dashboard',
    content: 'Here you can see all your projects. Use the "New Project" button to start a fresh AR experience.',
    icon: '📊',
  },
  {
    title: 'Image Targets',
    content: 'Inside a project, you can upload images that the camera will track. We compile them into tracking files automatically.',
    icon: '🎯',
  },
  {
    title: 'AR Editor',
    content: 'This is where the magic happens. Add videos, 3D models, or text that will appear when your target is detected.',
    icon: '🎨',
  },
  {
    title: 'AR Viewer',
    content: 'Finally, launch the viewer and point your camera at the target image to see your creation come to life!',
    icon: '🚀',
  },
]

export default function AppTour() {
  const { isTourOpen, tourStep, setTourOpen, setTourStep, setHasSeenTour } = useAppStore()

  if (!isTourOpen) return null

  const step = TOUR_STEPS[tourStep]
  const isLast = tourStep === TOUR_STEPS.length - 1

  const handleNext = () => {
    if (isLast) {
      handleClose()
    } else {
      setTourStep(tourStep + 1)
    }
  }

  const handlePrev = () => {
    if (tourStep > 0) setTourStep(tourStep - 1)
  }

  const handleClose = () => {
    setTourOpen(false)
    setHasSeenTour(true)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="glass rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Header */}
          <div className="p-6 pb-0 flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-surface-2" style={{ background: 'var(--color-surface-2)' }}>
              {step.icon}
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              {step.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {step.content}
            </p>
          </div>

          {/* Footer */}
          <div className="p-6 pt-0 flex items-center justify-between">
            <div className="flex gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all"
                  style={{
                    width: i === tourStep ? '1.5rem' : '0.5rem',
                    background: i === tourStep ? 'var(--color-cyan)' : 'var(--color-border)',
                  }}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {tourStep > 0 && (
                <button onClick={handlePrev} className="btn btn-ghost !p-2">
                  <ChevronLeft size={20} />
                </button>
              )}
              <button onClick={handleNext} className="btn btn-primary px-6">
                {isLast ? 'Finish' : 'Next'}
                {!isLast && <ChevronRight size={18} />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
