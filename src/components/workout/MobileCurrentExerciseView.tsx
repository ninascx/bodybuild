import { useState } from 'react'
import type { PreviousExerciseRecord } from '../../lib/metrics'
import type { WorkoutSummary } from '../../lib/workout'
import { formatTargetRepRange, formatTime, isSetComplete, isSetEmpty, parseTargetRepRange, targetRepQuickOptions } from '../../lib/workout'
import type { ExerciseLog, ExerciseSetLog, WorkoutLog } from '../../types'
import { NumberField } from '../NumberField'
import { Badge, Button, Card } from '../ui'

const RIR_OPTIONS = [0, 1, 2, 3] as const

function isExerciseComplete(exercise: ExerciseLog): boolean {
  return exercise.sets.length > 0 && exercise.sets.every(isSetComplete)
}

function firstIncompleteSetIndex(exercise: ExerciseLog): number {
  const index = exercise.sets.findIndex((set) => !isSetComplete(set))
  return index >= 0 ? index : Math.max(0, exercise.sets.length - 1)
}

function nextIncompleteSetIndex(exercise: ExerciseLog, currentIndex: number, patch?: Partial<ExerciseSetLog>): number {
  const nextSets = exercise.sets.map((set, index) => (index === currentIndex && patch ? { ...set, ...patch } : set))
  for (let offset = 1; offset <= nextSets.length; offset += 1) {
    const index = (currentIndex + offset) % nextSets.length
    if (!isSetComplete(nextSets[index])) return index
  }
  return currentIndex
}

function previousSetPatch(exercise: ExerciseLog, setIndex: number): Partial<ExerciseSetLog> | null {
  if (setIndex <= 0) return null
  const previous = exercise.sets[setIndex - 1]
  if (!previous) return null
  if (!isSetComplete(previous)) return null
  return {
    weight: previous.weight,
    reps: previous.reps,
    rir: previous.rir,
  }
}

