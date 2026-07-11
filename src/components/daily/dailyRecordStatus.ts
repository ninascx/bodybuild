import type { SyncState } from '../../lib/storage'
import type { DailyLog, DailyTarget, WorkoutLog } from '../../types'
import { keyRecordState, type KeyRecordKey } from './dailyRecordActions'

export function getLiftLogSaveLabel(syncState: SyncState, savePending: boolean, lastSyncedLabel: string) {
  if (savePending || syncState === 'saving') return 'LiftLog 保存中'
  if (syncState === 'loading') return 'LiftLog 正在加载'
  if (syncState === 'synced') return lastSyncedLabel ? `LiftLog 已保存 · ${lastSyncedLabel}` : 'LiftLog 已保存'
  return 'LiftLog 离线缓存'
}

export type DailyRecordPrimaryAction =
  | { kind: 'focus'; label: string; focusKey: KeyRecordKey }
  | { kind: 'workout'; label: string }

export function buildDailyRecordStatus({
  weight,
  log,
  target,
  workout,
}: {
  weight?: number
  log: Partial<DailyLog>
  target: DailyTarget
  workout?: WorkoutLog
}): {
  keyRecords: ReturnType<typeof keyRecordState>
  primaryAction?: DailyRecordPrimaryAction
  workoutRecorded: boolean
} {
  const keyRecords = keyRecordState({
    weight,
    calories: log.calories,
    protein: log.protein,
  })
  const workoutRecorded = Boolean(workout) || log.workoutCompletion !== undefined || log.trained === true
  if (keyRecords.firstMissing) {
    return {
      keyRecords,
      workoutRecorded,
      primaryAction: {
        kind: 'focus',
        label: `填写${keyRecords.firstMissing.label}`,
        focusKey: keyRecords.firstMissing.key,
      },
    }
  }
  if (!target.isTrainingDay) return { keyRecords, workoutRecorded }
  return {
    keyRecords,
    workoutRecorded,
    primaryAction: {
      kind: 'workout',
      label: workoutRecorded ? '查看训练记录' : '记录当日训练',
    },
  }
}
