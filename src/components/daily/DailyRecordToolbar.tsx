import { DateNavigator } from '../DateNavigator'
import type { SyncState } from '../../lib/storage'
import { Button, DropdownMenu } from '../ui'
import { getLiftLogSaveLabel } from './dailyRecordStatus'

function syncTextClass(syncState: SyncState, savePending: boolean): string {
  if (savePending || syncState === 'saving' || syncState === 'loading') return 'text-amber-700 dark:text-amber-300'
  if (syncState === 'offline') return 'text-rose-700 dark:text-rose-300'
  return 'text-emerald-700 dark:text-emerald-300'
}

function syncDotClass(syncState: SyncState, savePending: boolean): string {
  if (savePending || syncState === 'saving' || syncState === 'loading') return 'bg-amber-500'
  if (syncState === 'offline') return 'bg-rose-500'
  return 'bg-emerald-500'
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
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
      <span
        className={`hidden min-h-8 items-center gap-2 text-xs font-semibold sm:inline-flex ${syncTextClass(syncState, savePending)}`}
        role={syncState === 'offline' ? 'alert' : 'status'}
        aria-live={syncState === 'offline' ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        <span className={`h-2 w-2 rounded-full ${syncDotClass(syncState, savePending)}`} aria-hidden="true" />
        <span>{getLiftLogSaveLabel(syncState, savePending, lastSyncedLabel)}</span>
      </span>
      {onOpenHistory ? (
        <Button variant="secondary" className="min-h-11 shadow-none" onClick={onOpenHistory}>
          历史
        </Button>
      ) : null}
      {onSyncFromXunji ? (
        <DropdownMenu
          label="更多"
          triggerClassName="min-h-11 shadow-none"
          items={[
            {
              label: xunjiSyncPending ? '正在从训记导入…' : '从训记导入当日训练',
              description: '训记是外部训练数据源。',
              onSelect: onSyncFromXunji,
              disabled: xunjiSyncPending,
            },
          ]}
        />
      ) : null}
    </div>
  )

  return (
    <section
      aria-label="日期与同步工具"
      className="border-b border-[var(--surface-border)] pb-4 dark:border-slate-800"
    >
      <div className="md:hidden">
        <DateNavigator density="compact" selectedDate={selectedDate} today={today} onChange={onDateChange} footer={actions} />
      </div>
      <div className="hidden md:block">
        <DateNavigator density="toolbar" selectedDate={selectedDate} today={today} onChange={onDateChange} footer={actions} />
      </div>
      {syncState === 'offline' ? (
        <p className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300" role="status" aria-live="polite">
          本地数据已保留，恢复网络后会自动重试。
        </p>
      ) : null}
    </section>
  )
}
