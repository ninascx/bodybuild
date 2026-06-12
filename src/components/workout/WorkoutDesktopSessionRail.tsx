import type { WorkoutLog } from '../../types'
import type { WorkoutSummary } from '../../lib/workout'
import type { SyncState } from '../../lib/storage'
import { formatTime } from '../../lib/workout'
import { Badge, Button, Card, Checkbox, ProgressBar } from '../ui'

function currentExerciseLabel(workout: WorkoutLog | undefined, index: number): string {
  const exercise = workout?.exercises[index]
  if (!exercise) return '暂无当前动作'
  return `${index + 1}. ${exercise.name}`
}

function syncBadge(syncState: SyncState | undefined): { text: string; tone: 'positive' | 'warning' | 'danger' | 'neutral' } {
  if (syncState === 'synced') return { text: '已保存', tone: 'positive' }
  if (syncState === 'saving' || syncState === 'loading') return { text: '保存中', tone: 'warning' }
  if (syncState === 'offline') return { text: '离线', tone: 'danger' }
  return { text: '待同步', tone: 'neutral' }
}

export function WorkoutDesktopSessionRail({
  restDay = false,
  selectedWorkout,
  workoutSummary,
  elapsedSeconds,
  restSeconds,
  restActive,
  restDefaultDuration,
  autoStartRest,
  workoutMarkedComplete,
  workoutReadyToConfirm,
  trainingMode,
  remainingSetCount,
  currentExerciseIndex,
  suggestedExerciseIndex,
  hasNextIncompleteExercise,
  statusPrimaryLabel,
  completionHint,
  syncState,
  xunjiSyncPending = false,
  primaryDisabled = false,
  onPrimaryAction,
  onCreateBlankWorkout,
  onSyncFromXunji,
  onJumpToCurrent,
  onJumpToNextIncomplete,
  onStartRest,
  onSkipRest,
  onAdjustRestDuration,
  onToggleAutoStart,
  onExitTrainingMode,
}: {
  restDay?: boolean
  selectedWorkout: WorkoutLog | undefined
  workoutSummary: WorkoutSummary
  elapsedSeconds: number
  restSeconds: number
  restActive: boolean
  restDefaultDuration: number
  autoStartRest: boolean
  workoutMarkedComplete: boolean
  workoutReadyToConfirm: boolean
  trainingMode: boolean
  remainingSetCount: number
  currentExerciseIndex: number
  suggestedExerciseIndex: number
  hasNextIncompleteExercise: boolean
  statusPrimaryLabel: string | null
  completionHint: string
  syncState?: SyncState
  xunjiSyncPending?: boolean
  primaryDisabled?: boolean
  onPrimaryAction: () => void
  onCreateBlankWorkout?: () => void
  onSyncFromXunji?: () => void
  onJumpToCurrent: () => void
  onJumpToNextIncomplete: () => void
  onStartRest: () => void
  onSkipRest: () => void
  onAdjustRestDuration: (delta: number) => void
  onToggleAutoStart: () => void
  onExitTrainingMode: () => void
}) {
  const restLabel = restActive ? formatTime(restSeconds) : `${restDefaultDuration}s`
  const currentLabel = currentExerciseLabel(selectedWorkout, currentExerciseIndex)
  const nextLabel = currentExerciseLabel(selectedWorkout, suggestedExerciseIndex)
  const currentSyncBadge = syncBadge(syncState)
  let primaryLabel: string | null = null
  if (!restDay) {
    if (!selectedWorkout) {
      primaryLabel = '开始训练'
    } else if (workoutMarkedComplete) {
      primaryLabel = '查看训练'
    } else if (workoutReadyToConfirm) {
      primaryLabel = '确认完成'
    } else {
      primaryLabel = statusPrimaryLabel ?? '继续训练'
    }
  }

  return (
    <aside className="hidden lg:block lg:self-stretch">
      <div data-workout-session-rail className="sticky top-20">
        <Card className="grid max-h-[calc(100vh-6rem)] gap-4 overflow-y-auto p-4 shadow-none">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">训练会话</p>
          <h3 className="mt-1 truncate text-base font-semibold text-slate-950 dark:text-slate-50">
            {restDay ? '今天休息' : selectedWorkout?.workoutName ?? '准备开始训练'}
          </h3>
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {restDay ? '休息日不需要开始训练；可以同步训记或回看历史。' : completionHint}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">用时</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950 dark:text-slate-50">{formatTime(elapsedSeconds)}</p>
          </div>
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">{restActive ? '休息中' : '休息默认'}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${restActive && restSeconds === 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
              {restLabel}
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-500 dark:text-slate-400">完成组</span>
            <span className="font-semibold tabular-nums text-slate-950 dark:text-slate-50">{workoutSummary.filledSets}/{workoutSummary.totalSets}</span>
          </div>
          <ProgressBar value={workoutSummary.completionPercent} />
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>{workoutSummary.completionPercent}%</span>
            <span>{remainingSetCount > 0 ? `剩 ${remainingSetCount} 组` : '组数已填完'}</span>
          </div>
        </div>

        {selectedWorkout ? (
        <div className="grid gap-2 rounded-lg border border-[var(--surface-border)] p-3 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">当前位置</p>
          <button
            type="button"
            className="min-h-10 rounded-md text-left text-sm font-semibold text-slate-950 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] dark:text-slate-50 dark:focus-visible:ring-cyan-500"
            onClick={onJumpToCurrent}
          >
            {currentLabel}
          </button>
          {hasNextIncompleteExercise ? (
            <Button variant="secondary" className="justify-start px-3 text-xs shadow-none" onClick={onJumpToNextIncomplete}>
              下一未完成：{nextLabel}
            </Button>
          ) : null}
        </div>
        ) : null}

        {selectedWorkout && !workoutMarkedComplete ? (
        <div className="grid gap-2">
          {restActive ? (
            <div className={`rounded-lg border p-3 ${restSeconds === 0 ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-900/30' : 'border-[var(--surface-border)] bg-[var(--surface-muted)] dark:border-slate-700 dark:bg-slate-800'}`}>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{restSeconds === 0 ? '休息时间到' : '组间休息'}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{formatTime(restSeconds)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" className="px-3 text-xs shadow-none" onClick={() => onAdjustRestDuration(-15)}>-15s</Button>
                <Button className="px-3 text-xs" onClick={onSkipRest}>结束休息</Button>
                <Button variant="secondary" className="px-3 text-xs shadow-none" onClick={() => onAdjustRestDuration(15)}>+15s</Button>
              </div>
            </div>
          ) : (
            <>
              <Button variant="secondary" className="border-[var(--color-primary-600)] text-[var(--color-primary-700)] shadow-none dark:border-cyan-600/40 dark:text-cyan-300" onClick={onStartRest}>
                开始休息 ({restDefaultDuration}s)
              </Button>
              <Checkbox checked={autoStartRest} onChange={onToggleAutoStart} label="完成组后自动休息" />
            </>
          )}
        </div>
        ) : null}

        {onSyncFromXunji ? (
          <div className="grid gap-2 rounded-lg border border-[var(--surface-border)] p-3 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">训记同步</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">从外部记录拉取今天训练。</p>
              </div>
              <Badge tone={currentSyncBadge.tone}>{currentSyncBadge.text}</Badge>
            </div>
            <Button variant="secondary" className="w-full justify-center shadow-none" loading={xunjiSyncPending} onClick={onSyncFromXunji}>
              同步训记
            </Button>
          </div>
        ) : null}

        <div className="grid gap-2">
          {primaryLabel ? (
            <Button className="min-h-11 font-semibold" onClick={onPrimaryAction} disabled={primaryDisabled}>
              {primaryLabel}
            </Button>
          ) : null}
          {!selectedWorkout && !restDay && onCreateBlankWorkout ? (
            <Button variant="secondary" className="shadow-none" onClick={onCreateBlankWorkout}>
              空白训练
            </Button>
          ) : null}
          {trainingMode && selectedWorkout ? (
            <Button variant="secondary" className="shadow-none" onClick={onExitTrainingMode}>
              {workoutMarkedComplete ? '返回记录' : '退出训练计时'}
            </Button>
          ) : null}
        </div>
        </Card>
      </div>
    </aside>
  )
}
