import type { WorkoutSummary } from '../../lib/workout'
import { formatTime } from '../../lib/workout'
import { Button } from '../ui'

export function MobileWorkoutBottomBar({
  exerciseName,
  setIndex,
  currentSetStatus,
  restDefaultDuration,
  restActive,
  restSeconds,
  workoutSummary,
  expanded: _expanded,
  keyboardHeight,
  bottomNextLabel,
  bottomNextDisabled,
  bottomPrimaryLabel,
  bottomPrimaryTitle,
  bottomCompletionHint,
  canGoPrevious,
  quickFillLabel,
  quickFillDisabled,
  onToggleExpanded: _onToggleExpanded,
  onPreviousExercise,
  onNext,
  onPrimary,
  onQuickFill,
  onStartRest,
  onAdjustRestDuration,
  onSkipRest,
}: {
  exerciseName: string
  setIndex: number
  currentSetStatus: string
  restDefaultDuration: number
  restActive: boolean
  restSeconds: number
  workoutSummary: WorkoutSummary
  expanded: boolean
  keyboardHeight: number
  bottomNextLabel: string
  bottomNextDisabled: boolean
  bottomPrimaryLabel: string
  bottomPrimaryTitle: string
  bottomCompletionHint: string
  canGoPrevious: boolean
  quickFillLabel: string | null
  quickFillDisabled: boolean
  onToggleExpanded: () => void
  onPreviousExercise: () => void
  onNext: () => void
  onPrimary: () => void
  onQuickFill: () => void
  onStartRest: () => void
  onAdjustRestDuration: (delta: number) => void
  onSkipRest: () => void
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
      style={{ transform: keyboardHeight > 0 ? `translateY(-${keyboardHeight}px)` : undefined }}
    >
      {/* Rest timer — prominent when active */}
      {restActive ? (
        <div className="border-b border-slate-200 px-4 py-2 dark:border-slate-700">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">组间休息</p>
            <p className={`text-xl font-bold tabular-nums ${restSeconds === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatTime(restSeconds)}
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="secondary" className="min-h-9 px-2 py-1 text-xs" onClick={() => onAdjustRestDuration(-15)}>-15s</Button>
              <Button variant="secondary" className="min-h-9 px-2 py-1 text-xs" onClick={() => onAdjustRestDuration(15)}>+15s</Button>
              <Button className="min-h-9 px-2.5 py-1 text-xs" onClick={onSkipRest}>跳过</Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Top info bar */}
      <div className="flex items-center gap-2 px-3 pt-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">{exerciseName}</p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            第 {setIndex + 1} 组 · {currentSetStatus} · {workoutSummary.completionPercent}%
          </p>
        </div>
        {!restActive ? (
          <Button variant="secondary" className="min-h-9 px-2.5 py-1 text-xs" onClick={onStartRest}>
            休息 {restDefaultDuration}s
          </Button>
        ) : null}
      </div>

      {/* Main action buttons */}
      <div className="grid grid-cols-[1fr_1.2fr_1.2fr] gap-2 px-3 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <Button variant="secondary" className="min-h-12 px-2 text-xs" onClick={onPreviousExercise} disabled={!canGoPrevious}>
          上一动作
        </Button>
        <Button className="min-h-12 px-2 text-sm font-semibold" onClick={onNext} disabled={bottomNextDisabled}>
          {bottomNextLabel}
        </Button>
        <Button variant="secondary" className="min-h-12 px-2 text-xs" onClick={onPrimary} title={bottomPrimaryTitle}>
          {bottomPrimaryLabel}
        </Button>
      </div>

      {/* Quick actions row */}
      <div className="flex items-center gap-2 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <Button variant="secondary" className="flex-1 px-2 py-1.5 text-[11px]" onClick={onQuickFill} disabled={quickFillDisabled}>
          {quickFillLabel ?? '快速套用'}
        </Button>
      </div>
      {bottomCompletionHint ? (
        <p className="px-3 pb-1 text-center text-[11px] text-slate-400 dark:text-slate-500">{bottomCompletionHint}</p>
      ) : null}
    </div>
  )
}
