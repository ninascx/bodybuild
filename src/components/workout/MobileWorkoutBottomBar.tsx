import { useEffect, useState } from 'react'
import type { WorkoutSummary } from '../../lib/workout'
import { formatTime } from '../../lib/workout'
import { Button } from '../ui'

type MobileWorkoutBottomBarProps = {
  exerciseName: string
  setIndex: number
  currentSetStatus: string
  restDefaultDuration: number
  restActive: boolean
  restSeconds: number
  workoutSummary: WorkoutSummary
  keyboardHeight: number
  bottomNextLabel: string
  bottomNextDisabled: boolean
  bottomFinishLabel: string
  bottomFinishTitle: string
  bottomCompletionHint: string
  canGoPrevious: boolean
  quickFillLabel: string | null
  quickFillDisabled: boolean
  onPreviousExercise: () => void
  onNext: () => void
  onFinish: () => void
  onQuickFill: () => void
  onStartRest: () => void
  onAdjustRestDuration: (delta: number) => void
  onSkipRest: () => void
}

function restLabel(restActive: boolean, restSeconds: number, restDefaultDuration: number) {
  if (!restActive) return `休息 ${restDefaultDuration}s`
  if (restSeconds === 0) return '休息结束'
  return `休息 ${formatTime(restSeconds)}`
}

export function MobileWorkoutBottomBar({
  exerciseName,
  setIndex,
  currentSetStatus,
  restDefaultDuration,
  restActive,
  restSeconds,
  workoutSummary,
  keyboardHeight,
  bottomNextLabel,
  bottomNextDisabled,
  bottomFinishLabel,
  bottomFinishTitle,
  bottomCompletionHint,
  canGoPrevious,
  quickFillLabel,
  quickFillDisabled,
  onPreviousExercise,
  onNext,
  onFinish,
  onQuickFill,
  onStartRest,
  onAdjustRestDuration,
  onSkipRest,
}: MobileWorkoutBottomBarProps) {
  const [expanded, setExpanded] = useState(false)
  const restDone = restActive && restSeconds === 0
  const restText = restLabel(restActive, restSeconds, restDefaultDuration)

  useEffect(() => {
    if (keyboardHeight <= 0) return
    const frame = window.requestAnimationFrame(() => setExpanded(false))
    return () => window.cancelAnimationFrame(frame)
  }, [keyboardHeight])

  return (
    <>
      {expanded ? (
        <button
          type="button"
          aria-label="收起训练控制面板"
          className="motion-enter fixed inset-0 z-40 bg-slate-950/25"
          onClick={() => setExpanded(false)}
        />
      ) : null}

      <div
        className="fixed inset-x-0 bottom-0 z-50"
        style={{ transform: keyboardHeight > 0 ? `translateY(-${keyboardHeight}px)` : undefined }}
      >
        {expanded ? (
          <div className="motion-sheet mx-auto mb-2 w-[min(30rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{exerciseName}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  第 {setIndex + 1} 组 · {currentSetStatus} · {workoutSummary.filledSets}/{workoutSummary.totalSets} 组
                </p>
              </div>
              <Button variant="ghost" className="min-h-9 px-3 text-xs" onClick={() => setExpanded(false)}>
                收起
              </Button>
            </div>

            <div className="grid gap-3 p-3">
              <div
                className={`rounded-lg border p-3 transition-colors ${restDone ? 'motion-rest-ready' : ''} ${
                  restDone
                    ? 'border-amber-300 bg-amber-50 dark:border-amber-600/50 dark:bg-amber-900/30'
                    : restActive
                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-700/50 dark:bg-emerald-900/20'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">组间休息</p>
                    <p className={`mt-0.5 text-2xl font-bold tabular-nums ${restDone ? 'text-amber-700 dark:text-amber-300' : restActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-slate-100'}`}>
                      {restActive ? formatTime(restSeconds) : `${restDefaultDuration}s`}
                    </p>
                  </div>
                  {restActive ? (
                    <div className="flex items-center gap-1.5">
                      <Button variant="secondary" className="min-h-9 px-2 py-1 text-xs" onClick={() => onAdjustRestDuration(-15)}>
                        -15s
                      </Button>
                      <Button variant="secondary" className="min-h-9 px-2 py-1 text-xs" onClick={() => onAdjustRestDuration(15)}>
                        +15s
                      </Button>
                      <Button className="min-h-9 px-3 py-1 text-xs" onClick={onSkipRest}>
                        结束休息
                      </Button>
                    </div>
                  ) : (
                    <Button variant="secondary" className="px-3" onClick={onStartRest}>
                      开始休息
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Button variant="secondary" className="px-3" onClick={onFinish} title={bottomFinishTitle}>
                  {bottomFinishLabel}
                </Button>
              </div>

              <Button variant="secondary" className="w-full px-3" onClick={onQuickFill} disabled={quickFillDisabled}>
                {quickFillLabel ?? '快速套用'}
              </Button>

              {bottomCompletionHint ? (
                <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">{bottomCompletionHint}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="border-t border-slate-200 bg-white/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div className="mx-auto grid max-w-md gap-2">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{exerciseName}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  第 {setIndex + 1} 组 · {currentSetStatus} · {workoutSummary.completionPercent}%
                </p>
              </div>
              <button
                type="button"
                onClick={restActive ? () => setExpanded(true) : onStartRest}
                className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${restDone ? 'motion-rest-ready' : ''} ${
                  restDone
                    ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-600/50 dark:bg-amber-900/30 dark:text-amber-200'
                    : restActive
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {restText}
              </button>
              <Button variant="ghost" className="min-h-9 px-2.5 text-xs" onClick={() => setExpanded((value) => !value)}>
                展开
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" className="min-h-12 whitespace-nowrap px-2 text-sm" onClick={onPreviousExercise} disabled={!canGoPrevious}>
                上一动作
              </Button>
              <Button variant="secondary" className="min-h-12 whitespace-nowrap px-2 text-sm" onClick={onNext} disabled={bottomNextDisabled}>
                {bottomNextLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
