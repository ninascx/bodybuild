import { Button, StatusMessage } from '../ui'
import type { SyncState } from '../../lib/storage'
import type { RecommendationTone } from '../../types'

type SyncStatusBarProps = {
  syncState: SyncState
  syncMessage: string
  lastSyncedLabel: string
  saveFeedback: { tone: RecommendationTone; message: string } | null
  slowSave: boolean
  autoRetryEnabled: boolean
  noticeMessage: string
  copyMessage: string
  onRetry: () => void
}

const statusLabel: Record<SyncState, string> = {
  synced: '已同步',
  saving: '保存中',
  loading: '连接中',
  offline: '离线',
}

const statusPillClass: Record<SyncState, string> = {
  synced: 'text-emerald-700 dark:text-emerald-300',
  saving: 'text-amber-700 dark:text-amber-300',
  loading: 'text-slate-500 dark:text-slate-400',
  offline: 'text-rose-700 dark:text-rose-300',
}

export function SyncStatusBar({
  syncState,
  syncMessage,
  lastSyncedLabel,
  saveFeedback,
  slowSave,
  autoRetryEnabled,
  noticeMessage,
  copyMessage,
  onRetry,
}: SyncStatusBarProps) {
  const label = syncState === 'synced' && lastSyncedLabel ? `已同步 ${lastSyncedLabel}` : statusLabel[syncState]
  const compactMessage = syncState === 'synced' ? label : syncMessage
  const hasTransientMessage = Boolean(saveFeedback || slowSave || noticeMessage || copyMessage)
  const quietSynced = syncState === 'synced' && !autoRetryEnabled && !hasTransientMessage

  return (
    <div className="mt-1">
      <div className={quietSynced ? 'flex justify-end' : 'flex flex-wrap items-center justify-between gap-x-3 gap-y-1'}>
        <p className="min-w-0 truncate text-xs leading-5 text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-200">同步</span>
          <span className="mx-1.5 text-slate-300 dark:text-slate-700">/</span>
          <span>{compactMessage}</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full text-xs font-semibold ${statusPillClass[syncState]}`}
            role={syncState === 'offline' ? 'alert' : 'status'}
            aria-live={syncState === 'offline' ? 'assertive' : 'polite'}
            aria-atomic="true"
          >
            {label}
          </span>
          {syncState === 'offline' ? (
            <Button variant="secondary" className="px-3" onClick={onRetry}>
              重试同步
            </Button>
          ) : null}
        </div>
      </div>
      {autoRetryEnabled && syncState === 'offline' ? (
        <p className="mt-1 px-1 text-xs text-slate-500 dark:text-slate-400">已先保存在本机；恢复连接或回到页面时会自动重试。</p>
      ) : null}
      {saveFeedback || slowSave || noticeMessage || copyMessage ? (
        <div className="mt-2 grid gap-2">
          {saveFeedback ? <StatusMessage tone={saveFeedback.tone} announce>{saveFeedback.message}</StatusMessage> : null}
          {slowSave ? <StatusMessage tone="warning" announce>网络较慢，仍在尝试，本地缓存已先保存。</StatusMessage> : null}
          {noticeMessage ? <StatusMessage tone="neutral" announce>{noticeMessage}</StatusMessage> : null}
          {copyMessage ? <StatusMessage tone="positive" announce>{copyMessage}</StatusMessage> : null}
        </div>
      ) : null}
    </div>
  )
}
