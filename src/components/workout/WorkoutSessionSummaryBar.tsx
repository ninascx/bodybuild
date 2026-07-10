import type { WorkoutLog } from '../../types'
import type { WorkoutSummary } from '../../lib/workout'
import { formatTime } from '../../lib/workout'
import { Badge, Button, Card, ProgressBar } from '../ui'

export function WorkoutSessionSummaryBar({
  restDay,
  selectedWorkout,
  workoutSummary,
  elapsedSeconds,
  restSeconds,
  restActive,
  restDefaultDuration,
  remainingSetCount,
  primaryLabel,
  primaryDisabled,
  xunjiSyncPending,
  onPrimaryAction,
  onStartRest,
  onSkipRest,
  onSyncFromXunji,
}: {
  restDay: boolean
  selectedWorkout: WorkoutLog | undefined
  workoutSummary: WorkoutSummary
  elapsedSeconds: number
  restSeconds: number
  restActive: boolean
  restDefaultDuration: number
  remainingSetCount: number
  primaryLabel: string | null
  primaryDisabled: boolean
  xunjiSyncPending: boolean
  onPrimaryAction: () => void
  onStartRest: () => void
  onSkipRest: () => void
  onSyncFromXunji: () => void
}) {
  return (
    <Card className="mb-4 hidden p-3 xl:block 2xl:hidden">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
              {restDay ? '今天休息' : selectedWorkout?.workoutName ?? '准备开始训练'}
            </p>
            <Badge tone={workoutSummary.completionPercent === 100 ? 'positive' : selectedWorkout ? 'warning' : 'neutral'}>
              {selectedWorkout ? `${workoutSummary.completionPercent}%` : '未开始'}
            </Badge>
          </div>
          {selectedWorkout ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(10rem,1fr)_auto_auto] sm:items-center">
              <div className="min-w-0">
                <ProgressBar value={workoutSummary.completionPercent} />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  已完成 {workoutSummary.filledSets}/{workoutSummary.totalSets} 组·{remainingSetCount > 0 ? `剩 ${remainingSetCount} 组` : '组数已填完'}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">用时 {formatTime(elapsedSeconds)}</p>
              <p className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                {restActive ? `休息 ${formatTime(restSeconds)}` : `休息 ${restDefaultDuration}s`}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {restDay ? '可以从训记导入历史训练记录。' : '选好计划后，从这里开始本次训练。'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {selectedWorkout && !restDay ? (
            <Button variant="secondary" className="px-3" onClick={restActive ? onSkipRest : onStartRest}>
              {restActive ? '结束休息' : `开始休息 ${restDefaultDuration}s`}
            </Button>
          ) : null}
          <Button variant="secondary" className="px-3" loading={xunjiSyncPending} onClick={onSyncFromXunji}>
            从训记导入训练
          </Button>
          {!restDay && primaryLabel ? (
            <Button className="px-5" disabled={primaryDisabled} onClick={onPrimaryAction}>
              {primaryLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
