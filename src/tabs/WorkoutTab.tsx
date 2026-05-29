import {
  Badge,
  Button,
  EmptyState,
  Field,
  InsightCard,
  MetricGrid,
  SectionHeader,
  StatusHero,
  TextArea,
  TextInput,
} from '../components/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ExerciseRecordCard } from '../components/workout/ExerciseRecordCard'
import { ExerciseQuickJumpStrip } from '../components/workout/ExerciseQuickJumpStrip'
import { MobileCurrentExerciseView } from '../components/workout/MobileCurrentExerciseView'
import { WorkoutControlPanel } from '../components/workout/WorkoutControlPanel'
import { WorkoutTemplateManager } from '../components/workout/WorkoutTemplateManager'
import { TrainingHeader, TrainingTimerFloat } from '../components/workout/TrainingHeader'
import type { ExerciseLog, ExercisePlan, ExerciseSetLog, WorkoutLog, WorkoutTemplate } from '../types'
import type { PreviousExerciseRecord } from '../lib/metrics'
import type { SyncState } from '../lib/storage'
import type { WorkoutSummary, WorkoutTemplateOption } from '../lib/workout'
import { isSetComplete } from '../lib/workout'
import { useTrainingTimer } from '../hooks/useTrainingTimer'

function templateToOption(template: WorkoutTemplate): WorkoutTemplateOption {
  return {
    id: template.id,
    name: template.name,
    focus: template.focus,
    source: template.isBuiltin ? 'builtin' : 'custom',
    exercises: template.exercises,
  }
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
}