function previousRecordSetPatch(
  previousRecord: PreviousExerciseRecord | undefined,
  setIndex: number,
): Partial<ExerciseSetLog> | null {
  if (!previousRecord) return null
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

function formatPreviousSummary(previousRecord: PreviousExerciseRecord): string {
  const parts = [`上次 ${previousRecord.date.slice(5)}`, `${previousRecord.bestWeight}kg`]
  if (previousRecord.reps !== undefined) parts.push(`${previousRecord.reps}次`)
  if (previousRecord.rir !== undefined) parts.push(`RIR ${previousRecord.rir}`)
  return parts.join(' · ')
}

function formatSetSummary(set: Partial<ExerciseSetLog>): string | null {
  const parts: string[] = []
  if (set.weight !== undefined) parts.push(`${set.weight}kg`)
  if (set.reps !== undefined) parts.push(`${set.reps}次`)
  if (set.rir !== undefined) parts.push(`RIR ${set.rir}`)
  return parts.length > 0 ? parts.join(' × ') : null
}

type MobileCurrentExerciseViewProps = {
  workout: WorkoutLog
  workoutSummary: WorkoutSummary
  currentExerciseIndex: number
  suggestedExerciseIndex: number | null
  elapsedSeconds: number
  restSeconds: number
  restActive: boolean
  restDefaultDuration: number
  autoStartRest: boolean
  workoutMarkedComplete: boolean
  canFinishWorkout: boolean
  hasNextIncompleteExercise: boolean
  completionHint: string
  previousRecordsByExerciseKey: Map<string, PreviousExerciseRecord | undefined>
  onJumpToExercise: (index: number) => void
  onJumpToNextIncomplete: () => void
  onUpdateSet: (exerciseIndex: number, setIndex: number, patch: Partial<ExerciseSetLog>) => void
  onAddSet: (exerciseIndex: number) => void
  onStartRest: () => void
  onSkipRest: () => void
  onAdjustRestDuration: (delta: number) => void
  onToggleAutoStart: () => void
  onExitTrainingMode: () => void
  onFinishWorkout: () => void
}

export function MobileCurrentExerciseView({
  workout,
  workoutSummary,
  currentExerciseIndex,
  suggestedExerciseIndex,
  elapsedSeconds,
  restSeconds,
  restActive,
  restDefaultDuration,
  autoStartRest,
  workoutMarkedComplete,
  canFinishWorkout,
  hasNextIncompleteExercise,
  completionHint,
  previousRecordsByExerciseKey,
  onJumpToExercise,
  onJumpToNextIncomplete,
  onUpdateSet,
  onAddSet,
  onStartRest,
  onSkipRest,
  onAdjustRestDuration,
  onToggleAutoStart,
  onExitTrainingMode,
  onFinishWorkout,
}: MobileCurrentExerciseViewProps) {
  const exercise = workout.exercises[currentExerciseIndex]
  const [currentSetIndex, setCurrentSetIndex] = useState(() => (exercise ? firstIncompleteSetIndex(exercise) : 0))
  const [bulkFillCompleted, setBulkFillCompleted] = useState(false)

  if (!exercise) return null

  const previousRecord = previousRecordsByExerciseKey.get(`${exercise.exerciseId}::${exercise.name.trim()}`)
  const safeCurrentSetIndex = Math.min(currentSetIndex, Math.max(0, exercise.sets.length - 1))
  const currentSet = exercise.sets[safeCurrentSetIndex]
  const completed = isExerciseComplete(exercise)
  const completedExerciseSetCount = exercise.sets.filter(isSetComplete).length
  const remainingExerciseSetCount = Math.max(exercise.sets.length - completedExerciseSetCount, 0)
  const currentSetComplete = currentSet ? isSetComplete(currentSet) : false
  const nextSetIndex = currentSet ? nextIncompleteSetIndex(exercise, safeCurrentSetIndex) : safeCurrentSetIndex
  const hasAnotherIncompleteSet = currentSetComplete && nextSetIndex !== safeCurrentSetIndex
  const previousExerciseIndex = Math.max(0, currentExerciseIndex - 1)
  const nextExerciseIndex = Math.min(workout.exercises.length - 1, currentExerciseIndex + 1)
  const copyPreviousPatch = previousSetPatch(exercise, safeCurrentSetIndex)
  const copyRecordPatch = previousRecordSetPatch(previousRecord, safeCurrentSetIndex)
  const previousSameSetSummary = previousRecord?.allSets?.[safeCurrentSetIndex]
    ? formatSetSummary(previousRecord.allSets[safeCurrentSetIndex])
    : null
  const quickFillPatch = currentSet && isSetEmpty(currentSet)
    ? copyPreviousPatch ?? copyRecordPatch
    : null
  const quickFillSummary = quickFillPatch ? formatSetSummary(quickFillPatch) : null
  const quickFillLabel = currentSet && isSetEmpty(currentSet) && copyPreviousPatch
    ? '沿用上一组填本组'
    : currentSet && isSetEmpty(currentSet) && copyRecordPatch
      ? previousSameSetSummary
        ? '套用上次同组'
        : '套用上次最佳'
      : null
  const emptySetCount = exercise.sets.filter(isSetEmpty).length
  const hasEmptySet = emptySetCount > 0
  const targetRange = parseTargetRepRange(exercise.target)
  const targetRepOptions = targetRepQuickOptions(targetRange)
  const repsInTarget =
    targetRange && currentSet?.reps !== undefined
      ? currentSet.reps >= targetRange.min && currentSet.reps <= targetRange.max
      : null
  const shouldSuggestNextExercise = suggestedExerciseIndex !== null || (bulkFillCompleted && completed && hasNextIncompleteExercise)
  const canConfirmWorkout = canFinishWorkout && !workoutMarkedComplete
  const currentSetActionDisabled = !currentSetComplete || (!hasAnotherIncompleteSet && !shouldSuggestNextExercise && !canConfirmWorkout)
  const currentSetActionLabel = !currentSetComplete
    ? '填重量和次数后完成本组'
    : hasAnotherIncompleteSet
      ? '完成本组，下一未填组'
      : shouldSuggestNextExercise
        ? '完成动作，去下一个'
        : canConfirmWorkout
          ? '确认完成训练'
          : '本动作已完成'
  const bottomPrimaryLabel = workoutMarkedComplete
    ? '返回记录'
    : canConfirmWorkout
      ? '确认完成'
      : shouldSuggestNextExercise
        ? '下一动作'
        : '完成训练'
  const bottomPrimaryTitle = workoutMarkedComplete
    ? '已同步到今日记录'
    : canConfirmWorkout
      ? '所有组已填完，确认后同步到今日记录'
      : shouldSuggestNextExercise
        ? '当前动作已完成，继续到下一个未完成动作'
        : '填完所有组的重量和次数后可确认完成'
  const bottomPrimaryDisabled = !workoutMarkedComplete && !canConfirmWorkout && !shouldSuggestNextExercise
  const bottomCompletionHint = workoutMarkedComplete
    ? '本次训练已同步到今日记录。'
    : canConfirmWorkout
      ? '所有组已填完，点确认完成即可同步到今日记录。'
      : shouldSuggestNextExercise
        ? '当前动作已完成，点下一动作继续。'
        : completionHint

  function updateCurrentSet(patch: Partial<ExerciseSetLog>, advanceWhenComplete = false) {
    if (!currentSet) return
    onUpdateSet(currentExerciseIndex, safeCurrentSetIndex, patch)
    if (advanceWhenComplete) {
      setCurrentSetIndex(nextIncompleteSetIndex(exercise, safeCurrentSetIndex, patch))
    }
  }

  function applyPatchToCurrentSet(patch: Partial<ExerciseSetLog> | null, advanceWhenComplete = true) {
    if (!patch || !currentSet) return
    updateCurrentSet(patch, advanceWhenComplete)
  }

  function finishCurrentSet() {
    if (!currentSetComplete) return
    if (hasAnotherIncompleteSet) {
      setCurrentSetIndex(nextSetIndex)
      return
    }
    if (suggestedExerciseIndex !== null) {
      onJumpToExercise(suggestedExerciseIndex)
      return
    }
    if (bulkFillCompleted && hasNextIncompleteExercise) {
      onJumpToNextIncomplete()
    }
  }

  function handleCurrentSetAction() {
    if (!currentSetComplete) return
    if (hasAnotherIncompleteSet || shouldSuggestNextExercise) {
      finishCurrentSet()
      return
    }
    if (canConfirmWorkout) {
      onFinishWorkout()
    }
  }

  function handleBottomPrimaryAction() {
    if (workoutMarkedComplete) {
      onExitTrainingMode()
      return
    }
    if (canConfirmWorkout) {
      onFinishWorkout()
      return
    }
    if (shouldSuggestNextExercise) {
      if (suggestedExerciseIndex !== null) {
        onJumpToExercise(suggestedExerciseIndex)
        return
      }
      onJumpToNextIncomplete()
    }
  }

  function applyPreviousRecordToEmptySets() {
    if (!previousRecord) return
    const nextSets = exercise.sets.map((set, setIndex) =>
      isSetEmpty(set)
        ? { ...set, ...(previousRecordSetPatch(previousRecord, setIndex) ?? {}) }
        : set,
    )
    exercise.sets.forEach((set, setIndex) => {
      if (!isSetEmpty(set)) return
      onUpdateSet(currentExerciseIndex, setIndex, previousRecordSetPatch(previousRecord, setIndex) ?? {})
    })
    setBulkFillCompleted(nextSets.length > 0 && nextSets.every(isSetComplete))
  }

  function applyCurrentSetToEmptySets() {
    if (!currentSetComplete || !currentSet) return
    const patch = {
      weight: currentSet.weight,
      reps: currentSet.reps,
      rir: currentSet.rir,
    }
    const nextSets = exercise.sets.map((set) => (isSetEmpty(set) ? { ...set, ...patch } : set))
    exercise.sets.forEach((set, setIndex) => {
      if (!isSetEmpty(set)) return
      onUpdateSet(currentExerciseIndex, setIndex, patch)
    })
    setBulkFillCompleted(nextSets.length > 0 && nextSets.every(isSetComplete))
  }

  return (
    <div className="md:hidden">
      <div className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">训练模式 · {formatTime(elapsedSeconds)}</p>
            <h2 className="truncate text-base font-semibold text-slate-950 dark:text-slate-50">{workout.workoutName}</h2>
          </div>
          <button
            type="button"
            onClick={onExitTrainingMode}
            className="min-h-9 shrink-0 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            退出
          </button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-white px-2 py-1.5 dark:bg-slate-900">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">组数</p>
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{workoutSummary.filledSets}/{workoutSummary.totalSets}</p>
          </div>
          <div className="rounded-md bg-white px-2 py-1.5 dark:bg-slate-900">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">进度</p>
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{workoutSummary.completionPercent}%</p>
          </div>
          <div className="rounded-md bg-white px-2 py-1.5 dark:bg-slate-900">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{restActive ? '休息' : '默认休息'}</p>
            <p className={`text-sm font-semibold tabular-nums ${restActive && restSeconds === 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
              {restActive ? formatTime(restSeconds) : `${restDefaultDuration}s`}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <Card className="border-emerald-200 dark:border-emerald-700/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                动作 {currentExerciseIndex + 1}/{workout.exercises.length}
              </p>
              <h3 className="mt-1 text-2xl font-semibold leading-tight text-slate-950 dark:text-slate-50">{exercise.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{exercise.target}</p>
            </div>
            <Badge tone={completed ? 'positive' : 'neutral'}>{completed ? '已完成' : `${completedExerciseSetCount}/${exercise.sets.length}`}</Badge>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">本动作</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-950 dark:text-slate-50">
                {completedExerciseSetCount}/{exercise.sets.length}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">还剩</p>
              <p className={`mt-0.5 text-sm font-semibold ${remainingExerciseSetCount === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-950 dark:text-slate-50'}`}>
                {remainingExerciseSetCount} 组
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">当前</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-950 dark:text-slate-50">第 {safeCurrentSetIndex + 1} 组</p>
            </div>
          </div>

          {previousRecord ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-100">
              <p className="font-medium">{formatPreviousSummary(previousRecord)}</p>
              {previousRecord.allSets?.length ? (
                <p className="mt-1 text-xs leading-5">
                  {previousRecord.allSets.map((set, index) => {
                    const parts: string[] = []
                    if (set.weight !== undefined) parts.push(`${set.weight}kg`)
                    if (set.reps !== undefined) parts.push(`${set.reps}次`)
                    if (set.rir !== undefined) parts.push(`RIR${set.rir}`)
                    return parts.length ? `${index + 1}. ${parts.join(' x ')}` : null
                  }).filter(Boolean).join('  ')}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-4 gap-2">
            {exercise.sets.map((set, index) => {
              const setDone = isSetComplete(set)
              const isCurrent = index === safeCurrentSetIndex
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentSetIndex(index)}
                  className={`min-h-14 rounded-lg border px-2 text-center text-xs font-medium ${
                    isCurrent
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-100'
                      : setDone
                        ? 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                        : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <span className="block">第 {index + 1} 组</span>
                  <span className="mt-1 block truncate font-semibold">
                    {set.weight !== undefined || set.reps !== undefined
                      ? `${set.weight ?? '-'}kg x ${set.reps ?? '-'}`
                      : '待填'}
                  </span>
                </button>
              )
            })}
          </div>

          {currentSet ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">当前第 {safeCurrentSetIndex + 1} 组</p>
                <Badge tone={currentSetComplete ? 'positive' : 'neutral'}>{currentSetComplete ? '已填' : '待填'}</Badge>
              </div>
              {previousSameSetSummary ? (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-800 dark:border-emerald-700/40 dark:bg-slate-900 dark:text-emerald-200">
                  上次同组：<span className="font-semibold">{previousSameSetSummary}</span>
                </div>
              ) : copyRecordPatch ? (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-800 dark:border-emerald-700/40 dark:bg-slate-900 dark:text-emerald-200">
                  上次最佳：<span className="font-semibold">{formatSetSummary(copyRecordPatch) ?? '可套用'}</span>
                </div>
              ) : null}
              {targetRange ? (
                <p className={`mt-1 text-xs ${repsInTarget ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
                  目标 {formatTargetRepRange(targetRange)} 次{repsInTarget ? ' · 已达标' : ''}
                </p>
              ) : null}
              {quickFillPatch && quickFillLabel ? (
                <Button className="mt-3 w-full" onClick={() => applyPatchToCurrentSet(quickFillPatch)}>
                  {quickFillLabel}
                  {quickFillSummary ? ` · ${quickFillSummary}` : ''}
                </Button>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <NumberField
                  label="重量 kg"
                  value={currentSet.weight}
                  step="0.5"
                  kind="decimal"
                  range={{ min: 0, max: 500, allowZero: true }}
                  onChange={(value) => updateCurrentSet({ weight: value })}
                  className="h-14 text-base"
                />
                <NumberField
                  label="次数"
                  value={currentSet.reps}
                  range={{ min: 1, max: 100 }}
                  onChange={(value) => updateCurrentSet({ reps: value })}
                  className="h-14 text-base"
                />
              </div>
              {targetRepOptions.length > 0 ? (
                <div className={`mt-2 grid gap-2 ${targetRepOptions.length === 1 ? 'grid-cols-1' : targetRepOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {targetRepOptions.map((reps) => (
                    <button
                      key={reps}
                      type="button"
                      onClick={() => updateCurrentSet({ reps })}
                      className={`min-h-10 rounded-md border px-2 text-sm font-semibold transition ${
                        currentSet.reps === reps
                          ? 'border-emerald-500 bg-emerald-100 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-100'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {reps}次
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    className="min-h-10 px-2 text-xs"
                    onClick={() => updateCurrentSet({ weight: Math.max(0, (currentSet.weight ?? 0) - 2.5) })}
                  >
                    -2.5kg
                  </Button>
                  <Button
                    variant="secondary"
                    className="min-h-10 px-2 text-xs"
                    onClick={() => updateCurrentSet({ weight: (currentSet.weight ?? 0) + 2.5 })}
                  >
                    +2.5kg
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    className="min-h-10 px-2 text-xs"
                    onClick={() => updateCurrentSet({ reps: Math.max(1, (currentSet.reps ?? 1) - 1) })}
                  >
                    -1次
                  </Button>
                  <Button
                    variant="secondary"
                    className="min-h-10 px-2 text-xs"
                    onClick={() => updateCurrentSet({ reps: (currentSet.reps ?? 0) + 1 })}
                  >
                    +1次
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {RIR_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateCurrentSet({ rir: currentSet.rir === value ? undefined : value }, true)}
                    className={`min-h-12 rounded-md border text-sm font-semibold transition ${
                      currentSet.rir === value
                        ? 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600/40 dark:bg-amber-900/40 dark:text-amber-100'
                        : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    RIR {value}
                  </button>
                ))}
              </div>
              <Button
                className="mt-3 w-full"
                onClick={handleCurrentSetAction}
                disabled={currentSetActionDisabled}
              >
                {currentSetActionLabel}
              </Button>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" className="px-2" onClick={() => applyPatchToCurrentSet(copyPreviousPatch)} disabled={!copyPreviousPatch}>
                  复制上一组
                </Button>
                <Button variant="secondary" className="px-2" onClick={() => applyPatchToCurrentSet(copyRecordPatch)} disabled={!copyRecordPatch}>
                  套用上次
                </Button>
              </div>
              {hasEmptySet ? (
                <div className="mt-2 grid gap-2">
                  <Button variant="secondary" className="w-full" onClick={applyCurrentSetToEmptySets} disabled={!currentSetComplete}>
                    复制本组到 {emptySetCount} 个空组
                  </Button>
                  {previousRecord ? (
                    <Button variant="secondary" className="w-full" onClick={applyPreviousRecordToEmptySets}>
                      按上次填入 {emptySetCount} 个空组
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {hasAnotherIncompleteSet ? (
                <Button className="mt-2 w-full" onClick={() => setCurrentSetIndex(nextSetIndex)}>
                  下一未填组
                </Button>
              ) : null}
            </div>
          ) : (
            <Button className="mt-4 w-full" onClick={() => onAddSet(currentExerciseIndex)}>添加一组</Button>
          )}

          {canFinishWorkout && !workoutMarkedComplete ? (
            <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-600/40 dark:bg-emerald-900/30">
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">所有组已填完</p>
              <p className="mt-1 text-xs leading-5 text-emerald-800 dark:text-emerald-200">确认后会同步到今日记录，并把训练完成度记为 100%。</p>
              <Button className="mt-2 w-full" onClick={onFinishWorkout}>
                确认完成训练
              </Button>
            </div>
          ) : shouldSuggestNextExercise ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-700/40 dark:bg-emerald-900/30">
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">当前动作已完成</p>
              <Button className="mt-2 w-full" onClick={() => suggestedExerciseIndex !== null ? onJumpToExercise(suggestedExerciseIndex) : onJumpToNextIncomplete()}>
                去下一个未完成动作
              </Button>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        {restActive ? (
          <div className="mb-2 grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
            <button
              type="button"
              onClick={() => onAdjustRestDuration(-15)}
              className="min-h-10 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
            >
              -15s
            </button>
            <div className="rounded-md bg-slate-50 px-3 py-2 text-center dark:bg-slate-800">
              <p className={`text-lg font-bold tabular-nums ${restSeconds === 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{formatTime(restSeconds)}</p>
            </div>
            <button
              type="button"
              onClick={() => onAdjustRestDuration(15)}
              className="min-h-10 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
            >
              +15s
            </button>
            <Button className="min-h-10 px-3" onClick={onSkipRest}>结束休息</Button>
          </div>
        ) : null}
        <div className="grid grid-cols-4 gap-2">
          <Button variant="secondary" className="min-h-11 px-2 text-xs" onClick={() => onJumpToExercise(previousExerciseIndex)} disabled={currentExerciseIndex === 0}>
            上一动作
          </Button>
          <Button variant="secondary" className="min-h-11 px-2 text-xs" onClick={() => onJumpToExercise(nextExerciseIndex)} disabled={currentExerciseIndex >= workout.exercises.length - 1}>
            下一动作
          </Button>
          <Button variant="secondary" className="min-h-11 px-2 text-xs" onClick={onJumpToNextIncomplete} disabled={!hasNextIncompleteExercise}>
            下一未完
          </Button>
          <Button className="min-h-11 px-2 text-xs" onClick={onStartRest} disabled={restActive}>
            {restActive ? '休息中' : '开始休息'}
          </Button>
        </div>
        {!workoutMarkedComplete ? (
          <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">完成条件</p>
            <p className="mt-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">{bottomCompletionHint}</p>
          </div>
        ) : null}
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Button variant="secondary" className="min-h-10 px-2 text-xs" onClick={() => applyPatchToCurrentSet(copyPreviousPatch)} disabled={!copyPreviousPatch || !currentSet}>
            上一组
          </Button>
          <Button variant="secondary" className="min-h-10 px-2 text-xs" onClick={() => applyPatchToCurrentSet(copyRecordPatch)} disabled={!copyRecordPatch || !currentSet}>
            上次
          </Button>
          <Button
            variant={workoutMarkedComplete ? 'secondary' : 'primary'}
            className="min-h-10 px-2 text-xs"
            onClick={handleBottomPrimaryAction}
            title={bottomPrimaryTitle}
            disabled={bottomPrimaryDisabled}
          >
            {bottomPrimaryLabel}
          </Button>
        </div>
        <label className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <input
            type="checkbox"
            checked={autoStartRest}
            onChange={onToggleAutoStart}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          完成组后自动休息
        </label>
      </div>
    </div>
  )
}
