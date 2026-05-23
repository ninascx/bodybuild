import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from './ui'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (value: boolean) => void
}

const dangerButtonClass =
  'inline-flex min-h-11 min-w-0 items-center justify-center rounded-md bg-rose-600 px-4 py-2 text-center text-sm font-medium leading-5 text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-500 dark:hover:bg-rose-400'
const primaryButtonClass =
  'inline-flex min-h-11 min-w-0 items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-center text-sm font-medium leading-5 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400'

/**
 * Hook：返回 confirm(options) 函数和需要渲染的 dialog 节点。
 * 用法：const { confirm, dialog } = useConfirm()
 *      const ok = await confirm({ message: '...' })
 * 在组件树某处渲染 {dialog}。
 */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ ...options, resolve })
    })
  }, [])

  // 打开/关闭原生 <dialog>。用 dialog.showModal() 自动处理焦点陷阱、ESC 关闭、背景遮罩。
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (request && !dialog.open) {
      dialog.showModal()
      // 默认聚焦到 confirm 按钮：用 rAF 把焦点从 dialog 自身移走。
      window.requestAnimationFrame(() => {
        confirmButtonRef.current?.focus()
      })
    } else if (!request && dialog.open) {
      dialog.close()
    }
  }, [request])

  const handleAnswer = useCallback(
    (value: boolean) => {
      const current = request
      if (!current) return
      setRequest(null)
      current.resolve(value)
    },
    [request],
  )

  // ESC 关闭（dialog 的原生 cancel 事件）→ 视为取消。
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onCancel = (event: Event) => {
      event.preventDefault()
      handleAnswer(false)
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [handleAnswer])

  // 点击背景遮罩 → 视为取消。
  const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) handleAnswer(false)
  }

  const dialog = (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="m-auto w-[min(420px,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:backdrop:bg-black/60"
    >
      {request ? (
        <div className="p-5">
          {request.title ? (
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">{request.title}</h2>
          ) : null}
          <p className={`text-sm leading-6 text-slate-700 dark:text-slate-300 ${request.title ? 'mt-2' : ''}`}>
            {request.message}
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => handleAnswer(false)}>
              {request.cancelLabel ?? '取消'}
            </Button>
            <button
              type="button"
              ref={confirmButtonRef}
              onClick={() => handleAnswer(true)}
              className={request.tone === 'danger' ? dangerButtonClass : primaryButtonClass}
            >
              {request.confirmLabel ?? '确定'}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  )

  return { confirm, dialog }
}