export function WorkoutTab(props: WorkoutTabProps) {
  const [collapseMode, setCollapseMode] = useState<'auto' | 'all' | 'none'>('auto')
  const [trainingMode, setTrainingMode] = useState(false)
  const effectiveTrainingMode = trainingMode && Boolean(props.selectedWorkout) && !props.restDay
  const hasWorkout = Boolean(props.selectedWorkout)
  const selectedWorkout = props.selectedWorkout
  const hasIncompleteExercise = selectedWorkout?.exercises.some((exercise) => !isExerciseComplete(exercise)) ?? false
  const remainingSetCount = Math.max(props.workoutSummary.totalSets - props.workoutSummary.filledSets, 0)
  const onUpdateSet = props.onUpdateSet
  const selectedWorkoutRef = useRef<WorkoutLog | undefined>(selectedWorkout)
  const [completionToast, setCompletionToast] = useState<string | null>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [suggestedExerciseIndex, setSuggestedExerciseIndex] = useState<number | null>(null)
  const hasNextIncompleteExercise = nextIncompleteExerciseIndex(selectedWorkout, currentExerciseIndex) !== null

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
  } = useTrainingTimer(props.selectedDate, effectiveTrainingMode)

  const handleSkipRest = useCallback(() => {
    stopRestTimer()
  }, [stopRestTimer])

  const handleStartRest = useCallback(() => {
    startRestTimer()
  }, [startRestTimer])

  const handleFinishWorkout = useCallback(() => {
    stopRestTimer()
    props.onFinishWorkout()
    setTrainingMode(false)
    setCompletionToast('训练已同步到今日记录')
  }, [props, stopRestTimer])

  const handleAdjustRestDuration = useCallback((delta: number) => {
    adjustRestDuration(delta)
  }, [adjustRestDuration])

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
    if (props.showOnlyUnfinishedExercises !== nextValue) {
      props.onToggleShowUnfinished()
    }
  }, [props])

  useEffect(() => {
    if (!hasIncompleteExercise && props.showOnlyUnfinishedExercises) {
      props.onToggleShowUnfinished()
    }
  }, [hasIncompleteExercise, props])

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

  const workoutStatus =
    props.restDay
      ? {
          title: '今天休息',
          message: '训练页保持安静，重点放在睡眠、步数和营养执行。',
          tone: 'neutral' as const,
        }
      : !props.selectedWorkout
        ? {
            title: '准备开始训练',
            message: '先选择计划或创建空白训练。开始后手机端会切换到当前动作优先视图。',
            tone: 'neutral' as const,
          }
        : props.workoutMarkedComplete
          ? {
              title: '训练已完成',
              message: '本次训练已同步到今日记录，可以补充备注或保存为模板。',
              tone: 'positive' as const,
            }
          : props.workoutSummary.completionPercent === 100
            ? {
                title: '动作已填满',
                message: '动作记录已经完整，点确认完成后会同步到今日记录。',
                tone: 'positive' as const,
              }
          : props.workoutSummary.filledSets > 0
            ? {
                title: '训练进行中',
                message: '继续补完未完成组；手机上建议进入训练模式，用底部操作区完成当前动作。',
                tone: 'warning' as const,
              }
            : {
                title: '训练待开始',
                message: '动作已经准备好。先进入训练模式，再沿用上一组或上次记录快速录入。',
                tone: 'neutral' as const,
              }

  const workoutRecordBadge =
    props.workoutMarkedComplete
      ? { label: '已完成', tone: 'positive' as const }
      : props.workoutSummary.completionPercent === 100
        ? { label: '动作已满', tone: 'positive' as const }
        : props.workoutSummary.filledSets > 0
          ? { label: '进行中', tone: 'warning' as const }
          : hasWorkout
            ? { label: '待开始', tone: 'neutral' as const }
            : { label: '未开始', tone: 'neutral' as const }

  const workoutReadyToConfirm = !props.workoutMarkedComplete && props.workoutSummary.completionPercent === 100
  const completionHint = props.workoutMarkedComplete
    ? '本次训练已同步到今日记录。'
    : workoutReadyToConfirm
      ? '所有组已填完，点确认完成即可同步到今日记录。'
      : remainingSetCount > 0
        ? `还剩 ${remainingSetCount} 组需填重量和次数。`
        : '先记录一组训练。'
  const statusPrimaryAction = props.restDay || !props.selectedWorkout ? null : (
    <Button onClick={workoutReadyToConfirm ? handleFinishWorkout : () => setTrainingMode(true)}>
      {workoutReadyToConfirm
        ? '确认完成'
        : props.workoutMarkedComplete
          ? '查看训练'
        : props.workoutSummary.filledSets > 0
          ? '继续训练'
          : '开始训练'}
    </Button>
  )

  return (
    <div className={`grid gap-4 ${effectiveTrainingMode ? 'pb-72 md:pb-4' : ''}`}>
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
          <StatusHero
            eyebrow="训练状态"
            title={workoutStatus.title}
            message={props.restDay ? '已在「记录」页标记为不训练。专注吃好、睡好、走走。' : workoutStatus.message}
            tone={workoutStatus.tone}
            actions={
              props.restDay ? null : (
                <div className="flex flex-wrap gap-2">
                  {statusPrimaryAction}
                  {props.selectedWorkout && hasIncompleteExercise ? (
                    <Button variant="secondary" onClick={scrollToNextIncomplete}>
                      跳到未完成
                    </Button>
                  ) : !props.selectedWorkout ? (
                    <Button variant="secondary" onClick={props.onAddExercise}>
                      空白训练
                    </Button>
                  ) : null}
                </div>
              )
            }
            meta={
              !props.restDay && props.selectedWorkout ? (
                <MetricGrid className="lg:grid-cols-4">
                  <InsightCard title="动作" value={props.workoutSummary.exerciseCount} message="个" tone="neutral" />
                  <InsightCard title="完成组" value={`${props.workoutSummary.filledSets}/${props.workoutSummary.totalSets}`} tone={props.workoutSummary.filledSets > 0 ? 'positive' : 'neutral'} />
                  <InsightCard title="完成率" value={`${props.workoutSummary.completionPercent}%`} tone={props.workoutSummary.completionPercent === 100 ? 'positive' : 'warning'} />
                  <InsightCard title="训练量" value={`${Math.round(props.workoutSummary.totalVolume)} kg`} tone="neutral" />
                </MetricGrid>
              ) : null
            }
          />
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
            onApplyTemplate={props.onApplyTemplate}
            onApplyRecommended={props.onApplyRecommended}
            onAddExercise={props.onAddExercise}
          />
        </>
      )}

      {props.restDay ? (
        null
      ) : (
      <section className={`grid gap-4 ${effectiveTrainingMode ? 'hidden md:block' : ''}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            title="当天动作记录"
            description="先记组数和表现；动作名称、目标和备注收在每张卡的编辑区。"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={workoutRecordBadge.tone}>{workoutRecordBadge.label}</Badge>
            {hasWorkout ? (
              <Button variant={effectiveTrainingMode ? 'primary' : 'secondary'} className="px-3" onClick={() => setTrainingMode((value) => !value)}>
                {effectiveTrainingMode ? '训练模式中' : '训练模式'}
              </Button>
            ) : null}
            {hasWorkout ? (
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOnlyUnfinished(false)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    !props.showOnlyUnfinishedExercises
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  全部动作
                </button>
                <button
                  type="button"
                  onClick={() => setShowOnlyUnfinished(true)}
                  disabled={!hasIncompleteExercise && !props.showOnlyUnfinishedExercises}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    props.showOnlyUnfinishedExercises
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  只看未完成
                </button>
              </div>
            ) : null}
            {hasWorkout ? (
              <button
                type="button"
                onClick={() => setCollapseMode((prev) => (prev === 'auto' ? 'all' : prev === 'all' ? 'none' : 'auto'))}
                className="min-h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                {collapseMode === 'auto' ? '折叠全部' : collapseMode === 'all' ? '展开全部' : '恢复自动'}
              </button>
            ) : null}
          </div>
        </div>

        {props.selectedWorkout ? (
          <div className="mt-5 grid gap-4">
            {!effectiveTrainingMode ? (
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800 sm:hidden">
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!props.workoutMarkedComplete && props.workoutSummary.completionPercent === 100) {
                      handleFinishWorkout()
                      return
                    }
                    setTrainingMode(true)
                  }}
                >
                  {props.workoutMarkedComplete || props.workoutSummary.completionPercent === 100
                    ? props.workoutMarkedComplete
                      ? '查看训练'
                      : '确认完成'
                      : props.workoutSummary.filledSets > 0
                        ? '继续训练'
                        : '开始训练'}
                </Button>
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">{completionHint}</p>
                <div className={`grid gap-2 ${hasIncompleteExercise ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <Button variant="secondary" className="px-2" onClick={() => setShowOnlyUnfinished(!props.showOnlyUnfinishedExercises)}>
                    {props.showOnlyUnfinishedExercises ? '查看全部' : '只看未完成'}
                  </Button>
                  {hasIncompleteExercise ? (
                    <Button variant="secondary" className="px-2" onClick={scrollToNextIncomplete}>
                      跳到未完成
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

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
              <EmptyState title="当前筛选下没有未完成动作" message="可以切回「全部动作」继续查看或修改。" />
            ) : null}

            <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-200">更多训练操作</summary>
              <div className="mt-3 grid gap-3">
                <Field label="训练名称">
                  <TextInput value={props.selectedWorkout.workoutName} onChange={(event) => props.onUpdateWorkout({ ...props.selectedWorkout!, workoutName: event.target.value }, false, { syncCompletion: false })} />
                </Field>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="secondary" onClick={props.onAddExercise}>新增动作</Button>
                  <Button variant="secondary" onClick={props.onSaveAsTemplate}>保存为模板</Button>
                  <Button variant="secondary" onClick={props.onExportSelectedWorkout}>导出本日训练</Button>
                </div>
              </div>
            </details>
            <Field label="训练备注">
              <TextArea value={props.selectedWorkout.notes ?? ''} onChange={(event) => props.onUpdateWorkout({ ...props.selectedWorkout!, notes: event.target.value }, false, { syncCompletion: false })} />
            </Field>
          </div>
        ) : (
          <EmptyState title="还没有这一天的训练记录" message="在上方选择计划开始，或点「空白训练」手动添加动作。" />
        )}
      </section>
      )}

      {effectiveTrainingMode || props.restDay ? null : (
        <WorkoutTemplateManager
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
      )}

      {completionToast && (
        <div className="fixed left-1/2 top-20 z-50 min-w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 animate-[slideDown_0.3s_ease-out] rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center shadow-lg dark:border-emerald-700/40 dark:bg-emerald-900/90">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{completionToast}</p>
          {completionToast.includes('同步') ? (
            <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-200">记录页训练完成度已更新为 100%</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
