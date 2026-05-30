import type { PreviousExerciseRecord } from '../../lib/metrics'
import { isSetComplete } from '../../lib/workout'
import type { ExerciseLog } from '../../types'
import { Badge, DisclosurePanel } from '../ui'
import { formatPreviousSummary, formatSetSummary } from './workoutRecordFormat'

export function ExerciseRecordHeader({
  exercise,
  exerciseIndex,
  previousRecord,
  filledSets,
  totalSets,
  collapsed,
  onToggle,
}: {
  exercise: ExerciseLog
  exerciseIndex: number
  previousRecord?: PreviousExerciseRecord
  filledSets: number
  totalSets: number
  collapsed: boolean
  onToggle: () => void
}) {
  const currentBestWeight = exercise.sets.reduce<number>((best, set) => {
    if (set.weight !== undefined && set.weight > best) return set.weight
    return best
  }, 0)
  const isPersonalRecord =
    previousRecord !== undefined && currentBestWeight > 0 && currentBestWeight > previousRecord.bestWeight

  const totalVolume = exercise.sets.reduce<number>((sum, set) => {
    if (set.weight !== undefined && set.reps !== undefined) return sum + set.weight * set.reps
    return sum
  }, 0)

  const previousSummary = previousRecord ? formatPreviousSummary(previousRecord) : null

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex min-h-11 w-full flex-col gap-2 rounded-md text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 dark:hover:bg-slate-800/70 dark:focus-visible:ring-emerald-600 sm:flex-row sm:items-start sm:justify-between"
      aria-expanded={!collapsed}
      aria-label={`${collapsed ? '展开' : '收起'}动作 ${exercise.name}`}
    >
      <div className="min-w-0 px-1 py-1">
        <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-950 dark:text-slate-50">
          <span>{exerciseIndex + 1}. {exercise.name}</span>
          {isPersonalRecord ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/30 dark:text-amber-200">
              PR
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{exercise.target}</p>
        {previousSummary ? <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-300">{previousSummary}</p> : null}
        {totalVolume > 0 ? (
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            本次训练量 {Math.round(totalVolume)} kg
            {currentBestWeight > 0 ? ` · 最重 ${currentBestWeight} kg` : ''}
          </p>
        ) : null}
        {exercise.notes?.trim() ? (
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
            {exercise.notes.trim()}
          </p>
        ) : null}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2 px-1 pb-1 sm:py-1">
        {filledSets > 0 ? <Badge tone="positive">{filledSets}/{totalSets} 组</Badge> : <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{filledSets}/{totalSets} 组</span>}
        <span className="text-slate-400" aria-hidden="true">{collapsed ? '▾' : '▴'}</span>
      </div>
    </button>
  )
}

export function ExercisePreviousDetails({ previousRecord }: { previousRecord?: PreviousExerciseRecord }) {
  if (!previousRecord?.allSets || previousRecord.allSets.length === 0) return null

  return (
    <DisclosurePanel
      className="mt-3 rounded-md border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
      title="上次详细组"
      summaryClassName="text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-900"
      contentClassName="border-slate-200 dark:border-slate-700"
    >
      <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
        {previousRecord.allSets.map((set, index) => {
          const summary = isSetComplete(set) ? formatSetSummary(set) : null
          return summary ? `${index + 1}. ${summary}` : null
        }).filter(Boolean).join('  ')}
      </p>
    </DisclosurePanel>
  )
}
