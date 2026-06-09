import { DateNavigator } from '../DateNavigator'
import type { SyncState } from '../../lib/storage'
import { Badge } from '../ui'
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
  onDateChange,
}: {
  selectedDate: string
  today: string
  syncState: SyncState
  savePending: boolean
  lastSyncedLabel: string
  onDateChange: (date: string) => void
}) {
  return (
    <section className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] px-3 py-3 dark:border-slate-800 dark:bg-slate-900 lg:flex lg:items-end lg:justify-between lg:gap-4 lg:px-4">
      <div className="min-w-0">
        <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 lg:text-sm lg:font-semibold lg:text-slate-950 lg:dark:text-slate-50">记录日期</p>
        <DateNavigator selectedDate={selectedDate} today={today} onChange={onDateChange} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 lg:mt-0 lg:shrink-0 lg:justify-end">
        <span className="text-xs text-slate-500 dark:text-slate-400">保存状态</span>
        <Badge tone={syncTone(syncState, savePending)} className="justify-center">
          {getDailySaveLabel(syncState, savePending, lastSyncedLabel)}
        </Badge>
      </div>
      {syncState === 'offline' ? (
        <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300 lg:hidden">将在联网后自动同步</p>
      ) : null}
    </section>
  )
}
