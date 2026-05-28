import { useEffect, useRef, useState } from 'react'
import type { ExerciseLog, ExerciseSetLog } from '../../types'
import type { PreviousExerciseRecord } from '../../lib/metrics'
import { formatTargetRepRange, isSetComplete, isSetEmpty, parseTargetRepRange, targetRepQuickOptions } from '../../lib/workout'
import { Badge, Button, Field, TextInput } from '../ui'
import { NumberField } from '../NumberField'

const RIR_OPTIONS = [0, 1, 2, 3] as const

function formatPreviousSummary(previousRecord: PreviousExerciseRecord): string {
  const parts = [`上次 ${previousRecord.date.slice(5)}`, `${previousRecord.bestWeight} kg`]
  if (previousRecord.reps !== undefined) parts.push(`${previousRecord.reps} 次`)
  if (previousRecord.rir !== undefined) parts.push(`RIR ${previousRecord.rir}`)
  return parts.join(' · ')
}

function formatSetSummary(set: Partial<ExerciseSetLog>): string | null {
  const parts: string[] = []
  if (set.weight !== undefined) parts.push(`${set.weight}kg`)
  if (set.reps !== undefined) parts.push(`${set.reps}次`)
  if (set.rir !== undefined) parts.push(`RIR ${set.rir}`)
  return parts.length ? parts.join(' × ') : null
}

function previousRecordPatch(previousRecord: PreviousExerciseRecord, setIndex: number): Partial<ExerciseSetLog> {
  const previousSet = previousRecord.allSets?.[setIndex]
  if (previousSet && isSetComplete(previousSet)) {
    return {
      weight: previousSet.weight,
      reps: previousSet.reps,
      rir: previousSet.rir,
    }
  }
  return {
    weight: previousRecord.bestWeight,
    reps: previousRecord.reps,
    rir: previousRecord.rir,
  }
}

