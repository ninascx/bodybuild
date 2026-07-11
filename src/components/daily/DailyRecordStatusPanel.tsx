import type { buildDailyRecordStatus } from './dailyRecordStatus'
import { Button } from '../ui'

type DailyStatus = ReturnType<typeof buildDailyRecordStatus>

export function DailyRecordStatusPanel({
  status,
  pendingBodyCount,
  onPrimaryAction,
  onSyncBody,
}: {
  status: DailyStatus
  pendingBodyCount: number
  onPrimaryAction: () => void
  onSyncBody: () => void
}) {
  const missingItems = status.keyRecords.items.filter((item) => item.value === undefined)
  const completed = status.keyRecords.completed
  const total = status.keyRecords.total

  return (
    <section
      aria-labelledby="daily-record-status-title"
      className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p id="daily-record-status-title" className="text-sm font-semibold text-slate-950 dark:text-slate-50">
            今日记录
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {completed}/{total} 项关键数据已完成
          </p>
        </div>
        <span
          className="inline-flex min-h-8 items-center rounded-full bg-[var(--surface-muted)] px-3 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          role="status"
          aria-live="polite"
        >
          {completed === total ? '可以结束记录' : `还差 ${total - completed} 项`}
        </span>
      </div>

      {missingItems.length > 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          下一步：补充{missingItems.slice(0, 2).map((item) => item.label).join('、')}
          {missingItems.length > 2 ? '等信息' : ''}。
        </p>
      ) : null}

      <ul className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="关键记录完成情况">
        {status.keyRecords.items.map((item) => {
          const complete = item.value !== undefined
          return (
            <li key={item.key} className="flex min-h-9 items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <span
                className={complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}
                aria-hidden="true"
              >
                {complete ? '✓' : '○'}
              </span>
              <span>{item.label}</span>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        {pendingBodyCount > 0 ? (
          <Button variant="secondary" onClick={onSyncBody}>
            同步身体数据 · {pendingBodyCount} 项
          </Button>
        ) : null}
        {status.primaryAction ? <Button onClick={onPrimaryAction}>{status.primaryAction.label}</Button> : null}
      </div>
    </section>
  )
}
