import type { PreviousExerciseRecord } from '../../lib/metrics'
import type { WorkoutSummary } from '../../lib/workout'
import type { ExerciseSetLog, WorkoutLog } from '../../types'
import { Button, EmptyState } from '../ui'
import { MobileCurrentSetCard } from './MobileCurrentSetCard'
import { MobileExerciseProgressCard, MobileTrainingModeHeader } from './MobileExerciseProgress'
import { MobileWorkoutBottomBar } from './MobileWorkoutBottomBar'
import { useMobileExerciseSession } from './useMobileExerciseSession'
import { formatSetSummary } from './workoutRecordFormat'

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
    quickFillPatch,
    quickFillSummary,
    quickFillLabel,
    emptySetCount,
    hasEmptySet,
    targetRange,
    targetRepOptions,
    repsInTarget,
    shouldSuggestNextExercise,
    currentSetActionDisabled,
    currentSetActionLabel,
    bottomPrimaryLabel,
    bottomPrimaryTitle,
    bottomNextLabel,
    bottomNextDisabled,
    bottomCompletionHint,
    currentSetStatus,
    keyboardHeight,
    bottomBarExpanded,
    setCurrentSetIndex,
    toggleBottomBarExpanded,
    updateCurrentSet,
    applyPatchToCurrentSet,
    handleCurrentSetAction,
    handleBottomPrimaryAction,
    handleBottomNextAction,
    applyPreviousRecordToEmptySets,
    applyCurrentSetToEmptySets,
    goToPreviousExercise,
    goToSuggestedOrNextIncomplete,
    goToNextIncompleteSet,
  } = session

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
    <div className="pb-48 md:hidden">
      <MobileTrainingModeHeader
        workoutName={workout.workoutName}
        elapsedSeconds={elapsedSeconds}
        workoutSummary={workoutSummary}
        onExitTrainingMode={onExitTrainingMode}
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
            currentSet={currentSet}
            setIndex={safeCurrentSetIndex}
            targetRange={targetRange}
            targetRepOptions={targetRepOptions}
            previousSameSetSummary={previousSameSetSummary}
            copyRecordSummary={copyRecordPatch ? formatSetSummary(copyRecordPatch) ?? '可套用' : null}
            repsInTarget={repsInTarget}
            quickFillLabel={quickFillLabel}
            quickFillSummary={quickFillSummary}
            quickFillAvailable={Boolean(quickFillPatch && quickFillLabel)}
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
            onQuickFill={() => applyPatchToCurrentSet(quickFillPatch)}
            onCurrentSetAction={handleCurrentSetAction}
            onCopyPrevious={() => applyPatchToCurrentSet(copyPreviousPatch)}
            onCopyRecord={() => applyPatchToCurrentSet(copyRecordPatch)}
            onAddExercise={onAddExercise}
            onAddSet={() => onAddSet(currentExerciseIndex)}
            onApplyCurrentSetToEmptySets={applyCurrentSetToEmptySets}
            onApplyPreviousRecordToEmptySets={applyPreviousRecordToEmptySets}
            onNextIncompleteSet={goToNextIncompleteSet}
            onToggleAutoStart={onToggleAutoStart}
          />

          {canFinishWorkout && !workoutMarkedComplete ? (
            <div className="mt-2 rounded-lg border border-emerald-200 bg-white p-2.5 dark:border-emerald-700/40 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-900 dark:text-slate-100">所有组已填完</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">确认后会同步到今日记录，并把训练完成度记为 100%。</p>
              <Button className="mt-1.5 w-full py-2" onClick={onFinishWorkout}>
                确认完成训练
              </Button>
            </div>
          ) : shouldSuggestNextExercise ? (
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">当前动作已完成</p>
              <Button className="mt-1.5 w-full py-2" onClick={goToSuggestedOrNextIncomplete}>
                去下一个未完成动作
              </Button>
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
        expanded={bottomBarExpanded}
        keyboardHeight={keyboardHeight}
        bottomNextLabel={bottomNextLabel}
        bottomNextDisabled={bottomNextDisabled}
        bottomPrimaryLabel={bottomPrimaryLabel}
        bottomPrimaryTitle={bottomPrimaryTitle}
        bottomCompletionHint={bottomCompletionHint}
        canGoPrevious={currentExerciseIndex > 0}
        quickFillLabel={quickFillLabel}
        quickFillDisabled={!quickFillPatch || !currentSet}
        onToggleExpanded={toggleBottomBarExpanded}
        onPreviousExercise={goToPreviousExercise}
        onNext={handleBottomNextAction}
        onPrimary={handleBottomPrimaryAction}
        onQuickFill={() => applyPatchToCurrentSet(quickFillPatch)}
        onStartRest={onStartRest}
        onAdjustRestDuration={onAdjustRestDuration}
        onSkipRest={onSkipRest}
      />
    </div>
  )
}
