import { useEffect, useId, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { bodyValue } from '../../lib/bodyMetrics'
import type { BodyRecord, DailyLog, WorkoutLog } from '../../types'
import { Badge, Button } from '../ui'
import { MiniCalendar } from '../MiniCalendar'

function formatNumber(value: number | undefined, unit: string): string {
  return value === undefined ? '未填' : `${value}${unit}`
}

function hasHistoryContent(log: DailyLog, bodyRecords: BodyRecord[], workoutLogs: WorkoutLog[]): boolean {
  return (
    bodyRecords.some((record) => record.datestr === log.date) ||
    workoutLogs.some((workout) => workout.date === log.date) ||
    log.calories !== undefined ||
    log.protein !== undefined ||
    log.carbs !== undefined ||
    log.fat !== undefined ||
    log.steps !== undefined ||
    log.sleepHours !== undefined ||
    log.fatigueScore !== undefined ||
    log.workoutCompletion !== undefined ||
    log.trained !== undefined ||
    Boolean(log.notes?.trim())
  )
}

export function DailyHistoryDialog({
  selectedDate,
  today,
  dailyLogs,
  bodyRecords,
  workoutLogs,
  onSelectDate,
  onClose,
}: {
  selectedDate: string
  today: string
  dailyLogs: DailyLog[]
  bodyRecords: BodyRecord[]
  workoutLogs: WorkoutLog[]
  onSelectDate: (date: string) => void
  onClose: () => void
}) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!dialog.open) dialog.showModal()
    window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    const handleCancel = (event: Event) => {
      event.preventDefault()
      closeRef.current()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
      if (dialog.open) dialog.close()
      window.requestAnimationFrame(() => previousFocusRef.current?.focus())
    }
  }, [])

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  const recentLogs = [...dailyLogs]
    .filter((log) => log.date <= today && hasHistoryContent(log, bodyRecords, workoutLogs))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)

  const selectDate = (date: string) => {
    onSelectDate(date)
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        onClose()
      }}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-y-0 right-0 m-0 ml-auto h-dvh max-h-dvh w-full max-w-[27rem] overflow-y-auto rounded-none border-0 border-l border-[var(--surface-border)] bg-[var(--surface-panel)] p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:backdrop:bg-black/60"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--surface-border)] bg-[var(--surface-panel)] px-4 py-4 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-slate-950 dark:text-slate-50">历史记录</h2>
          <p id={descriptionId} className="mt-1 text-sm text-slate-500 dark:text-slate-400">选择日期后返回当日记录。</p>
        </div>
        <Button ref={closeButtonRef} variant="ghost" className="min-w-11 px-3" onClick={onClose} aria-label="关闭历史记录">
          ×
        </Button>
      </div>

      <div className="grid gap-5 p-4">
        <section aria-label="最近六周">
          <MiniCalendar
            key={selectedDate}
            selectedDate={selectedDate}
            today={today}
            dailyLogs={dailyLogs}
            workoutLogs={workoutLogs}
            onSelectDate={selectDate}
          />
        </section>

        <section aria-labelledby={`${titleId}-recent`}>
          <div className="flex items-center justify-between gap-3">
            <h3 id={`${titleId}-recent`} className="text-sm font-semibold text-slate-950 dark:text-slate-50">最近记录</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">{recentLogs.length} 条</span>
          </div>
          <div className="mt-2 grid gap-2">
            {recentLogs.length > 0 ? recentLogs.map((log) => {
              const workout = workoutLogs.find((item) => item.date === log.date)
              return (
                <button
                  key={log.date}
                  type="button"
                  className="min-h-14 rounded-md border border-[var(--surface-border)] bg-white px-3 py-2 text-left transition-colors hover:border-[var(--surface-border-strong)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:focus-visible:ring-cyan-500"
                  onClick={() => selectDate(log.date)}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-950 dark:text-slate-50">{log.date}</span>
                    {log.trained || workout ? <Badge tone="positive">训练</Badge> : null}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    {formatNumber(bodyValue(bodyRecords, log.date, 'weight'), 'kg')} · {formatNumber(log.calories, 'kcal')} · {formatNumber(log.protein, 'g')}
                  </span>
                </button>
              )
            }) : (
              <p className="rounded-md border border-dashed border-[var(--surface-border)] px-3 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                还没有可查看的历史记录。
              </p>
            )}
          </div>
        </section>
      </div>
    </dialog>
  )
}
