import { useState, useEffect } from 'react'
import { Button } from './ui'

export type CoachMarkStep = {
  target: string // CSS selector
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

type CoachMarkProps = {
  steps: CoachMarkStep[]
  storageKey: string
  onComplete?: () => void
}

export function CoachMark({ steps, storageKey, onComplete }: CoachMarkProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(storageKey) === 'completed'
  })

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  useEffect(() => {
    if (dismissed || !step) return

    const targetElement = document.querySelector(step.target)
    if (!targetElement) return

    const rect = targetElement.getBoundingClientRect()
    const placement = step.placement || 'bottom'

    let top = 0
    let left = 0

    switch (placement) {
      case 'bottom':
        top = rect.bottom + 12
        left = rect.left + rect.width / 2
        break
      case 'top':
        top = rect.top - 12
        left = rect.left + rect.width / 2
        break
      case 'left':
        top = rect.top + rect.height / 2
        left = rect.left - 12
        break
      case 'right':
        top = rect.top + rect.height / 2
        left = rect.right + 12
        break
    }

    setPosition({ top, left })

    // Highlight target element
    targetElement.classList.add('coach-mark-highlight')

    return () => {
      targetElement.classList.remove('coach-mark-highlight')
    }
  }, [currentStep, step, dismissed])

  if (dismissed || !position || !step) return null

  function handleNext() {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  function handleSkip() {
    handleComplete()
  }

  function handleComplete() {
    localStorage.setItem(storageKey, 'completed')
    setDismissed(true)
    onComplete?.()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Coach mark card */}
      <div
        className="fixed z-[70] w-72 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translate(-50%, 0)',
        }}
      >
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {step.title}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {currentStep + 1}/{steps.length}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {step.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            className="text-xs"
            onClick={handleSkip}
          >
            跳过
          </Button>
          <Button
            className="text-xs"
            onClick={handleNext}
          >
            {isLastStep ? '完成' : '下一步'}
          </Button>
        </div>
      </div>
    </>
  )
}

// Hook for using coach marks
export function useCoachMark(storageKey: string) {
  const [shouldShow, setShouldShow] = useState(() => {
    return localStorage.getItem(storageKey) !== 'completed'
  })

  return {
    shouldShow,
    markComplete: () => {
      localStorage.setItem(storageKey, 'completed')
      setShouldShow(false)
    },
    reset: () => {
      localStorage.removeItem(storageKey)
      setShouldShow(true)
    }
  }
}
