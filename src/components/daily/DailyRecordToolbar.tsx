import { DateNavigator } from '../DateNavigator'
import type { SyncState } from '../../lib/storage'
import { Badge, Button } from '../ui'
import { getDailySaveLabel } from './dailyRecordStatus'

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
}: {
  selectedDate: string
  today: string
  syncState: SyncState
  savePending: boolean
  lastSyncedLabel: string
  xunjiSyncPending?: boolean
  onDateChange: (date: string) => void
  onSyncFromXunji?: () => void
}) {
  return (
    <section className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-4">
      <p className="mb-2 text-sm font-semibold text-slate-950 dark:text-slate-50">记录日期</p>
      <DateNavigator
        density="compact"
        selectedDate={selectedDate}
        today={today}
        onChange={onDateChange}
        footer={
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <span role="status" aria-live="polite" aria-atomic="true">
              <Badge tone={syncTone(syncState, savePending)} className="justify-center">
                {getDailySaveLabel(syncState, savePending, lastSyncedLabel)}
              </Badge>
            </span>
            {onSyncFromXunji ? (
              <Button
                variant="secondary"
                className="min-h-11 shadow-none"
                loading={xunjiSyncPending}
                onClick={onSyncFromXunji}
              >
                从训记导入
              </Button>
            ) : null}
          </div>
        }
      />
      {syncState === 'offline' ? (
        <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">将在联网后自动同步</p>
      ) : null}
    </section>
  )
}
