import type { buildDailyRecordStatus } from './dailyRecordStatus'
import { Button } from '../ui'

type DailyStatus = ReturnType<typeof buildDailyRecordStatus>

export function DailyRecordStatusPanel({
  status,
  pendingBodyCount,
  variant,
  onPrimaryAction,
  onSyncBody,
}: {
  status: DailyStatus
  pendingBodyCount: number
  variant: 'compact' | 'rail'
  onPrimaryAction: () => void
  onSyncBody: () => void
}) {
  const content = (
    <>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">当日状态</p>
        <p className="mt-1 text-base font-semibold text-slate-950 dark:text-slate-50">
          已记录 {status.keyRecords.completed}/{status.keyRecords.total}
        </p>
      </div>

      <ul className={variant === 'compact' ? 'flex flex-wrap gap-x-4 gap-y-2' : 'mt-4 grid gap-2'} aria-label="关键记录完成情况">
        {status.keyRecords.items.map((item) => {
          const complete = item.value !== undefined
          return (
            <li key={item.key} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <span className={complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'} aria-hidden="true">
                {complete ? '✓' : '○'}
              </span>
              <span>{item.label}</span>
            </li>
          )
        })}
      </ul>

      <div className={variant === 'compact' ? 'flex flex-wrap items-center justify-end gap-2' : 'mt-4 grid gap-2'}>
        {pendingBodyCount > 0 ? (
          <Button variant="secondary" className={variant === 'compact' ? 'px-3' : 'w-full'} onClick={onSyncBody}>
            同步到训记 · {pendingBodyCount} 项
          </Button>
        ) : null}
        {status.primaryAction ? (
          <Button className={variant === 'compact' ? 'px-4' : 'w-full'} onClick={onPrimaryAction}>
            {status.primaryAction.label}
          </Button>
        ) : null}
      </div>
    </>
  )

  if (variant === 'compact') {
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-4 dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        {content}
      </section>
    )
  }

  return (
    <aside className="sticky top-20 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-4 dark:border-slate-800 dark:bg-slate-900">
      {content}
      {!status.primaryAction && pendingBodyCount === 0 ? (
        <p className="mt-4 border-t border-[var(--surface-border)] pt-4 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:text-slate-400">
          当日记录已经完成，可以离开本页。
        </p>
      ) : null}
    </aside>
  )
}
