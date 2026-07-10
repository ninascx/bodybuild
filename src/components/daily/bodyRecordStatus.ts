import type { BodyRecord } from '../../types'

export function getBodyRecordStatus(
  record: BodyRecord,
): { label: string; tone: 'positive' | 'warning' | 'neutral' } {
  if (record.origin === 'xunji') return { label: '已同步到训记', tone: 'positive' }
  if (record.origin?.startsWith('legacy')) return { label: '旧数据', tone: 'neutral' }
  if (record.synced_at) return { label: '已修改，待同步', tone: 'warning' }
  return { label: '仅本地', tone: 'neutral' }
}
