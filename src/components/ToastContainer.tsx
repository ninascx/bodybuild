import { createContext, useState, useCallback, type ReactNode } from 'react'
import { Toast, type ToastMessage } from './Toast'

type ToastContextValue = {
  showToast: (message: string, tone?: ToastMessage['tone'], duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((message: string, tone: ToastMessage['tone'] = 'neutral', duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, message, tone, duration }])
  }, [])

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2"
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
