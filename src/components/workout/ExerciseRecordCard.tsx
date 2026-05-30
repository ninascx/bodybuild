import { useEffect, useRef, useState } from 'react'
import type { ExerciseLog, ExerciseSetLog } from '../../types'
import type { PreviousExerciseRecord } from '../../lib/metrics'
import { isSetComplete, isSetEmpty } from '../../lib/workout'
import { ExerciseBulkActions, ExerciseEditPanel } from './ExerciseRecordActions'
import { ExercisePreviousDetails, ExerciseRecordHeader } from './ExerciseRecordSummary'
import { ExerciseSetEditor } from './ExerciseSetEditor'
import { formatSetSummary } from './workoutRecordFormat'

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

  const emptySetCount = exercise.sets.filter(isSetEmpty).length
  const hasEmptySet = emptySetCount > 0
  const hasFilledSet = exercise.sets.some(isSetComplete)

  return (
    <div
      id={`exercise-${exerciseIndex}`}
      className="min-w-0 scroll-mt-20 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-3"
    >
      <ExerciseRecordHeader
        exercise={exercise}
        exerciseIndex={exerciseIndex}
        previousRecord={previousRecord}
        filledSets={filledSets}
        totalSets={totalSets}
        collapsed={collapsed}
        onToggle={handleToggleCollapsed}
      />

      {collapsed ? null : (
        <>
          <div className="mt-3 grid gap-2">
            {exercise.sets.map((set, setIndex) => {
              const isLast = setIndex === exercise.sets.length - 1
              const previous = setIndex > 0 ? exercise.sets[setIndex - 1] : undefined
              const canCopy =
                previous !== undefined &&
                isSetComplete(previous)
              const previousPatch = previousRecord ? previousRecordPatch(previousRecord, setIndex) : null
              const previousSameSet = previousRecord?.allSets?.[setIndex]
              const previousSetSummary = previousSameSet ? formatSetSummary(previousSameSet) : null
              const fallbackPreviousSummary = previousPatch && !previousSetSummary
                ? formatSetSummary(previousPatch)
                : null
              const previousHintSummary = previousSetSummary ?? fallbackPreviousSummary
              const previousHintLabel = previousSetSummary ? '上次同组' : previousHintSummary ? '上次最佳' : null
              return (
                <ExerciseSetEditor
                  key={setIndex}
                  set={set}
                  setIndex={setIndex}
                  exerciseTarget={exercise.target}
                  previousHintLabel={previousHintLabel}
                  previousHintSummary={previousHintSummary}
                  previousPatch={previousPatch}
                  canCopyPrevious={canCopy}
                  compact={compact}
                  inputRef={isLast ? (el) => { lastAddedSetRef.current = el } : undefined}
                  onUpdateSet={(patch) => onUpdateSet(exerciseIndex, setIndex, patch)}
                  onApplyPreviousPatch={() => previousPatch && onUpdateSet(exerciseIndex, setIndex, previousPatch)}
                  onCopyPrevious={() => handleCopyPrevious(setIndex)}
                />
              )
            })}
          </div>

          <ExerciseBulkActions
            emptySetCount={emptySetCount}
            hasEmptySet={hasEmptySet}
            hasFilledSet={hasFilledSet}
            hasPreviousRecord={Boolean(previousRecord)}
            canDeleteLastSet={exercise.sets.length > 1}
            onAddSet={() => onAddSet(exerciseIndex)}
            onDeleteLastSet={() => onDeleteLastSet(exerciseIndex)}
            onApplyPreviousToEmpty={handleApplyPreviousToEmpty}
            onFillEmptySets={() => onFillEmptySets(exerciseIndex)}
          />

          <ExerciseEditPanel
            exercise={exercise}
            onUpdateExercise={(patch) => onUpdateExercise(exerciseIndex, patch)}
            onMoveUp={() => onMoveExerciseUp(exerciseIndex)}
            onMoveDown={() => onMoveExerciseDown(exerciseIndex)}
            onRebuildSets={() => onRebuildSets(exerciseIndex)}
            onDelete={() => onDeleteExercise(exerciseIndex)}
          />

          <ExercisePreviousDetails previousRecord={previousRecord} />
        </>
      )}
    </div>
  )
}
