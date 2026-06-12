import {
  Button,
  EmptyState,
} from '../components/ui'
import { useEffect, useState } from 'react'
import { ExerciseRecordCard } from '../components/workout/ExerciseRecordCard'
import { ExerciseQuickJumpStrip } from '../components/workout/ExerciseQuickJumpStrip'
import { MobileCurrentExerciseView } from '../components/workout/MobileCurrentExerciseView'
import { WorkoutControlPanel } from '../components/workout/WorkoutControlPanel'
import { WorkoutDesktopCommandRail } from '../components/workout/WorkoutDesktopCommandRail'
import { WorkoutTemplateManager } from '../components/workout/WorkoutTemplateManager'
import { TrainingHeader, TrainingTimerFloat } from '../components/workout/TrainingHeader'
import { WorkoutDesktopSessionRail } from '../components/workout/WorkoutDesktopSessionRail'
import { WorkoutPlanPreview } from '../components/workout/WorkoutPlanPreview'
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
import { getDayKey } from '../lib/dates'
import type { CardioPlan, ExerciseLog, ExercisePlan, WorkoutLog, WorkoutTemplate } from '../types'
import type { PreviousExerciseRecord } from '../lib/metrics'
import type { SyncState } from '../lib/storage'
import type { WorkoutSummary, WorkoutTemplateOption } from '../lib/workout'
import type { TodayTaskPlan } from '../lib/productFlow'

