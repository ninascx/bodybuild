import {
  Button,
  EmptyState,
} from '../components/ui'
import { useEffect, useState } from 'react'
import { ExerciseRecordCard } from '../components/workout/ExerciseRecordCard'
import { ExerciseQuickJumpStrip } from '../components/workout/ExerciseQuickJumpStrip'
import { MobileCurrentExerciseView } from '../components/workout/MobileCurrentExerciseView'
import { WorkoutControlPanel } from '../components/workout/WorkoutControlPanel'
import { WorkoutTemplateManager } from '../components/workout/WorkoutTemplateManager'
import { TrainingHeader, TrainingTimerFloat } from '../components/workout/TrainingHeader'
import { WorkoutRecordToolbar } from '../components/workout/WorkoutRecordToolbar'
import { WorkoutMobileActionPanel, WorkoutMoreActionsPanel } from '../components/workout/WorkoutSessionActions'
import { WorkoutStatusOverview } from '../components/workout/WorkoutStatusOverview'
import { useWorkoutSessionState } from '../components/workout/useWorkoutSessionState'
import {
  getWorkoutCompletionHint,
  getWorkoutMobilePrimaryLabel,
  getWorkoutPrimaryLabel,
  getWorkoutRecordBadge,
  getWorkoutStatusView,
} from '../components/workout/workoutStatusModel'
import type { ExerciseLog, ExercisePlan, WorkoutLog, WorkoutTemplate } from '../types'
import type { PreviousExerciseRecord } from '../lib/metrics'
import type { SyncState } from '../lib/storage'
import type { WorkoutSummary, WorkoutTemplateOption } from '../lib/workout'

function templateToOption(template: WorkoutTemplate): WorkoutTemplateOption {
  return {
    id: template.id,
    name: template.name,
    focus: template.focus,
    source: template.isBuiltin ? 'builtin' : 'custom',
    exercises: template.exercises,
  }
}

type WorkoutTabProps = {
  selectedDate: string
  today: string
  selectedWorkout: WorkoutLog | undefined
  selectedTemplate: WorkoutTemplateOption
  selectedTemplateId: string
  templateOptions: WorkoutTemplateOption[]
  recommendedPlanName: string
  workoutSummary: WorkoutSummary
  visibleWorkoutExercises: Array<{ exercise: ExerciseLog; exerciseIndex: number }>
  previousRecordsByExerciseKey: Map<string, PreviousExerciseRecord | undefined>
  showOnlyUnfinishedExercises: boolean
  builtinTemplates: WorkoutTemplate[]
  workoutTemplates: WorkoutTemplate[]
  syncState: SyncState
  restDay: boolean
  workoutMarkedComplete: boolean
  onDateChange: (date: string) => void
  onTemplateChange: (id: string) => void
  onApplyTemplate: (template: WorkoutTemplateOption) => void
  onApplyRecommended: () => void
  onToggleShowUnfinished: () => void
  onUpdateWorkout: (nextLog: WorkoutLog, immediate?: boolean, options?: { syncCompletion?: boolean }) => void
  onUpdateExercise: (exerciseIndex: number, patch: Partial<ExerciseLog>) => void
  onUpdateSet: (exerciseIndex: number, setIndex: number, patch: Partial<ExerciseLog['sets'][0]>) => void
  onAddSet: (exerciseIndex: number) => void
  onDeleteLastSet: (exerciseIndex: number) => void
  onRebuildSets: (exerciseIndex: number) => void
  onDeleteExercise: (exerciseIndex: number) => void
  onMoveExerciseUp: (exerciseIndex: number) => void
  onMoveExerciseDown: (exerciseIndex: number) => void
  onAddExercise: () => void
  onFillEmptySets: (exerciseIndex: number) => void
  onSaveAsTemplate: () => void
  onCreateTemplate: () => void
  onUpdateTemplate: (id: string, patch: Partial<WorkoutTemplate>) => void
  onUpdateTemplateExercise: (templateId: string, exerciseIndex: number, patch: Partial<ExercisePlan>) => void
  onAddTemplateExercise: (templateId: string) => void
  onDeleteTemplateExercise: (templateId: string, exerciseIndex: number) => void
  onDeleteTemplate: (id: string) => void
  onExportTemplateToken: () => Promise<{ token: string; count: number }>
  onImportTemplateToken: (token: string) => Promise<{ importedCount: number }>
  onExportSelectedWorkout: () => void
  onFinishWorkout: () => void
  onImmersiveModeChange?: (enabled: boolean) => void
}

