import { useEffect, useId, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { Button } from './ui'

export function CopyPreviewDialog({
  text,
  onClose,
  onConfirm,
}: {
  text: string
  onClose: () => void
  onConfirm: () => void
}) {
  const titleId = useId()
  const descriptionId = useId()
  const ref = useRef<HTMLDialogElement | null>(null)
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!dialog.open) dialog.showModal()
    window.setTimeout(() => {
      textAreaRef.current?.focus()
      textAreaRef.current?.select()
    }, 0)
    const onCancel = (event: Event) => {
      event.preventDefault()
      closeRef.current()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      if (dialog.open) dialog.close()
      restoreFocusRef.current?.focus()
    }
  }, [])

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <dialog
      ref={ref}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:backdrop:bg-black/60"
    >
      <div className="p-5">
        <h2 id={titleId} className="text-base font-semibold text-slate-950 dark:text-slate-50">复制预览</h2>
        <p id={descriptionId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">确认无误后再点击"复制"，或直接选中文本手动复制。</p>
        <textarea
          ref={textAreaRef}
          value={text}
          readOnly
          aria-label="复制预览文本"
          className="mt-3 h-72 w-full resize-none rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          onFocus={(event) => event.currentTarget.select()}
        />
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onConfirm}>复制</Button>
        </div>
      </div>
    </dialog>
  )
}
