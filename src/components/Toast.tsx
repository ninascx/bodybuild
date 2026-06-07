import { useEffect } from 'react'
import { Button } from './ui'

type ToastTone = 'success' | 'warning' | 'danger' | 'neutral'

export type ToastMessage = {
  id: string
  message: string
  tone: ToastTone
  duration?: number
  action?: { label: string; handler: () => void }
}

type ToastProps = {
  toast: ToastMessage
  onClose: (id: string) => void
}

const toneClasses: Record<ToastTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-900/80 dark:text-emerald-50',
  warning: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-700/40 dark:bg-amber-900/80 dark:text-amber-50',
  danger: 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-700/40 dark:bg-rose-900/80 dark:text-rose-50',
  neutral: 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50',
}

export function Toast({ toast, onClose }: ToastProps) {
  const liveMode = toast.tone === 'danger' ? 'assertive' : 'polite'
  const defaultDuration = toast.tone === 'success' ? 2000 : 3000

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id)
    }, toast.duration ?? defaultDuration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, defaultDuration, onClose])

  const isLightweight = toast.tone === 'success' && !toast.action

  return (
    <div
      className={`motion-feedback ${toast.tone === 'success' ? 'motion-success' : ''} flex min-w-[280px] max-w-[90vw] items-center justify-between gap-3 rounded-lg border px-4 ${isLightweight ? 'py-2' : 'py-3'} shadow-sm ${toneClasses[toast.tone]}`}
      role={toast.tone === 'danger' ? 'alert' : 'status'}
      aria-live={liveMode}
    >
      <p className={`font-medium ${isLightweight ? 'text-xs' : 'text-sm'}`}>{toast.message}</p>
      <div className="flex shrink-0 items-center gap-2">
        {toast.action ? (
          <Button
            variant="ghost"
            onClick={() => {
              toast.action!.handler()
              onClose(toast.id)
            }}
            className="min-h-8 px-2 text-xs font-semibold text-current hover:bg-black/10 hover:text-current dark:hover:bg-white/15"
          >
            {toast.action.label}
          </Button>
        ) : null}
        {!isLightweight ? (
          <Button
            variant="ghost"
            onClick={() => onClose(toast.id)}
            className="min-h-11 shrink-0 px-3 text-current opacity-80 hover:bg-black/5 hover:text-current hover:opacity-100 dark:hover:bg-white/10"
            aria-label="关闭通知"
          >
            关闭
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => onClose(toast.id)}
            className="shrink-0 text-current opacity-60 hover:opacity-100"
            aria-label="关闭通知"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
