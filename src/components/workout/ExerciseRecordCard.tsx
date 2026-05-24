import { useEffect, useRef, useState } from 'react'
import type { ExerciseLog, ExerciseSetLog } from '../../types'
import type { PreviousExerciseRecord } from '../../lib/metrics'
import { Badge, Button, Field, TextInput } from '../ui'
import { NumberField } from '../NumberField'

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
  onFillEmptySets,
  forceCollapsed,
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
  onFillEmptySets: (exerciseIndex: number) => void
  forceCollapsed?: boolean
}) {
  const filledSets = exercise.sets.filter((set) => set.weight !== undefined || set.reps !== undefined || set.rir !== undefined).length
  const totalSets = exercise.sets.length
  const isFullyFilled = totalSets > 0 && filledSets === totalSets
  const previousSetCountRef = useRef(totalSets)
  const lastAddedSetRef = useRef<HTMLInputElement | null>(null)
  const [userPreference, setUserPreference] = useState<'collapsed' | 'expanded' | null>(null)

  // 衍生折叠状态：forceCollapsed 明确设置时用它；否则尊重用户手动选择；兜底自动折叠
  const collapsed =
    forceCollapsed !== undefined ? forceCollapsed
    : userPreference === 'collapsed' ? true
    : userPreference === 'expanded' ? false
    : isFullyFilled

  // 新加了一组：重置偏好并聚焦（聚焦是外部 DOM 操作，适合 effect）
  useEffect(() => {
    if (totalSets > previousSetCountRef.current) {
      setUserPreference(null)
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
    if (!previous) return
    onUpdateSet(exerciseIndex, setIndex, {
      weight: previous.weight,
      reps: previous.reps,
      rir: previous.rir,
    })
  }

  // 一键套用上次成绩到所有空组
  const handleApplyPreviousToEmpty = () => {
    if (!previousRecord) return
    exercise.sets.forEach((set, setIndex) => {
      const isEmpty = set.weight === undefined && set.reps === undefined && set.rir === undefined
      if (isEmpty) {
        onUpdateSet(exerciseIndex, setIndex, {
          weight: previousRecord.bestWeight,
          reps: previousRecord.reps,
          rir: previousRecord.rir,
        })
      }
    })
  }

  // 当前已记录的最重组
  const currentBestWeight = exercise.sets.reduce<number>((best, set) => {
    if (set.weight !== undefined && set.weight > best) return set.weight
    return best
  }, 0)
  const isPersonalRecord =
    previousRecord !== undefined &&
    currentBestWeight > 0 &&
    currentBestWeight > previousRecord.bestWeight

  // 已记录组的训练量（kg × 次）
  const totalVolume = exercise.sets.reduce<number>((sum, set) => {
    if (set.weight !== undefined && set.reps !== undefined) {
      return sum + set.weight * set.reps
    }
    return sum
  }, 0)

  const hasEmptySet = exercise.sets.some(
    (set) => set.weight === undefined && set.reps === undefined && set.rir === undefined,
  )
  const hasFilledSet = exercise.sets.some(
    (set) => set.weight !== undefined || set.reps !== undefined || set.rir !== undefined,
  )

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
                🎉 PR
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{exercise.target}</p>
          {previousRecord ? (
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
              上次（{previousRecord.date.slice(5)}）：{previousRecord.bestWeight} kg
              {previousRecord.reps !== undefined ? ` × ${previousRecord.reps} 次` : ''}
              {previousRecord.rir !== undefined ? ` · RIR ${previousRecord.rir}` : ''}
            </p>
          ) : null}
          {totalVolume > 0 ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              本次训练量 {Math.round(totalVolume)} kg
              {currentBestWeight > 0 ? ` · 最重 ${currentBestWeight} kg` : ''}
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
          {(previousRecord && hasEmptySet) || (hasFilledSet && hasEmptySet) ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">⚡ 快速填充空组</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {previousRecord && hasEmptySet ? (
                  <button
                    type="button"
                    onClick={handleApplyPreviousToEmpty}
                    className="rounded-md border border-emerald-300 bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200 dark:border-emerald-700/40 dark:bg-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
                  >
                    套用上次（{previousRecord.bestWeight} kg{previousRecord.reps !== undefined ? ` × ${previousRecord.reps}` : ''}）
                  </button>
                ) : null}
                {hasFilledSet && hasEmptySet ? (
                  <button
                    type="button"
                    onClick={() => onFillEmptySets(exerciseIndex)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    复制已填到空组
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-3 grid gap-2">
            {exercise.sets.map((set, setIndex) => {
              const isLast = setIndex === exercise.sets.length - 1
              const previous = setIndex > 0 ? exercise.sets[setIndex - 1] : undefined
              const canCopy =
                previous !== undefined &&
                (previous.weight !== undefined || previous.reps !== undefined || previous.rir !== undefined)
              return (
                <div key={setIndex} className="grid min-w-0 gap-2 rounded-md bg-slate-50 p-2 dark:bg-slate-800">
                  <div className="grid min-w-0 grid-cols-3 gap-2">
                    <NumberField
                      label={`${setIndex + 1}组 kg`}
                      value={set.weight}
                      step="0.5"
                      kind="decimal"
                      range={{ min: 0, max: 500, allowZero: true }}
                      onChange={(value) => onUpdateSet(exerciseIndex, setIndex, { weight: value })}
                      inputRef={isLast ? (el) => { lastAddedSetRef.current = el } : undefined}
                    />
                    <NumberField
                      label="次数"
                      value={set.reps}
                      range={{ min: 1, max: 100 }}
                      onChange={(value) => onUpdateSet(exerciseIndex, setIndex, { reps: value })}
                    />
                    <NumberField
                      label="RIR"
                      value={set.rir}
                      range={{ min: 0, max: 10, allowZero: true }}
                      onChange={(value) => onUpdateSet(exerciseIndex, setIndex, { rir: value })}
                    />
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
              <Button variant="secondary" onClick={() => onRebuildSets(exerciseIndex)}>按目标重建组</Button>
              <Button variant="ghost" onClick={() => onDeleteExercise(exerciseIndex)}>删除动作</Button>
            </div>
          </details>
        </>
      )}
    </div>
  )
}
