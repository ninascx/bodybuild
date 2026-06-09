import type { SyncState } from '../../lib/storage'

export function getDailySaveLabel(syncState: SyncState, savePending: boolean, lastSyncedLabel: string) {
  if (savePending) return '待保存'
  if (syncState === 'synced') return lastSyncedLabel ? `已保存 ${lastSyncedLabel}` : '已保存'
  if (syncState === 'saving') return '保存中'
  return '离线缓存'
}
