import { useState } from 'react'
import type { PreviousExerciseRecord } from '../../lib/metrics'
import type { WorkoutSummary } from '../../lib/workout'
import type { ExerciseSetLog, WorkoutLog } from '../../types'
import { Button, EmptyState } from '../ui'
import { MobileCurrentSetCard } from './MobileCurrentSetCard'
import { MobileExerciseProgressCard, MobileTrainingModeHeader } from './MobileExerciseProgress'
import { MobileWorkoutBottomBar } from './MobileWorkoutBottomBar'
import { useMobileExerciseSession } from './useMobileExerciseSession'
import { formatSetSummary } from './workoutRecordFormat'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useToast } from '../ToastContainer'

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
  onDeleteLastSet: (exerciseIndex: number) => void
  onAddExercise: () => void
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
  onDeleteLastSet,
  onAddExercise,
  onStartRest,
  onSkipRest,
  onAdjustRestDuration,
  onToggleAutoStart,
  onExitTrainingMode,
  onFinishWorkout,
}: MobileCurrentExerciseViewProps) {
  const session = useMobileExerciseSession({
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
  })
  const {
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
    emptySetCount,
    hasEmptySet,
    targetRange,
    targetRepOptions,
    repsInTarget,
    shouldSuggestNextExercise,
    currentSetActionDisabled,
    currentSetActionLabel,
    bottomFinishLabel,
    bottomFinishTitle,
    bottomCompletionHint,
    currentSetStatus,
    keyboardHeight,
    setCurrentSetIndex,
    updateCurrentSet,
    applyPatchToCurrentSet,
    handleCurrentSetAction,
    handleBottomFinishAction,
    applyPreviousRecordToEmptySets,
    applyCurrentSetToEmptySets,
    goToPreviousExercise,
    goToSuggestedOrNextIncomplete,
    goToNextIncompleteSet,
  } = session
  const totalSets = exercise?.sets.length ?? 0
  const { showToast } = useToast()

  // Undo buffer for last completed set
  const [lastCompletedSet, setLastCompletedSet] = useState<{
    exerciseIndex: number
    setIndex: number
    data: ExerciseSetLog
  } | null>(null)

  // Wrap handleCurrentSetAction to save state and show undo toast
  function handleCurrentSetActionWithUndo() {
    if (!exercise || !currentSet) return

    // Save current set state before completing
    setLastCompletedSet({
      exerciseIndex: currentExerciseIndex,
      setIndex: safeCurrentSetIndex,
      data: { ...currentSet }
    })

    // Execute original action
    handleCurrentSetAction()

    // Show toast with undo action
    showToast(
      `第 ${safeCurrentSetIndex + 1} 组已完成`,
      'success',
      5000,
      {
        label: '撤销',
        handler: undoLastSet
      }
    )
  }

  // Undo last completed set
  function undoLastSet() {
    if (!lastCompletedSet) return

    const { exerciseIndex, setIndex, data } = lastCompletedSet
    onUpdateSet(exerciseIndex, setIndex, data)
    setLastCompletedSet(null)

    showToast('已撤销', 'neutral', 2000)
  }

  // Keyboard shortcuts for workout
  useKeyboardShortcuts([
    {
      key: 'Enter',
      handler: () => {
        if (!currentSetActionDisabled && exercise) {
          handleCurrentSetActionWithUndo()
        }
      }
    },
    {
      key: ' ',
      handler: () => {
        if (!restActive) {
          onStartRest()
        } else {
          onSkipRest()
        }
      }
    },
    {
      key: 'ArrowLeft',
      handler: () => {
        if (currentExerciseIndex > 0) {
          goToPreviousExercise()
        }
      }
    },
    {
      key: 'ArrowRight',
      handler: () => {
        if (shouldSuggestNextExercise || currentExerciseIndex < workout.exercises.length - 1) {
          handleGoToNextExercise()
        }
      }
    }
  ], Boolean(exercise))

  function handleAddCurrentExerciseSet() {
    if (!exercise) return
    onAddSet(currentExerciseIndex)
    setCurrentSetIndex(exercise.sets.length)
  }

  function handleDeleteCurrentExerciseLastSet() {
    if (!exercise || exercise.sets.length <= 1) return

    // Confirm before deleting
    if (!window.confirm('确定要删除最后一组吗？此操作无法撤销。')) {
      return
    }

    setCurrentSetIndex(Math.min(safeCurrentSetIndex, exercise.sets.length - 2))
    onDeleteLastSet(currentExerciseIndex)

    showToast('已删除最后一组', 'neutral', 2000)
  }

  function handleExitTrainingMode() {
    // Check if there are any incomplete sets
    const hasIncompleteSets = workout.exercises.some(ex =>
      ex.sets.some(set => !set.weight || !set.reps)
    )

    if (hasIncompleteSets && !window.confirm('训练中有未填写的组，确定要退出吗？')) {
      return
    }

    onExitTrainingMode()
  }

  function handleGoToNextExercise() {
    if (shouldSuggestNextExercise) {
      goToSuggestedOrNextIncomplete()
      return
    }
    if (currentExerciseIndex >= workout.exercises.length - 1) return
    onJumpToExercise(currentExerciseIndex + 1)
  }

  if (!exercise) {
    return (
      <div className="space-y-3 pb-32 md:hidden">
        <EmptyState
          compact
          title="当前训练还没有动作"
          message="先添加一个动作，再开始记录重量、次数和 RIR。"
          actions={
            <>
              <Button onClick={onAddExercise}>新增动作</Button>
              <Button variant="secondary" onClick={onExitTrainingMode}>返回训练页</Button>
            </>
          }
        />
      </div>
    )
  }

  return (
    <div className="pb-28 md:hidden">
      <MobileTrainingModeHeader
        workoutName={workout.workoutName}
        elapsedSeconds={elapsedSeconds}
        workoutSummary={workoutSummary}
        onExitTrainingMode={handleExitTrainingMode}
      />

      <div className="mt-2 grid gap-2">
        <MobileExerciseProgressCard
          exercise={exercise}
          exerciseIndex={currentExerciseIndex}
          exerciseCount={workout.exercises.length}
          previousRecord={previousRecord}
          completed={completed}
          completedSetCount={completedExerciseSetCount}
          remainingSetCount={remainingExerciseSetCount}
          currentSetIndex={safeCurrentSetIndex}
          onSelectSet={setCurrentSetIndex}
        >
          <MobileCurrentSetCard
            key={`${exercise.exerciseId}-${exercise.name}-${safeCurrentSetIndex}`}
            currentSet={currentSet}
            setIndex={safeCurrentSetIndex}
            totalSets={totalSets}
            targetRange={targetRange}
            targetRepOptions={targetRepOptions}
            previousSameSetSummary={previousSameSetSummary}
            copyRecordSummary={copyRecordPatch ? formatSetSummary(copyRecordPatch) ?? '可套用' : null}
            repsInTarget={repsInTarget}
            currentSetComplete={currentSetComplete}
            currentSetActionLabel={currentSetActionLabel}
            currentSetActionDisabled={currentSetActionDisabled}
            hasCopyPrevious={Boolean(copyPreviousPatch)}
            hasCopyRecord={Boolean(copyRecordPatch)}
            hasEmptySet={hasEmptySet}
            emptySetCount={emptySetCount}
            hasPreviousRecord={Boolean(previousRecord)}
            hasAnotherIncompleteSet={hasAnotherIncompleteSet}
            autoStartRest={autoStartRest}
            onUpdateSet={updateCurrentSet}
            onCurrentSetAction={handleCurrentSetActionWithUndo}
            onCopyPrevious={() => applyPatchToCurrentSet(copyPreviousPatch)}
            onCopyRecord={() => applyPatchToCurrentSet(copyRecordPatch)}
            onAddExercise={onAddExercise}
            onAddSet={handleAddCurrentExerciseSet}
            onDeleteLastSet={handleDeleteCurrentExerciseLastSet}
            onApplyCurrentSetToEmptySets={applyCurrentSetToEmptySets}
            onApplyPreviousRecordToEmptySets={applyPreviousRecordToEmptySets}
            onNextIncompleteSet={goToNextIncompleteSet}
            onToggleAutoStart={onToggleAutoStart}
          />

          {canFinishWorkout && !workoutMarkedComplete ? (
            <div className="mt-2 rounded-lg border border-emerald-200 bg-white p-2.5 dark:border-emerald-700/40 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-900 dark:text-slate-100">所有组已填完</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">确认后会同步到今日记录，并把训练完成度记为 100%。</p>
            </div>
          ) : shouldSuggestNextExercise ? (
            <div className="mt-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2.5 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">当前动作已完成</p>
            </div>
          ) : null}
        </MobileExerciseProgressCard>
      </div>

      <MobileWorkoutBottomBar
        exerciseName={exercise.name}
        setIndex={safeCurrentSetIndex}
        currentSetStatus={currentSetStatus}
        restDefaultDuration={restDefaultDuration}
        restActive={restActive}
        restSeconds={restSeconds}
        workoutSummary={workoutSummary}
        keyboardHeight={keyboardHeight}
        bottomNextLabel="下一动作"
        bottomNextDisabled={!shouldSuggestNextExercise && currentExerciseIndex >= workout.exercises.length - 1}
        bottomFinishLabel={bottomFinishLabel}
        bottomFinishTitle={bottomFinishTitle}
        bottomCompletionHint={bottomCompletionHint}
        canGoPrevious={currentExerciseIndex > 0}
        onPreviousExercise={goToPreviousExercise}
        onNext={handleGoToNextExercise}
        onFinish={handleBottomFinishAction}
        onStartRest={onStartRest}
        onAdjustRestDuration={onAdjustRestDuration}
        onSkipRest={onSkipRest}
      />
    </div>
  )
}
