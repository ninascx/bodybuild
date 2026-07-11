import { DateNavigator } from '../DateNavigator'
import type { SyncState } from '../../lib/storage'
import { Badge, Button } from '../ui'
import { getLiftLogSaveLabel } from './dailyRecordStatus'

function syncTone(syncState: SyncState, savePending: boolean): 'positive' | 'warning' | 'danger' {
  if (savePending || syncState === 'saving' || syncState === 'loading') return 'warning'
  if (syncState === 'offline') return 'danger'
  return 'positive'
}

export function DailyRecordToolbar({
  selectedDate,
  today,
  syncState,
  savePending,
  lastSyncedLabel,
  xunjiSyncPending,
  onDateChange,
  onSyncFromXunji,
  onOpenHistory,
}: {
  selectedDate: string
  today: string
  syncState: SyncState
  savePending: boolean
  lastSyncedLabel: string
  xunjiSyncPending?: boolean
  onDateChange: (date: string) => void
  onSyncFromXunji?: () => void
  onOpenHistory?: () => void
}) {
  const actions = (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
      <span role="status" aria-live="polite" aria-atomic="true">
        <Badge tone={syncTone(syncState, savePending)} className="min-h-8 justify-center px-3">
          {getLiftLogSaveLabel(syncState, savePending, lastSyncedLabel)}
        </Badge>
      </span>
      {onSyncFromXunji ? (
        <Button variant="secondary" className="min-h-11 shadow-none" loading={xunjiSyncPending} onClick={onSyncFromXunji}>
          从训记导入训练
        </Button>
      ) : null}
      {onOpenHistory ? (
        <Button variant="secondary" className="min-h-11 shadow-none" onClick={onOpenHistory}>
          查看历史
        </Button>
      ) : null}
    </div>
  )

  return (
    <section
      aria-label="日期与同步工具"
      className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4"
    >
      <div className="md:hidden">
        <DateNavigator density="compact" selectedDate={selectedDate} today={today} onChange={onDateChange} footer={actions} />
      </div>
      <div className="hidden md:block">
        <DateNavigator density="toolbar" selectedDate={selectedDate} today={today} onChange={onDateChange} footer={actions} />
      </div>
      {syncState === 'offline' ? (
        <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300" role="status" aria-live="polite">
          本地数据已保留，恢复网络后会自动重试。
        </p>
      ) : null}
    </section>
  )
}