export function ExerciseRecordCard({
  exercise,
  exerciseIndex,
  previousRecord,
  onUpdateExercise,
  onUpdateSet,
  onAddSet,
  onDeleteLastSet,
  onRebuildSets,
  onDeleteExercise,
  onMoveExerciseUp,
  onMoveExerciseDown,
  onFillEmptySets,
  forceCollapsed,
  compact = false,
}: {
  exercise: ExerciseLog
  exerciseIndex: number
  previousRecord?: PreviousExerciseRecord
  onUpdateExercise: (index: number, patch: Partial<ExerciseLog>) => void
  onUpdateSet: (exerciseIndex: number, setIndex: number, patch: Partial<ExerciseSetLog>) => void
  onAddSet: (exerciseIndex: number) => void
  onDeleteLastSet: (exerciseIndex: number) => void
  onRebuildSets: (exerciseIndex: number) => void
  onDeleteExercise: (exerciseIndex: number) => void
  onMoveExerciseUp: (exerciseIndex: number) => void
  onMoveExerciseDown: (exerciseIndex: number) => void
  onFillEmptySets: (exerciseIndex: number) => void
  forceCollapsed?: boolean
  compact?: boolean
}) {
  const filledSets = exercise.sets.filter(isSetComplete).length
  const totalSets = exercise.sets.length
  const isFullyFilled = totalSets > 0 && filledSets === totalSets
  const previousSetCountRef = useRef(totalSets)
  const lastAddedSetRef = useRef<HTMLInputElement | null>(null)
  const [initiallyCollapsed] = useState(isFullyFilled)
  const [userPreference, setUserPreference] = useState<'collapsed' | 'expanded' | null>(null)

  // 衍生折叠状态
  const collapsed =
    forceCollapsed !== undefined ? forceCollapsed
    : userPreference === 'collapsed' ? true
    : userPreference === 'expanded' ? false
    : initiallyCollapsed

  useEffect(() => {
    if (totalSets > previousSetCountRef.current) {
      setUserPreference('expanded')
      window.requestAnimationFrame(() => {
        lastAddedSetRef.current?.focus()
        lastAddedSetRef.current?.select()
      })
    }
    previousSetCountRef.current = totalSets
  }, [totalSets])

  const handleToggleCollapsed = () => {
    setUserPreference(collapsed ? 'expanded' : 'collapsed')
  }

  const handleCopyPrevious = (setIndex: number) => {
    if (setIndex <= 0) return
    const previous = exercise.sets[setIndex - 1]
    if (!previous || !isSetComplete(previous)) return
    onUpdateSet(exerciseIndex, setIndex, {
      weight: previous.weight,
      reps: previous.reps,
      rir: previous.rir,
    })
  }

  const handleApplyPreviousToEmpty = () => {
    if (!previousRecord) return
    exercise.sets.forEach((set, setIndex) => {
      if (isSetEmpty(set)) {
        onUpdateSet(exerciseIndex, setIndex, previousRecordPatch(previousRecord, setIndex))
      }
    })
  }

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

  const emptySetCount = exercise.sets.filter(isSetEmpty).length
  const hasEmptySet = emptySetCount > 0
  const hasFilledSet = exercise.sets.some(isSetComplete)
  const previousSummary =
    previousRecord
      ? formatPreviousSummary(previousRecord)
      : null

  return (
    <div
      id={`exercise-${exerciseIndex}`}
      className="min-w-0 scroll-mt-20 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-3"
    >
      <button
        type="button"
        onClick={handleToggleCollapsed}
        className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-start sm:justify-between"
        aria-expanded={!collapsed}
      >
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-950 dark:text-slate-50">
            <span>{exerciseIndex + 1}. {exercise.name}</span>
            {isPersonalRecord ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/30 dark:text-amber-200">
                PR
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{exercise.target}</p>
          {previousSummary ? <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">{previousSummary}</p> : null}
          {totalVolume > 0 ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              本次训练量 {Math.round(totalVolume)} kg
              {currentBestWeight > 0 ? ` · 最重 ${currentBestWeight} kg` : ''}
            </p>
          ) : null}
          {exercise.notes?.trim() ? (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {exercise.notes.trim()}
            </p>
          ) : null}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge tone={filledSets > 0 ? 'positive' : 'neutral'}>{filledSets}/{totalSets} 组</Badge>
          <span className="text-slate-400" aria-hidden="true">{collapsed ? '▾' : '▴'}</span>
        </div>
      </button>

      {collapsed ? null : (
        <>
          <div className="mt-3 grid gap-2">
            {exercise.sets.map((set, setIndex) => {
              const isLast = setIndex === exercise.sets.length - 1
              const previous = setIndex > 0 ? exercise.sets[setIndex - 1] : undefined
              const canCopy =
                previous !== undefined &&
                isSetComplete(previous)
              const targetRange = parseTargetRepRange(exercise.target)
              const targetRepOptions = targetRepQuickOptions(targetRange)
              const previousPatch = previousRecord ? previousRecordPatch(previousRecord, setIndex) : null
              const previousSameSet = previousRecord?.allSets?.[setIndex]
              const previousSetSummary = previousSameSet ? formatSetSummary(previousSameSet) : null
              const fallbackPreviousSummary = previousPatch && !previousSetSummary
                ? formatSetSummary(previousPatch)
                : null
              const previousHintSummary = previousSetSummary ?? fallbackPreviousSummary
              return (
                <div key={setIndex} className="grid min-w-0 gap-2 rounded-md bg-slate-50 p-2 dark:bg-slate-800">
                  {previousHintSummary ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-100 bg-white px-2.5 py-1.5 text-xs text-emerald-800 dark:border-emerald-700/40 dark:bg-slate-900 dark:text-emerald-200">
                      <span>
                        {previousSetSummary ? '上次同组' : '上次最佳'}：<span className="font-semibold">{previousHintSummary}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => previousPatch && onUpdateSet(exerciseIndex, setIndex, previousPatch)}
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-100"
                      >
                        {isSetEmpty(set) ? '套用' : '覆盖'}
                      </button>
                    </div>
                  ) : null}
                  {/* 桌面端三列并排，手机端 kg + 次数一行、RIR 按钮一行 */}
                  <div className="grid min-w-0 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <div className="grid grid-cols-2 gap-2 sm:contents">
                      <div className="space-y-1">
                        <NumberField
                          label={`${setIndex + 1}组 kg`}
                          value={set.weight}
                          step="0.5"
                          kind="decimal"
                          range={{ min: 0, max: 500, allowZero: true }}
                          onChange={(value) => onUpdateSet(exerciseIndex, setIndex, { weight: value })}
                          inputRef={isLast ? (el) => { lastAddedSetRef.current = el } : undefined}
                          className={compact ? 'h-14 text-base' : undefined}
                        />
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const current = set.weight ?? 0
                              const next = Math.max(0, current - 2.5)
                              onUpdateSet(exerciseIndex, setIndex, { weight: next })
                            }}
                            className="flex-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                          >
                            -2.5
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const current = set.weight ?? 0
                              const next = current + 2.5
                              onUpdateSet(exerciseIndex, setIndex, { weight: next })
                            }}
                            className="flex-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                          >
                            +2.5
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <NumberField
                          label="次数"
                          value={set.reps}
                          range={{ min: 1, max: 100 }}
                          onChange={(value) => onUpdateSet(exerciseIndex, setIndex, { reps: value })}
                          className={compact ? 'h-14 text-base' : undefined}
                        />
                        {targetRange && set.reps !== undefined ? (
                          <div className="text-xs">
                            {set.reps >= targetRange.min && set.reps <= targetRange.max ? (
                              <span className="text-emerald-600 dark:text-emerald-400">✓ 达标</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">目标 {formatTargetRepRange(targetRange)}</span>
                            )}
                          </div>
                        ) : null}
                        {targetRepOptions.length > 0 ? (
                          <div className={`grid gap-1 sm:hidden ${targetRepOptions.length === 1 ? 'grid-cols-1' : targetRepOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                            {targetRepOptions.map((reps) => (
                              <button
                                key={reps}
                                type="button"
                                onClick={() => onUpdateSet(exerciseIndex, setIndex, { reps })}
                                className={`min-h-9 rounded-md border px-2 text-xs font-semibold transition ${
                                  set.reps === reps
                                    ? 'border-emerald-500 bg-emerald-100 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-100'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                                }`}
                              >
                                {reps}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-end gap-0.5">
                      {RIR_OPTIONS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => onUpdateSet(exerciseIndex, setIndex, { rir: set.rir === value ? undefined : value })}
                          className={`min-h-9 min-w-9 rounded-md border text-xs font-medium transition ${compact ? 'min-h-11 min-w-11' : ''} ${
                            set.rir === value
                              ? 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600/40 dark:bg-amber-900/40 dark:text-amber-100'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                  {setIndex > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleCopyPrevious(setIndex)}
                      disabled={!canCopy}
                      className="self-start rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      复制上一组
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button variant="secondary" className="px-2" onClick={() => onAddSet(exerciseIndex)}>加一组</Button>
            <Button variant="secondary" className="px-2" onClick={() => onDeleteLastSet(exerciseIndex)} disabled={exercise.sets.length <= 1}>删最后组</Button>
            {previousRecord && hasEmptySet ? (
              <Button variant="secondary" className="px-2" onClick={handleApplyPreviousToEmpty}>
                按上次补 {emptySetCount} 个空组
              </Button>
            ) : null}
            {hasFilledSet && hasEmptySet ? (
              <Button variant="secondary" className="px-2" onClick={() => onFillEmptySets(exerciseIndex)}>
                复制已填到 {emptySetCount} 个空组
              </Button>
            ) : null}
          </div>

          <details className="mt-3 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">编辑动作</summary>
            <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2">
              <Field label="动作名称">
                <TextInput value={exercise.name} onChange={(event) => onUpdateExercise(exerciseIndex, { name: event.target.value })} />
              </Field>
              <Field label="目标组次">
                <TextInput value={exercise.target} onChange={(event) => onUpdateExercise(exerciseIndex, { target: event.target.value })} />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="动作备注">
                <TextInput value={exercise.notes ?? ''} onChange={(event) => onUpdateExercise(exerciseIndex, { notes: event.target.value })} />
              </Field>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" onClick={() => onMoveExerciseUp(exerciseIndex)}>上移动作</Button>
              <Button variant="secondary" onClick={() => onMoveExerciseDown(exerciseIndex)}>下移动作</Button>
              <Button variant="secondary" onClick={() => onRebuildSets(exerciseIndex)}>按目标重建组</Button>
              <Button variant="ghost" onClick={() => onDeleteExercise(exerciseIndex)}>删除动作</Button>
            </div>
          </details>

          {previousRecord?.allSets && previousRecord.allSets.length > 0 ? (
            <details className="mt-3 rounded-md border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-700/30 dark:bg-emerald-900/20">
              <summary className="cursor-pointer text-sm font-semibold text-emerald-800 dark:text-emerald-200">上次详细组</summary>
              <p className="mt-2 text-xs leading-5 text-emerald-700 dark:text-emerald-300">
                {previousRecord.allSets.map((set, index) => {
                  const parts: string[] = []
                  if (set.weight !== undefined) parts.push(`${set.weight}kg`)
                  if (set.reps !== undefined) parts.push(`${set.reps}次`)
                  if (set.rir !== undefined) parts.push(`RIR${set.rir}`)
                  return parts.length > 0 ? `${index + 1}. ${parts.join(' × ')}` : null
                }).filter(Boolean).join('  ')}
              </p>
            </details>
          ) : null}
        </>
      )}
    </div>
  )
}
