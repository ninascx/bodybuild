import { createContext, useState, useCallback, useContext, type ReactNode } from 'react'
import { Toast, type ToastMessage } from './Toast'

type ToastContextValue = {
  showToast: (message: string, tone?: ToastMessage['tone'], duration?: number, action?: { label: string; handler: () => void }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((message: string, tone: ToastMessage['tone'] = 'neutral', duration?: number, action?: { label: string; handler: () => void }) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    const defaultDuration = tone === 'success' ? 2000 : 3000
    setToasts((prev) => [...prev, { id, message, tone, duration: duration ?? defaultDuration, action }])
  }, [])

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-2 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 pb-[env(safe-area-inset-bottom)]"
        role="region"
        aria-label="通知"
        aria-relevant="additions removals"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={closeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
