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
  onPreviousExercise: () => void
  onNext: () => void
  onFinish: () => void
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
  onPreviousExercise,
  onNext,
  onFinish,
  onStartRest,
  onAdjustRestDuration,
  onSkipRest,
}: MobileWorkoutBottomBarProps) {
  const [panel, setPanel] = useState<'rest' | 'finish' | null>(null)
  const restDone = restActive && restSeconds === 0
  const restText = restLabel(restActive, restSeconds, restDefaultDuration)

  useEffect(() => {
    if (keyboardHeight <= 0) return
    const frame = window.requestAnimationFrame(() => setPanel(null))
    return () => window.cancelAnimationFrame(frame)
  }, [keyboardHeight])

  return (
    <>
      {panel ? (
        <button
          type="button"
          aria-label="收起训练控制面板"
          className="motion-enter fixed inset-0 z-40 bg-slate-950/25"
          onClick={() => setPanel(null)}
        />
      ) : null}

      <div
        className="fixed inset-x-0 bottom-0 z-50"
        style={{ transform: keyboardHeight > 0 ? `translateY(-${keyboardHeight}px)` : undefined }}
      >
        {panel ? (
          <div className="motion-sheet mx-auto mb-2 w-[min(30rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                  {panel === 'rest' ? '组间休息' : '结束训练'}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {exerciseName} · 第 {setIndex + 1} 组 · {workoutSummary.filledSets}/{workoutSummary.totalSets} 组
                </p>
              </div>
              <Button variant="ghost" className="min-h-8 px-3 text-xs" onClick={() => setPanel(null)}>
                收起
              </Button>
            </div>

            {panel === 'rest' ? (
              <div className="grid gap-2.5 p-3">
                <div
                  className={`rounded-lg border p-3 transition-colors ${restDone ? 'motion-rest-ready' : ''} ${
                    restDone
                      ? 'border-amber-300 bg-amber-50 dark:border-amber-600/50 dark:bg-amber-900/30'
                      : restActive
                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-700/50 dark:bg-emerald-900/20'
                        : 'border-[var(--surface-border)] bg-[var(--surface-muted)] dark:border-slate-700 dark:bg-slate-800'
                  }`}
                >
                  <p className={`text-center text-3xl font-bold tabular-nums ${restDone ? 'text-amber-700 dark:text-amber-300' : restActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-slate-100'}`}>
                    {restActive ? formatTime(restSeconds) : `${restDefaultDuration}s`}
                  </p>
                  {restActive ? (
                    <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                      <Button variant="secondary" className="min-h-9 px-2 text-xs" onClick={() => onAdjustRestDuration(-15)}>
                        -15s
                      </Button>
                      <Button variant="secondary" className="min-h-9 px-2 text-xs" onClick={() => onAdjustRestDuration(15)}>
                        +15s
                      </Button>
                      <Button variant="secondary" className="min-h-9 px-2 text-xs" onClick={() => onAdjustRestDuration(30)}>
                        +30s
                      </Button>
                      <Button className="min-h-9 px-2 text-xs" onClick={onSkipRest}>
                        结束
                      </Button>
                    </div>
                  ) : (
                    <Button className="mt-2.5 min-h-9 w-full px-4 text-sm" onClick={onStartRest}>
                      开始休息
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-2.5 p-3">
                <Button variant="secondary" className="min-h-10 w-full px-3 text-sm" onClick={onFinish} title={bottomFinishTitle}>
                  {bottomFinishLabel}
                </Button>

                {bottomCompletionHint ? (
                  <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">{bottomCompletionHint}</p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        <div className="border-t border-white/20 bg-white/75 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-lg backdrop-blur-lg dark:border-slate-700/50 dark:bg-slate-900/75">
          <div className="mx-auto grid max-w-md gap-2">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{exerciseName}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  第 {setIndex + 1} 组 · {currentSetStatus} · {workoutSummary.completionPercent}%
                </p>
              </div>
              <Button variant="ghost" className="min-h-9 px-2.5 text-xs" onClick={() => setPanel('finish')}>
                结束训练
              </Button>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-2">
              <Button
                variant="secondary"
                className="min-h-9 whitespace-nowrap px-2 text-xs"
                onClick={onPreviousExercise}
                disabled={!canGoPrevious}
                title={canGoPrevious ? "快捷键: ←" : undefined}
              >
                上一个
              </Button>
              <Button
                variant="secondary"
                className="min-h-9 whitespace-nowrap px-2 text-xs"
                onClick={restActive ? () => setPanel('rest') : onStartRest}
                title="快捷键: Space"
              >
                {restText}
              </Button>
              <Button
                variant="secondary"
                className="min-h-9 whitespace-nowrap px-2 text-xs"
                onClick={onNext}
                disabled={bottomNextDisabled}
                title={!bottomNextDisabled ? "快捷键: →" : undefined}
              >
                {bottomNextLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
