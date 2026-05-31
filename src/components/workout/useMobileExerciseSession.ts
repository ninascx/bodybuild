import { useEffect, useState } from 'react'
import type { PreviousExerciseRecord } from '../../lib/metrics'
import type { TargetRepRange } from '../../lib/workout'
import { isSetComplete, isSetEmpty, parseTargetRepRange, targetRepQuickOptions } from '../../lib/workout'
import type { ExerciseLog, ExerciseSetLog, WorkoutLog } from '../../types'
import { formatSetSummary } from './workoutRecordFormat'

function isExerciseComplete(exercise: ExerciseLog): boolean {
  return exercise.sets.length > 0 && exercise.sets.every(isSetComplete)
}

function firstIncompleteSetIndex(exercise: ExerciseLog | undefined): number {
  if (!exercise) return 0
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
  if (!previous || !isSetComplete(previous)) return null
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

export type MobileExerciseSession = ReturnType<typeof useMobileExerciseSession>

export function useMobileExerciseSession({
  workout,
  currentExerciseIndex,
  suggestedExerciseIndex,
  workoutMarkedComplete,
  canFinishWorkout,
  hasNextIncompleteExercise,
  completionHint,
  previousRecordsByExerciseKey,
  onJumpToExercise,
  onJumpToNextIncomplete,
  onUpdateSet,
  onExitTrainingMode,
  onFinishWorkout,
}: {
  workout: WorkoutLog
  currentExerciseIndex: number
  suggestedExerciseIndex: number | null
  workoutMarkedComplete: boolean
  canFinishWorkout: boolean
  hasNextIncompleteExercise: boolean
  completionHint: string
  previousRecordsByExerciseKey: Map<string, PreviousExerciseRecord | undefined>
  onJumpToExercise: (index: number) => void
  onJumpToNextIncomplete: () => void
  onUpdateSet: (exerciseIndex: number, setIndex: number, patch: Partial<ExerciseSetLog>) => void
  onExitTrainingMode: () => void
  onFinishWorkout: () => void
}) {
  const exercise = workout.exercises[currentExerciseIndex]
  const [currentSetIndex, setCurrentSetIndex] = useState(() => firstIncompleteSetIndex(exercise))
  const [bulkFillCompleted, setBulkFillCompleted] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const handleResize = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight
      const height = Math.max(0, window.innerHeight - vh)
      setKeyboardHeight(height)
    }
    window.visualViewport?.addEventListener('resize', handleResize)
    return () => window.visualViewport?.removeEventListener('resize', handleResize)
  }, [])

  const previousRecord = exercise
    ? previousRecordsByExerciseKey.get(`${exercise.exerciseId}::${exercise.name.trim()}`)
    : undefined
  const safeCurrentSetIndex = exercise ? Math.min(currentSetIndex, Math.max(0, exercise.sets.length - 1)) : 0
  const currentSet = exercise?.sets[safeCurrentSetIndex]
  const completed = exercise ? isExerciseComplete(exercise) : false
  const completedExerciseSetCount = exercise?.sets.filter(isSetComplete).length ?? 0
  const remainingExerciseSetCount = exercise ? Math.max(exercise.sets.length - completedExerciseSetCount, 0) : 0
  const currentSetComplete = currentSet ? isSetComplete(currentSet) : false
  const nextSetIndex = exercise && currentSet ? nextIncompleteSetIndex(exercise, safeCurrentSetIndex) : safeCurrentSetIndex
  const hasAnotherIncompleteSet = currentSetComplete && nextSetIndex !== safeCurrentSetIndex
  const previousExerciseIndex = Math.max(0, currentExerciseIndex - 1)
  const nextExerciseIndex = Math.min(workout.exercises.length - 1, currentExerciseIndex + 1)
  const copyPreviousPatch = exercise ? previousSetPatch(exercise, safeCurrentSetIndex) : null
  const copyRecordPatch = previousRecordSetPatch(previousRecord, safeCurrentSetIndex)
  const previousSameSetSummary = previousRecord?.allSets?.[safeCurrentSetIndex]
    ? formatSetSummary(previousRecord.allSets[safeCurrentSetIndex])
    : null
  const currentSetSummary = currentSet ? formatSetSummary(currentSet) : null
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
  const emptySetCount = exercise?.sets.filter(isSetEmpty).length ?? 0
  const hasEmptySet = emptySetCount > 0
  const targetRange: TargetRepRange | null = exercise ? parseTargetRepRange(exercise.target) : null
  const targetRepOptions = targetRepQuickOptions(targetRange)
  const repsInTarget =
    targetRange && currentSet?.reps !== undefined
      ? currentSet.reps >= targetRange.min && currentSet.reps <= targetRange.max
      : null
  const shouldSuggestNextExercise = suggestedExerciseIndex !== null || (bulkFillCompleted && completed && hasNextIncompleteExercise)
  const canConfirmWorkout = canFinishWorkout && !workoutMarkedComplete
  const canFinishNow = !workoutMarkedComplete
  const currentSetActionDisabled = !currentSetComplete || (!hasAnotherIncompleteSet && !shouldSuggestNextExercise)
  const currentSetActionLabel = !currentSetComplete
    ? '填重量和次数后可确认本组'
    : hasAnotherIncompleteSet
      ? '确认本组，去下一组'
      : shouldSuggestNextExercise
        ? '确认动作，去下一个'
        : canConfirmWorkout
          ? '本动作已完成'
          : '本动作已完成'
  const bottomPrimaryLabel = workoutMarkedComplete
    ? '返回记录'
    : canConfirmWorkout
      ? '确认完成'
      : '确认本组'
  const bottomPrimaryTitle = workoutMarkedComplete
    ? '已同步到今日记录'
    : canConfirmWorkout
      ? '所有组已填完，确认后同步到今日记录'
      : currentSetComplete
        ? currentSetActionLabel
        : '先填写重量和次数'
  const bottomPrimaryDisabled = !workoutMarkedComplete && !canConfirmWorkout && currentSetActionDisabled
  const bottomFinishLabel = workoutMarkedComplete ? '返回' : '结束'
  const bottomFinishTitle = workoutMarkedComplete
    ? '返回记录'
    : '现在结束本次训练，已记录的组会保留，今日记录不会丢失'
  const bottomNextLabel = hasAnotherIncompleteSet
    ? '下一组'
    : shouldSuggestNextExercise
      ? '下一动作'
      : '下一动作'
  const bottomNextDisabled = !hasAnotherIncompleteSet && !shouldSuggestNextExercise && currentExerciseIndex >= workout.exercises.length - 1
  const bottomCompletionHint = workoutMarkedComplete
    ? '本次训练已同步到今日记录。'
    : canConfirmWorkout
      ? '所有组已填完，点确认完成即可同步到今日记录。'
      : shouldSuggestNextExercise
        ? '当前动作已完成，点下一动作继续。'
        : `${completionHint} 可随时结束训练。`
  const currentSetStatus = currentSetSummary ?? (currentSetComplete ? '已填' : '待填')

  function updateCurrentSet(patch: Partial<ExerciseSetLog>, advanceWhenComplete = false) {
    if (!exercise || !currentSet) return
    onUpdateSet(currentExerciseIndex, safeCurrentSetIndex, patch)
    if (advanceWhenComplete) {
      setCurrentSetIndex(nextIncompleteSetIndex(exercise, safeCurrentSetIndex, patch))
    }
  }

  function applyPatchToCurrentSet(patch: Partial<ExerciseSetLog> | null, advanceWhenComplete = false) {
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
    handleCurrentSetAction()
  }

  function handleBottomFinishAction() {
    if (workoutMarkedComplete) {
      onExitTrainingMode()
      return
    }
    if (canFinishNow) {
      onFinishWorkout()
    }
  }

  function handleBottomNextAction() {
    if (hasAnotherIncompleteSet) {
      setCurrentSetIndex(nextSetIndex)
      return
    }
    if (suggestedExerciseIndex !== null) {
      onJumpToExercise(suggestedExerciseIndex)
      return
    }
    if (shouldSuggestNextExercise) {
      onJumpToNextIncomplete()
      return
    }
    onJumpToExercise(nextExerciseIndex)
  }

  function applyPreviousRecordToEmptySets() {
    if (!exercise || !previousRecord) return
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
    if (!exercise || !currentSetComplete || !currentSet) return
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

  return {
    exercise,
    currentSet,
    previousRecord,
    safeCurrentSetIndex,
    completed,
    completedExerciseSetCount,
    remainingExerciseSetCount,
    currentSetComplete,
    hasAnotherIncompleteSet,
    copyPreviousPatch,
    copyRecordPatch,
    previousSameSetSummary,
    quickFillPatch,
    quickFillSummary,
    quickFillLabel,
    emptySetCount,
    hasEmptySet,
    targetRange,
    targetRepOptions,
    repsInTarget,
    shouldSuggestNextExercise,
    canConfirmWorkout,
    currentSetActionDisabled,
    currentSetActionLabel,
    bottomPrimaryLabel,
    bottomPrimaryTitle,
    bottomPrimaryDisabled,
    bottomFinishLabel,
    bottomFinishTitle,
    bottomNextLabel,
    bottomNextDisabled,
    bottomCompletionHint,
    currentSetStatus,
    keyboardHeight,
    setCurrentSetIndex,
    updateCurrentSet,
    applyPatchToCurrentSet,
    handleCurrentSetAction,
    handleBottomPrimaryAction,
    handleBottomFinishAction,
    handleBottomNextAction,
    applyPreviousRecordToEmptySets,
    applyCurrentSetToEmptySets,
    goToPreviousExercise: () => onJumpToExercise(previousExerciseIndex),
    goToSuggestedOrNextIncomplete: () => {
      if (suggestedExerciseIndex !== null) {
        onJumpToExercise(suggestedExerciseIndex)
        return
      }
      onJumpToNextIncomplete()
    },
    goToNextIncompleteSet: () => setCurrentSetIndex(nextSetIndex),
  }
}
