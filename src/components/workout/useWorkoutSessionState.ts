import { useCallback, useEffect, useRef, useState } from 'react'
import { useTrainingTimer } from '../../hooks/useTrainingTimer'
import type { ExerciseLog, ExerciseSetLog, WorkoutLog } from '../../types'
import type { WorkoutSummary } from '../../lib/workout'
import { isSetComplete } from '../../lib/workout'

type UseWorkoutSessionStateParams = {
  selectedDate: string
  selectedWorkout: WorkoutLog | undefined
  restDay: boolean
  workoutSummary: WorkoutSummary
  workoutMarkedComplete: boolean
  showOnlyUnfinishedExercises: boolean
  onToggleShowUnfinished: () => void
  onUpdateSet: (exerciseIndex: number, setIndex: number, patch: Partial<ExerciseSetLog>) => void
  onFinishWorkout: () => void
}

function isExerciseComplete(exercise: ExerciseLog): boolean {
  return exercise.sets.length > 0 && exercise.sets.every(isSetComplete)
}

function nextIncompleteExerciseIndex(workout: WorkoutLog | undefined, currentIndex: number): number | null {
  if (!workout || workout.exercises.length === 0) return null
  if (currentIndex < 0) {
    const firstIncompleteIndex = workout.exercises.findIndex((exercise) => !isExerciseComplete(exercise))
    return firstIncompleteIndex >= 0 ? firstIncompleteIndex : null
  }
  for (let offset = 1; offset < workout.exercises.length; offset += 1) {
    const index = (currentIndex + offset) % workout.exercises.length
    if (!isExerciseComplete(workout.exercises[index])) return index
  }
  return null
}