function templateToOption(template: WorkoutTemplate): WorkoutTemplateOption {
  return {
    id: template.id,
    name: template.name,
    focus: template.focus,
    source: template.isBuiltin ? 'builtin' : 'custom',
    exercises: template.exercises,
    cardio: template.cardio,
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
  taskPlan: TodayTaskPlan
  restDay: boolean
  workoutMarkedComplete: boolean
  xunjiSyncPending: boolean
  onDateChange: (date: string) => void
  onTemplateChange: (id: string) => void
  onApplyTemplate: (template: WorkoutTemplateOption) => void
  onApplyRecommended: () => void
  onSyncFromXunji: () => void
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
  onUpdateTemplateCardio: (templateId: string, cardioIndex: number, patch: Partial<CardioPlan>) => void
  onAddTemplateCardio: (templateId: string) => void
  onDeleteTemplateCardio: (templateId: string, cardioIndex: number) => void
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
  const recommendedId = `builtin-${getDayKey(props.selectedDate)}`
  const canStartSelectedTemplate = Boolean(
    props.selectedTemplate && (props.selectedTemplate.exercises.length > 0 || (props.selectedTemplate.cardio ?? []).length > 0),
  )
  const startSelectedTemplate = () => {
    if (!props.selectedTemplate || !canStartSelectedTemplate) return
    props.onApplyTemplate(props.selectedTemplate)
    setTrainingMode(true)
  }
  const startBlankWorkout = () => {
    props.onAddExercise()
    setTrainingMode(true)
  }
  const handleDesktopPrimaryAction = () => {
    if (!props.selectedWorkout) {
      startSelectedTemplate()
      return
    }
    if (workoutReadyToConfirm) {
      handleFinishWorkout()
      return
    }
    setTrainingMode(true)
  }
  useEffect(() => {
    onImmersiveModeChange?.(effectiveTrainingMode)
    return () => onImmersiveModeChange?.(false)
  }, [effectiveTrainingMode, onImmersiveModeChange])

  useEffect(() => {
    if (!effectiveTrainingMode) return
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [effectiveTrainingMode])

  return (
    <div className={`grid gap-4 ${effectiveTrainingMode ? 'pb-44 md:pb-56 lg:pb-0' : ''}`}>
      {effectiveTrainingMode ? (
        <>
          <div className="hidden md:block lg:hidden">
            <TrainingHeader
              workoutName={props.selectedWorkout?.workoutName ?? props.selectedTemplate.name}
              workoutSummary={props.workoutSummary}
              workoutMarkedComplete={props.workoutMarkedComplete}
              onExitTrainingMode={() => setTrainingMode(false)}
            />
          </div>
          <div className="hidden md:block lg:hidden">
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
              onDeleteLastSet={props.onDeleteLastSet}
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
          <div className="lg:hidden">
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
              taskPlan={props.taskPlan}
              restDay={props.restDay}
              xunjiSyncPending={props.xunjiSyncPending}
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
              onSyncFromXunji={props.onSyncFromXunji}
            />
          </div>
          <div className="hidden md:block lg:hidden">
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

      <section className="hidden gap-4 lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)_20rem] lg:items-start">
        <WorkoutDesktopCommandRail
          selectedDate={props.selectedDate}
          today={props.today}
          selectedWorkout={props.selectedWorkout}
          selectedTemplate={props.selectedTemplate}
          selectedTemplateId={props.selectedTemplateId}
          templateOptions={props.templateOptions}
          recommendedPlanName={props.recommendedPlanName}
          taskPlan={props.taskPlan}
          restDay={props.restDay}
          onDateChange={props.onDateChange}
          onTemplateChange={props.onTemplateChange}
          onApplyTemplate={props.onApplyTemplate}
          onApplyRecommended={props.onApplyRecommended}
        />

        <main className="min-w-0">
          {props.restDay ? (
            <EmptyState
              title="今天休息"
              message="训练页保持安静。需要补训练时，可以先在记录页取消休息状态。"
              compact
            />
          ) : props.selectedWorkout ? (
            <>
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
                onSyncFromXunji={props.onSyncFromXunji}
                xunjiSyncPending={props.xunjiSyncPending}
                onShowOnlyUnfinishedChange={setShowOnlyUnfinished}
                onCycleCollapseMode={() => setCollapseMode((prev) => (prev === 'auto' ? 'all' : prev === 'all' ? 'none' : 'auto'))}
                showTrainingModeAction={false}
                showSyncAction={false}
              />

              <div className="mt-4 grid gap-4">
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
            </>
          ) : (
            <div className="grid gap-4">
              <EmptyState
                title="还没有这一天的训练记录"
                message="左侧确认训练计划后，从右侧会话栏开始；需要完全手动安排时用空白训练。"
                compact
              />
              {props.selectedTemplate ? (
                <WorkoutPlanPreview
                  template={props.selectedTemplate}
                  recommendedId={recommendedId}
                />
              ) : null}
            </div>
          )}
        </main>

        <WorkoutDesktopSessionRail
          restDay={props.restDay}
          selectedWorkout={props.selectedWorkout}
          workoutSummary={props.workoutSummary}
          elapsedSeconds={elapsedSeconds}
          restSeconds={restSeconds}
          restActive={restActive}
          restDefaultDuration={restDefaultDuration}
          autoStartRest={autoStartRest}
          workoutMarkedComplete={props.workoutMarkedComplete}
          workoutReadyToConfirm={workoutReadyToConfirm}
          trainingMode={effectiveTrainingMode}
          remainingSetCount={remainingSetCount}
          currentExerciseIndex={currentExerciseIndex}
          suggestedExerciseIndex={suggestedExerciseIndex ?? currentExerciseIndex}
          hasNextIncompleteExercise={hasNextIncompleteExercise}
          statusPrimaryLabel={statusPrimaryLabel}
          completionHint={props.selectedWorkout ? completionHint : '选择计划后从这里开始训练。'}
          syncState={props.syncState}
          xunjiSyncPending={props.xunjiSyncPending}
          primaryDisabled={!props.selectedWorkout && !canStartSelectedTemplate}
          onPrimaryAction={handleDesktopPrimaryAction}
          onCreateBlankWorkout={startBlankWorkout}
          onSyncFromXunji={props.onSyncFromXunji}
          onJumpToCurrent={() => jumpToExercise(currentExerciseIndex)}
          onJumpToNextIncomplete={jumpToNextIncomplete}
          onStartRest={handleStartRest}
          onSkipRest={handleSkipRest}
          onAdjustRestDuration={handleAdjustRestDuration}
          onToggleAutoStart={toggleAutoStartRest}
          onExitTrainingMode={() => setTrainingMode(false)}
        />
      </section>

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
      <section className={`gap-4 ${props.selectedWorkout ? 'hidden md:grid lg:hidden' : 'hidden'}`}>
        <div className="min-w-0">
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
            onSyncFromXunji={props.onSyncFromXunji}
            xunjiSyncPending={props.xunjiSyncPending}
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
        </div>

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
            onUpdateTemplateCardio={props.onUpdateTemplateCardio}
            onAddTemplateCardio={props.onAddTemplateCardio}
            onDeleteTemplateCardio={props.onDeleteTemplateCardio}
            onApplyTemplate={(template) => props.onApplyTemplate(templateToOption(template))}
            onDeleteTemplate={props.onDeleteTemplate}
            onExportToken={props.onExportTemplateToken}
            onImportToken={props.onImportTemplateToken}
          />
        </div>
      )}

      {completionToast && (
        <div className="motion-feedback fixed left-1/2 top-20 z-50 min-w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center dark:border-emerald-700/40 dark:bg-emerald-900/90">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{completionToast}</p>
          {completionToast.includes('同步') ? (
            <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-200">记录页训练完成度已更新为 100%</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
