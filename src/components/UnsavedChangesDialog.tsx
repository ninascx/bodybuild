import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Button } from './ui'

export type UnsavedChangesDecision = 'save' | 'discard' | 'stay'

type UnsavedChangesRequest = {
  sectionLabel: string
  resolve: (decision: UnsavedChangesDecision) => void
}

export function useUnsavedChangesDialog() {
  const [request, setRequest] = useState<UnsavedChangesRequest | null>(null)
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const keepEditingRef = useRef<HTMLButtonElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  const decide = useCallback((sectionLabel: string) => (
    new Promise<UnsavedChangesDecision>((resolve) => {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setRequest({ sectionLabel, resolve })
    })
  ), [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (request && !dialog.open) {
      dialog.showModal()
      window.requestAnimationFrame(() => keepEditingRef.current?.focus())
    } else if (!request && dialog.open) {
      dialog.close()
    }
  }, [request])

  const answer = useCallback((decision: UnsavedChangesDecision) => {
    const current = request
    if (!current) return
    setRequest(null)
    current.resolve(decision)
    window.requestAnimationFrame(() => {
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    })
  }, [request])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (event: Event) => {
      event.preventDefault()
      answer('stay')
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [answer])

  const dialog = (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="m-auto w-[min(460px,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-0 text-slate-900 backdrop:bg-slate-950/45 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      onClick={(event) => {
        if (event.target === event.currentTarget) answer('stay')
      }}
    >
      {request ? (
        <div className="p-5">
          <h2 id={titleId} className="text-lg font-semibold text-slate-950 dark:text-slate-50">保存未完成的修改？</h2>
          <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            “{request.sectionLabel}”还有未保存修改。保存失败时会留在当前页面，不会丢失草稿。
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-[auto_auto_1fr] sm:justify-end">
            <Button ref={keepEditingRef} variant="secondary" onClick={() => answer('stay')}>继续编辑</Button>
            <Button variant="ghost" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/30" onClick={() => answer('discard')}>
              放弃修改
            </Button>
            <Button className="sm:justify-self-end" onClick={() => answer('save')}>保存并离开</Button>
          </div>
        </div>
      ) : null}
    </dialog>
  )

  return { decide, dialog }
}