function scrollToExercise(index: number): void {
  const target = document.getElementById(`exercise-${index}`)
  if (!target) return
  const top = window.scrollY + target.getBoundingClientRect().top - 120
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

export function useWorkoutSessionState({
  selectedDate,
  selectedWorkout,
  restDay,
  workoutSummary,
  workoutMarkedComplete,
  showOnlyUnfinishedExercises,
  onToggleShowUnfinished,
  onUpdateSet,
  onFinishWorkout,
}: UseWorkoutSessionStateParams) {
  const [trainingMode, setTrainingMode] = useState(false)
  const effectiveTrainingMode = trainingMode && Boolean(selectedWorkout) && !restDay
  const hasWorkout = Boolean(selectedWorkout)
  const hasIncompleteExercise = selectedWorkout?.exercises.some((exercise) => !isExerciseComplete(exercise)) ?? false
  const remainingSetCount = Math.max(workoutSummary.totalSets - workoutSummary.filledSets, 0)
  const selectedWorkoutRef = useRef<WorkoutLog | undefined>(selectedWorkout)
  const [completionToast, setCompletionToast] = useState<string | null>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [suggestedExerciseIndex, setSuggestedExerciseIndex] = useState<number | null>(null)
  const hasNextIncompleteExercise = nextIncompleteExerciseIndex(selectedWorkout, currentExerciseIndex) !== null
  const workoutReadyToConfirm = !workoutMarkedComplete && workoutSummary.completionPercent === 100

  const {
    elapsedSeconds,
    restSeconds,
    restActive,
    restDefaultDuration,
    autoStartRest,
    startRestTimer,
    stopRestTimer,
    adjustRestDuration,
    toggleAutoStartRest,
  } = useTrainingTimer(selectedDate, effectiveTrainingMode)

  const handleSkipRest = useCallback(() => {
    stopRestTimer()
  }, [stopRestTimer])

  const handleStartRest = useCallback(() => {
    startRestTimer()
  }, [startRestTimer])

  const handleFinishWorkout = useCallback(() => {
    stopRestTimer()
    onFinishWorkout()
    setTrainingMode(false)
    setCompletionToast('训练已同步到今日记录')
  }, [onFinishWorkout, stopRestTimer])

  const handleAdjustRestDuration = useCallback((delta: number) => {
    adjustRestDuration(delta)
  }, [adjustRestDuration])

  useEffect(() => {
    const isMobile = window.innerWidth < 768
    if (isMobile && selectedWorkout && !restDay && !workoutMarkedComplete && !trainingMode) {
      setTrainingMode(true)
    }
  }, [selectedWorkout, restDay, workoutMarkedComplete, trainingMode])

  useEffect(() => {
    if (!completionToast) return
    const timer = window.setTimeout(() => setCompletionToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [completionToast])

  useEffect(() => {
    selectedWorkoutRef.current = selectedWorkout
  }, [selectedWorkout])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentExerciseIndex(() => {
        const currentWorkout = selectedWorkoutRef.current
        const count = currentWorkout?.exercises.length ?? 0
        if (count === 0) return 0
        return nextIncompleteExerciseIndex(currentWorkout, -1) ?? 0
      })
      setSuggestedExerciseIndex(null)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [selectedWorkout?.date, selectedWorkout?.exercises.length])

  const jumpToExercise = useCallback((index: number) => {
    const count = selectedWorkout?.exercises.length ?? 0
    if (count === 0) return
    setCurrentExerciseIndex(Math.min(Math.max(index, 0), count - 1))
    setSuggestedExerciseIndex(null)
  }, [selectedWorkout?.exercises.length])

  const jumpToNextIncomplete = useCallback(() => {
    const nextIndex = nextIncompleteExerciseIndex(selectedWorkout, currentExerciseIndex)
    if (nextIndex !== null) {
      jumpToExercise(nextIndex)
    }
  }, [currentExerciseIndex, jumpToExercise, selectedWorkout])

  const scrollToNextIncomplete = useCallback(() => {
    const nextIndex = nextIncompleteExerciseIndex(selectedWorkout, -1)
    if (nextIndex !== null) {
      scrollToExercise(nextIndex)
    }
  }, [selectedWorkout])

  const setShowOnlyUnfinished = useCallback((nextValue: boolean) => {
    if (showOnlyUnfinishedExercises !== nextValue) {
      onToggleShowUnfinished()
    }
  }, [onToggleShowUnfinished, showOnlyUnfinishedExercises])

  useEffect(() => {
    if (!hasIncompleteExercise && showOnlyUnfinishedExercises) {
      onToggleShowUnfinished()
    }
  }, [hasIncompleteExercise, onToggleShowUnfinished, showOnlyUnfinishedExercises])

  const handleUpdateSet = useCallback(
    (exerciseIndex: number, setIndex: number, patch: Partial<ExerciseSetLog>) => {
      const set = selectedWorkout?.exercises[exerciseIndex]?.sets[setIndex]
      if (!set) {
        onUpdateSet(exerciseIndex, setIndex, patch)
        return
      }
      const wasComplete = isSetComplete(set)
      const hasWeightPatch = Object.prototype.hasOwnProperty.call(patch, 'weight')
      const hasRepsPatch = Object.prototype.hasOwnProperty.call(patch, 'reps')
      const weight = hasWeightPatch ? patch.weight : set.weight
      const reps = hasRepsPatch ? patch.reps : set.reps
      const willBeComplete = weight !== undefined && reps !== undefined

      onUpdateSet(exerciseIndex, setIndex, patch)

      if (!wasComplete && willBeComplete) {
        if (effectiveTrainingMode) {
          const exerciseName = selectedWorkout?.exercises[exerciseIndex]?.name || '动作'
          setCompletionToast(`✓ ${exerciseName} 第 ${setIndex + 1} 组`)
        }
        const nextExercise = selectedWorkout?.exercises[exerciseIndex]
        const nextSets = nextExercise?.sets.map((item, currentSetIndex) =>
          currentSetIndex === setIndex ? { ...item, ...patch } : item,
        )
        if (
          effectiveTrainingMode &&
          nextSets &&
          nextSets.length > 0 &&
          nextSets.every(isSetComplete) &&
          exerciseIndex === currentExerciseIndex
        ) {
          setSuggestedExerciseIndex(nextIncompleteExerciseIndex(selectedWorkout, exerciseIndex))
        }
        if (autoStartRest) {
          startRestTimer()
        }
      }
    },
    [selectedWorkout, onUpdateSet, startRestTimer, autoStartRest, effectiveTrainingMode, currentExerciseIndex],
  )

  return {
    trainingMode,
    setTrainingMode,
    effectiveTrainingMode,
    hasWorkout,
    hasIncompleteExercise,
    remainingSetCount,
    completionToast,
    currentExerciseIndex,
    suggestedExerciseIndex,
    hasNextIncompleteExercise,
    workoutReadyToConfirm,
    elapsedSeconds,
    restSeconds,
    restActive,
    restDefaultDuration,
    autoStartRest,
    toggleAutoStartRest,
    handleSkipRest,
    handleStartRest,
    handleFinishWorkout,
    handleAdjustRestDuration,
    jumpToExercise,
    jumpToNextIncomplete,
    scrollToNextIncomplete,
    setShowOnlyUnfinished,
    handleUpdateSet,
  }
}