export function WorkoutTab(props: WorkoutTabProps) {
  const [collapseMode, setCollapseMode] = useState<'auto' | 'all' | 'none'>('auto')
  const { onImmersiveModeChange } = props
  const {
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
  } = useWorkoutSessionState({
    selectedDate: props.selectedDate,
    selectedWorkout: props.selectedWorkout,
    restDay: props.restDay,
    workoutSummary: props.workoutSummary,
    workoutMarkedComplete: props.workoutMarkedComplete,
    showOnlyUnfinishedExercises: props.showOnlyUnfinishedExercises,
    onToggleShowUnfinished: props.onToggleShowUnfinished,
    onUpdateSet: props.onUpdateSet,
    onFinishWorkout: props.onFinishWorkout,
  })

  const workoutStatus = getWorkoutStatusView({
    restDay: props.restDay,
    selectedWorkout: props.selectedWorkout,
    workoutMarkedComplete: props.workoutMarkedComplete,
    workoutSummary: props.workoutSummary,
  })
  const workoutRecordBadge = getWorkoutRecordBadge({
    workoutMarkedComplete: props.workoutMarkedComplete,
    workoutSummary: props.workoutSummary,
    hasWorkout,
  })
  const completionHint = getWorkoutCompletionHint({
    workoutMarkedComplete: props.workoutMarkedComplete,
    workoutReadyToConfirm,
    remainingSetCount,
  })
  const statusPrimaryLabel = getWorkoutPrimaryLabel({
    restDay: props.restDay,
    selectedWorkout: props.selectedWorkout,
    workoutReadyToConfirm,
    workoutMarkedComplete: props.workoutMarkedComplete,
    workoutSummary: props.workoutSummary,
  })
  const mobilePrimaryLabel = getWorkoutMobilePrimaryLabel({
    workoutMarkedComplete: props.workoutMarkedComplete,
    workoutSummary: props.workoutSummary,
  })
  useEffect(() => {
    onImmersiveModeChange?.(effectiveTrainingMode)
    return () => onImmersiveModeChange?.(false)
  }, [effectiveTrainingMode, onImmersiveModeChange])

  useEffect(() => {
    if (!effectiveTrainingMode) return
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [effectiveTrainingMode])

  return (
    <div className={`grid gap-4 ${effectiveTrainingMode ? 'pb-44 md:pb-56' : ''}`}>
      {effectiveTrainingMode ? (
        <>
          <div className="hidden md:block">
            <TrainingHeader
              workoutName={props.selectedWorkout?.workoutName ?? props.selectedTemplate.name}
              workoutSummary={props.workoutSummary}
              workoutMarkedComplete={props.workoutMarkedComplete}
              onExitTrainingMode={() => setTrainingMode(false)}
            />
          </div>
          <div className="hidden md:block">
            <TrainingTimerFloat
              elapsedSeconds={elapsedSeconds}
              restSeconds={restSeconds}
              restActive={restActive}
              restDefaultDuration={restDefaultDuration}
              autoStartRest={autoStartRest}
              workoutMarkedComplete={props.workoutMarkedComplete}
              workoutReadyToConfirm={workoutReadyToConfirm}
              canFinishWorkout={!props.workoutMarkedComplete}
              remainingSetCount={remainingSetCount}
              onExitTrainingMode={() => setTrainingMode(false)}
              onSkipRest={handleSkipRest}
              onAdjustRestDuration={handleAdjustRestDuration}
              onStartRest={handleStartRest}
              onToggleAutoStart={toggleAutoStartRest}
              onFinishWorkout={handleFinishWorkout}
            />
          </div>
          {props.selectedWorkout ? (
            <MobileCurrentExerciseView
              key={`${props.selectedWorkout.date}-${currentExerciseIndex}-${props.selectedWorkout.exercises[currentExerciseIndex]?.exerciseId ?? 'exercise'}`}
              workout={props.selectedWorkout}
              workoutSummary={props.workoutSummary}
              currentExerciseIndex={currentExerciseIndex}
              suggestedExerciseIndex={suggestedExerciseIndex}
              elapsedSeconds={elapsedSeconds}
              restSeconds={restSeconds}
              restActive={restActive}
              restDefaultDuration={restDefaultDuration}
              autoStartRest={autoStartRest}
              workoutMarkedComplete={props.workoutMarkedComplete}
              canFinishWorkout={workoutReadyToConfirm}
              hasNextIncompleteExercise={hasNextIncompleteExercise}
              completionHint={completionHint}
              previousRecordsByExerciseKey={props.previousRecordsByExerciseKey}
              onJumpToExercise={jumpToExercise}
              onJumpToNextIncomplete={jumpToNextIncomplete}
              onUpdateSet={handleUpdateSet}
              onAddSet={props.onAddSet}
              onAddExercise={props.onAddExercise}
              onStartRest={handleStartRest}
              onSkipRest={handleSkipRest}
              onAdjustRestDuration={handleAdjustRestDuration}
              onToggleAutoStart={toggleAutoStartRest}
              onExitTrainingMode={() => setTrainingMode(false)}
              onFinishWorkout={handleFinishWorkout}
            />
          ) : null}
        </>
      ) : (
        <>
          <WorkoutControlPanel
            selectedDate={props.selectedDate}
            today={props.today}
            selectedWorkout={props.selectedWorkout}
            workoutSummary={props.workoutSummary}
            selectedTemplate={props.selectedTemplate}
            selectedTemplateId={props.selectedTemplateId}
            templateOptions={props.templateOptions}
            recommendedPlanName={props.recommendedPlanName}
            workoutStatusLabel={workoutRecordBadge.label}
            workoutStatusTone={workoutRecordBadge.tone}
            syncState={props.syncState}
            restDay={props.restDay}
            onDateChange={props.onDateChange}
            onTemplateChange={props.onTemplateChange}
            onApplyTemplate={(template) => {
              props.onApplyTemplate(template)
              if (!hasWorkout && template.exercises.length > 0) setTrainingMode(true)
            }}
            onApplyRecommended={() => {
              props.onApplyRecommended()
              if (!hasWorkout) setTrainingMode(true)
            }}
            onAddExercise={() => {
              props.onAddExercise()
              if (!hasWorkout) setTrainingMode(true)
            }}
          />
          <div className="hidden md:block">
            <WorkoutStatusOverview
              restDay={props.restDay}
              selectedWorkout={props.selectedWorkout}
              workoutStatus={workoutStatus}
              workoutSummary={props.workoutSummary}
              hasIncompleteExercise={hasIncompleteExercise}
              statusPrimaryLabel={statusPrimaryLabel}
              onPrimaryAction={workoutReadyToConfirm ? handleFinishWorkout : () => setTrainingMode(true)}
              onJumpToIncomplete={scrollToNextIncomplete}
              onAddBlankWorkout={props.onAddExercise}
            />
          </div>
        </>
      )}

      {props.restDay ? (
        null
      ) : (
      <>
        {!effectiveTrainingMode && props.selectedWorkout ? (
          <WorkoutMobileActionPanel
            primaryLabel={mobilePrimaryLabel}
            completionHint={completionHint}
            onPrimaryAction={() => {
              if (!props.workoutMarkedComplete && props.workoutSummary.completionPercent === 100) {
                handleFinishWorkout()
                return
              }
              setTrainingMode(true)
            }}
          />
        ) : null}
      <section className={`grid gap-4 ${effectiveTrainingMode ? 'hidden md:block' : 'hidden md:grid'} ${!props.selectedWorkout ? 'hidden md:grid' : ''}`}>
        <WorkoutRecordToolbar
          badgeLabel={workoutRecordBadge.label}
          badgeTone={workoutRecordBadge.tone}
          hasWorkout={hasWorkout}
          effectiveTrainingMode={effectiveTrainingMode}
          showOnlyUnfinished={props.showOnlyUnfinishedExercises}
          hasIncompleteExercise={hasIncompleteExercise}
          collapseMode={collapseMode}
          onToggleTrainingMode={() => setTrainingMode((value) => !value)}
          onAddExercise={props.onAddExercise}
          onShowOnlyUnfinishedChange={setShowOnlyUnfinished}
          onCycleCollapseMode={() => setCollapseMode((prev) => (prev === 'auto' ? 'all' : prev === 'all' ? 'none' : 'auto'))}
        />

        {props.selectedWorkout ? (
          <div className="mt-5 grid gap-4">
            <ExerciseQuickJumpStrip
              exercises={props.selectedWorkout.exercises}
              visibleIndexes={props.visibleWorkoutExercises.map((entry) => entry.exerciseIndex)}
            />

            {props.visibleWorkoutExercises.map(({ exercise, exerciseIndex }) => (
              <ExerciseRecordCard
                key={`${exercise.exerciseId}-${exerciseIndex}`}
                exercise={exercise}
                exerciseIndex={exerciseIndex}
                previousRecord={props.previousRecordsByExerciseKey.get(`${exercise.exerciseId}::${exercise.name.trim()}`)}
                onUpdateExercise={props.onUpdateExercise}
                onUpdateSet={handleUpdateSet}
                onAddSet={props.onAddSet}
                onDeleteLastSet={props.onDeleteLastSet}
                onRebuildSets={props.onRebuildSets}
                onDeleteExercise={props.onDeleteExercise}
                onMoveExerciseUp={props.onMoveExerciseUp}
                onMoveExerciseDown={props.onMoveExerciseDown}
                onFillEmptySets={props.onFillEmptySets}
                forceCollapsed={collapseMode === 'auto' ? undefined : collapseMode === 'all'}
                compact={effectiveTrainingMode}
              />
            ))}

            {props.visibleWorkoutExercises.length === 0 ? (
              <EmptyState
                title="当前筛选下没有未完成动作"
                message="可以新增动作，或切回「全部动作」继续查看。"
                actions={<Button onClick={props.onAddExercise}>新增动作</Button>}
              />
            ) : null}

            <WorkoutMoreActionsPanel
              selectedWorkout={props.selectedWorkout}
              onUpdateWorkout={props.onUpdateWorkout}
              onAddExercise={props.onAddExercise}
              onSaveAsTemplate={props.onSaveAsTemplate}
              onExportSelectedWorkout={props.onExportSelectedWorkout}
            />
          </div>
        ) : (
          <EmptyState
            title="还没有这一天的训练记录"
            message="在上方选择计划开始，或点「空白训练」手动添加动作。"
            actions={<Button onClick={props.onAddExercise}>空白训练</Button>}
          />
        )}
      </section>
      </>
      )}

      {effectiveTrainingMode || props.restDay ? null : (
        <div>
          <WorkoutTemplateManager
            builtinTemplates={props.builtinTemplates}
            templates={props.workoutTemplates}
            selectedWorkout={props.selectedWorkout}
            onCreateTemplate={props.onCreateTemplate}
            onSaveCurrent={props.onSaveAsTemplate}
            onUpdateTemplate={props.onUpdateTemplate}
            onUpdateTemplateExercise={props.onUpdateTemplateExercise}
            onAddTemplateExercise={props.onAddTemplateExercise}
            onDeleteTemplateExercise={props.onDeleteTemplateExercise}
            onApplyTemplate={(template) => props.onApplyTemplate(templateToOption(template))}
            onDeleteTemplate={props.onDeleteTemplate}
            onExportToken={props.onExportTemplateToken}
            onImportToken={props.onImportTemplateToken}
          />
        </div>
      )}

      {completionToast && (
        <div className="fixed left-1/2 top-20 z-50 min-w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 animate-[slideDown_0.3s_ease-out] rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center dark:border-emerald-700/40 dark:bg-emerald-900/90">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{completionToast}</p>
          {completionToast.includes('同步') ? (
            <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-200">记录页训练完成度已更新为 100%</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
