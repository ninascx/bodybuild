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
  expanded,
  keyboardHeight,
  bottomNextLabel,
  bottomNextDisabled,
  bottomPrimaryLabel,
  bottomPrimaryTitle,
  bottomCompletionHint,
  canGoPrevious,
  quickFillLabel,
  quickFillDisabled,
  onToggleExpanded,
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
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={expanded ? '收起训练操作面板' : '展开训练操作面板'}
        onClick={onToggleExpanded}
        className="w-full px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:focus-visible:ring-orange-600"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{exerciseName}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              第 {setIndex + 1} 组 · {currentSetStatus}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="text-right" title={`默认休息 ${restDefaultDuration}s`}>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{restActive ? '休息' : '进度'}</p>
              <p className={`text-sm font-bold tabular-nums ${restActive && restSeconds === 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                {restActive ? formatTime(restSeconds) : `${workoutSummary.completionPercent}%`}
              </p>
            </div>
            <svg className={`h-5 w-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-slate-200 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 dark:border-slate-700">
          {restActive ? (
            <div className="mb-2 grid grid-cols-3 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-[auto_1fr_auto_auto]">
              <Button variant="secondary" className="px-3 text-xs" onClick={() => onAdjustRestDuration(-15)}>
                -15s
              </Button>
              <div className="order-first col-span-3 rounded-md bg-white px-3 py-1.5 text-center dark:bg-slate-900 sm:order-none sm:col-span-1">
                <p className={`text-base font-bold tabular-nums ${restSeconds === 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{formatTime(restSeconds)}</p>
              </div>
              <Button variant="secondary" className="px-3 text-xs" onClick={() => onAdjustRestDuration(15)}>
                +15s
              </Button>
              <Button className="px-3 text-xs" onClick={onSkipRest}>
                结束
              </Button>
            </div>
          ) : null}

          <div className="grid grid-cols-[1fr_1.15fr_1.15fr] gap-2">
            <Button variant="secondary" className="min-h-12 px-2 text-xs" onClick={onPreviousExercise} disabled={!canGoPrevious}>
              上一动作
            </Button>
            <Button className="min-h-12 px-2 text-sm" onClick={onNext} disabled={bottomNextDisabled}>
              {bottomNextLabel}
            </Button>
            <Button
              variant="secondary"
              className="min-h-12 px-2 text-xs"
              onClick={onPrimary}
              title={bottomPrimaryTitle}
            >
              {bottomPrimaryLabel}
            </Button>
          </div>

          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <Button variant="secondary" className="px-2 text-xs" onClick={onQuickFill} disabled={quickFillDisabled}>
              {quickFillLabel ?? '快速套用'}
            </Button>
            <Button variant="secondary" className="px-3 text-xs" onClick={onStartRest} disabled={restActive}>
              休息
            </Button>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="min-w-0 truncate">{bottomCompletionHint}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
