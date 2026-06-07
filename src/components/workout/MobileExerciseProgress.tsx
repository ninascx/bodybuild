import type { ReactNode } from 'react'
import type { PreviousExerciseRecord } from '../../lib/metrics'
import type { WorkoutSummary } from '../../lib/workout'
import { formatTime, isSetComplete } from '../../lib/workout'
import type { ExerciseLog } from '../../types'
import { cn } from '../../lib/cn'
import { Badge, Button, Card, DisclosurePanel } from '../ui'
import { formatPreviousSummary, formatSetSummary } from './workoutRecordFormat'

export function MobileTrainingModeHeader({
  workoutName,
  elapsedSeconds,
  workoutSummary,
  onExitTrainingMode,
}: {
  workoutName: string
  elapsedSeconds: number
  workoutSummary: WorkoutSummary
  onExitTrainingMode: () => void
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-[var(--surface-border)] bg-[color-mix(in_srgb,var(--surface-page)_92%,white)] px-4 py-2 backdrop-blur-lg dark:border-slate-700 dark:bg-slate-950/75 sm:-mx-6 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            训练模式 · {formatTime(elapsedSeconds)} · {workoutSummary.filledSets}/{workoutSummary.totalSets} 组 · {workoutSummary.completionPercent}%
          </p>
          <h2 className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{workoutName}</h2>
        </div>
        <Button variant="secondary" className="min-h-11 shrink-0 px-3 text-xs" onClick={onExitTrainingMode}>
          退出
        </Button>
      </div>
    </div>
  )
}

export function MobileExerciseProgressCard({
  exercise,
  exerciseIndex,
  exerciseCount,
  previousRecord,
  completed,
  completedSetCount,
  remainingSetCount,
  currentSetIndex,
  onSelectSet,
  children,
}: {
  exercise: ExerciseLog
  exerciseIndex: number
  exerciseCount: number
  previousRecord?: PreviousExerciseRecord
  completed: boolean
  completedSetCount: number
  remainingSetCount: number
  currentSetIndex: number
  onSelectSet: (index: number) => void
  children: ReactNode
}) {
  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            动作 {exerciseIndex + 1}/{exerciseCount}
          </p>
          <h3 className="mt-0.5 text-lg font-semibold leading-tight text-slate-950 dark:text-slate-50">{exercise.name}</h3>
          <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">{exercise.target}</p>
        </div>
        {completed ? <Badge tone="positive">已完成</Badge> : <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{completedSetCount}/{exercise.sets.length}</span>}
      </div>

      <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="shrink-0 rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          本动作 {completedSetCount}/{exercise.sets.length}
        </span>
        <span className="shrink-0 rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          当前第 {currentSetIndex + 1} 组
        </span>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
          remainingSetCount === 0
            ? 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-700/40 dark:bg-slate-900 dark:text-emerald-300'
            : 'border-[var(--surface-border)] bg-[var(--surface-muted)] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
        }`}>
          还剩 {remainingSetCount} 组
        </span>
      </div>

      {previousRecord ? (
        <DisclosurePanel
          className="mt-2 border-[var(--surface-border)] bg-[var(--surface-muted)] text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          title={formatPreviousSummary(previousRecord)}
          summaryClassName="text-xs font-medium text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-900"
          contentClassName="border-slate-200 py-2 dark:border-slate-700"
        >
          {previousRecord.allSets?.length ? (
            <p className="text-xs leading-5">
              {previousRecord.allSets.map((set, index) => {
                const summary = formatSetSummary(set)
                return summary ? `${index + 1}. ${summary}` : null
              }).filter(Boolean).join('  ')}
            </p>
          ) : null}
        </DisclosurePanel>
      ) : null}

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {exercise.sets.map((set, index) => {
          const setDone = isSetComplete(set)
          const isCurrent = index === currentSetIndex
          return (
            <Button
              key={index}
              variant="ghost"
              onClick={() => onSelectSet(index)}
              aria-pressed={isCurrent}
              className={cn(
                'min-h-9 min-w-[3.5rem] shrink-0 flex-col gap-0 rounded-full border px-1.5 text-center text-xs font-medium',
                isCurrent
                  ? 'border-[var(--color-primary-700)] bg-[var(--color-primary-700)] text-white dark:border-cyan-500 dark:bg-cyan-600 dark:text-white'
                  : setDone
                    ? 'border-emerald-200 bg-white text-slate-700 hover:border-emerald-300 dark:border-emerald-700/40 dark:bg-slate-900 dark:text-slate-200'
                    : 'border-[var(--surface-border)] bg-[var(--surface-muted)] text-slate-500 hover:border-[var(--surface-border-strong)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
              )}
            >
              <span className="block">#{index + 1}</span>
              <span className="mt-0.5 block truncate text-xs font-semibold">
                {formatSetSummary(set) ?? '待填'}
              </span>
            </Button>
          )
        })}
      </div>

      {children}
    </Card>
  )
}
