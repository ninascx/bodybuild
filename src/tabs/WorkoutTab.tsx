import { Badge, Button, Card, Field, TextArea, TextInput } from '../components/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ExerciseRecordCard } from '../components/workout/ExerciseRecordCard'
import { ExerciseQuickJumpStrip } from '../components/workout/ExerciseQuickJumpStrip'
import { WorkoutControlPanel } from '../components/workout/WorkoutControlPanel'
import { WorkoutTemplateManager } from '../components/workout/WorkoutTemplateManager'
import { TrainingHeader } from '../components/workout/TrainingHeader'
import type { ExerciseLog, ExercisePlan, ExerciseSetLog, WorkoutLog, WorkoutTemplate } from '../types'
import type { PreviousExerciseRecord } from '../lib/metrics'
import type { SyncState } from '../lib/storage'
import type { WorkoutSummary, WorkoutTemplateOption } from '../lib/workout'
import { isSetComplete } from '../lib/workout'

type WorkoutTabProps = {
  selectedDate: string
  today: string
  selectedWorkout: WorkoutLog | undefined
  selectedTemplate: WorkoutTemplateOption
  selectedTemplateId: string
  templateOptions: WorkoutTemplateOption[]
  workoutSummary: WorkoutSummary
  visibleWorkoutExercises: Array<{ exercise: ExerciseLog; exerciseIndex: number }>
  previousRecordsByExerciseKey: Map<string, PreviousExerciseRecord | undefined>
  showOnlyUnfinishedExercises: boolean
  workoutTemplates: WorkoutTemplate[]
  syncState: SyncState
  restDay: boolean
  onDateChange: (date: string) => void
  onTemplateChange: (id: string) => void
  onApplyTemplate: (template: WorkoutTemplateOption) => void
  onApplyRecommended: () => void
  onToggleShowUnfinished: () => void
  onUpdateWorkout: (nextLog: WorkoutLog, immediate?: boolean) => void
  onUpdateExercise: (exerciseIndex: number, patch: Partial<ExerciseLog>) => void
  onUpdateSet: (exerciseIndex: number, setIndex: number, patch: Partial<ExerciseLog['sets'][0]>) => void
  onAddSet: (exerciseIndex: number) => void
  onDeleteLastSet: (exerciseIndex: number) => void
  onRebuildSets: (exerciseIndex: number) => void
  onDeleteExercise: (exerciseIndex: number) => void
  onAddExercise: () => void
  onFillEmptySets: (exerciseIndex: number) => void
  onApplyPreviousByIndex: (exerciseIndex: number) => void
  onSaveAsTemplate: () => void
  onCreateTemplate: () => void
  onUpdateTemplate: (id: string, patch: Partial<WorkoutTemplate>) => void
  onUpdateTemplateExercise: (templateId: string, exerciseIndex: number, patch: Partial<ExercisePlan>) => void
  onAddTemplateExercise: (templateId: string) => void
  onDeleteTemplateExercise: (templateId: string, exerciseIndex: number) => void
  onDeleteTemplate: (id: string) => void
}

export function WorkoutTab(props: WorkoutTabProps) {
  const [collapseMode, setCollapseMode] = useState<'auto' | 'all' | 'none'>('auto')
  const [trainingMode, setTrainingMode] = useState(false)
  const effectiveTrainingMode = trainingMode && Boolean(props.selectedWorkout) && !props.restDay

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [restSeconds, setRestSeconds] = useState(90)
  const [restActive, setRestActive] = useState(false)
  const [restDefaultDuration, setRestDefaultDuration] = useState(90)
  const restIntervalRef = useRef<number | null>(null)
  const elapsedIntervalRef = useRef<number | null>(null)

  const templateToOption = (template: WorkoutTemplate): WorkoutTemplateOption => ({
    id: template.id,
    name: template.name,
    focus: template.focus,
    source: template.isBuiltin ? 'builtin' : 'custom',
    exercises: template.exercises,
  })

  useEffect(() => {
    if (effectiveTrainingMode) {
      setElapsedSeconds(0)
      elapsedIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (elapsedIntervalRef.current !== null) {
        window.clearInterval(elapsedIntervalRef.current)
        elapsedIntervalRef.current = null
      }
      setElapsedSeconds(0)
    }
    return () => {
      if (elapsedIntervalRef.current !== null) {
        window.clearInterval(elapsedIntervalRef.current)
        elapsedIntervalRef.current = null
      }
    }
  }, [effectiveTrainingMode])

  useEffect(() => {
    if (restActive && restSeconds > 0) {
      restIntervalRef.current = window.setInterval(() => {
        setRestSeconds((prev) => {
          if (prev <= 1) {
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (restIntervalRef.current !== null) {
        window.clearInterval(restIntervalRef.current)
        restIntervalRef.current = null
      }
    }
  }, [restActive, restSeconds])

  const startRestTimer = useCallback(() => {
    setRestSeconds(restDefaultDuration)
    setRestActive(true)
  }, [restDefaultDuration])

  const stopRestTimer = useCallback(() => {
    setRestActive(false)
    if (restIntervalRef.current !== null) {
      window.clearInterval(restIntervalRef.current)
      restIntervalRef.current = null
    }
  }, [])

  const handleSkipRest = useCallback(() => {
    stopRestTimer()
  }, [stopRestTimer])

  const handleAdjustRestDuration = useCallback((delta: number) => {
    setRestDefaultDuration((prev) => {
      const next = prev + delta
      return Math.min(300, Math.max(15, next))
    })
    setRestSeconds((prev) => {
      const next = prev + delta
      return Math.min(300, Math.max(0, next))
    })
  }, [])

  const handleUpdateSet = useCallback(
    (exerciseIndex: number, setIndex: number, patch: Partial<ExerciseSetLog>) => {
      const set = props.selectedWorkout?.exercises[exerciseIndex]?.sets[setIndex]
      if (!set) {
        props.onUpdateSet(exerciseIndex, setIndex, patch)
        return
      }
      const wasComplete = isSetComplete(set)
      const weight = patch.weight !== undefined ? patch.weight : set.weight
      const reps = patch.reps !== undefined ? patch.reps : set.reps
      const willBeComplete = weight !== undefined && reps !== undefined

      props.onUpdateSet(exerciseIndex, setIndex, patch)

      if (!wasComplete && willBeComplete) {
        startRestTimer()
      }
    },
    [props.selectedWorkout, props.onUpdateSet, startRestTimer],
  )

  return (
    <div className="grid gap-4">
      {effectiveTrainingMode ? (
        <TrainingHeader
          workoutName={props.selectedWorkout?.workoutName ?? props.selectedTemplate.name}
          workoutSummary={props.workoutSummary}
          elapsedSeconds={elapsedSeconds}
          restSeconds={restSeconds}
          restActive={restActive}
          restDefaultDuration={restDefaultDuration}
          onExitTrainingMode={() => setTrainingMode(false)}
          onSkipRest={handleSkipRest}
          onAdjustRestDuration={handleAdjustRestDuration}
        />
      ) : (
        <WorkoutControlPanel
          selectedDate={props.selectedDate}
          today={props.today}
          selectedWorkout={props.selectedWorkout}
          workoutSummary={props.workoutSummary}
          selectedTemplate={props.selectedTemplate}
          selectedTemplateId={props.selectedTemplateId}
          templateOptions={props.templateOptions}
          syncState={props.syncState}
          restDay={props.restDay}
          onDateChange={props.onDateChange}
          onTemplateChange={props.onTemplateChange}
          onApplyTemplate={props.onApplyTemplate}
          onApplyRecommended={props.onApplyRecommended}
          onAddExercise={props.onAddExercise}
        />
      )}

      {props.restDay ? (
        <Card>
          <div className="py-8 text-center">
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">今天是休息日</p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              已在「记录」页标记为不训练。专注吃好、睡好、走走。
            </p>
          </div>
        </Card>
      ) : (
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">当天动作记录</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">先记组数和表现；动作名称、目标和备注放在每张卡的编辑区。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {props.selectedWorkout ? <Badge tone="positive">已记录</Badge> : <Badge tone="neutral">未开始</Badge>}
            {props.selectedWorkout ? (
              <Button variant={effectiveTrainingMode ? 'primary' : 'secondary'} className="px-3" onClick={() => setTrainingMode((value) => !value)}>
                {effectiveTrainingMode ? '训练模式中' : '训练模式'}
              </Button>
            ) : null}
            {props.selectedWorkout ? (
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={props.onToggleShowUnfinished}
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
                  onClick={props.onToggleShowUnfinished}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    props.showOnlyUnfinishedExercises
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  只看未填写
                </button>
              </div>
            ) : null}
            {props.selectedWorkout ? (
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
            {effectiveTrainingMode ? null : (
              <Field label="训练名称">
                <TextInput value={props.selectedWorkout.workoutName} onChange={(event) => props.onUpdateWorkout({ ...props.selectedWorkout!, workoutName: event.target.value })} />
              </Field>
            )}

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
                onFillEmptySets={props.onFillEmptySets}
                onApplyPreviousByIndex={props.onApplyPreviousByIndex}
                forceCollapsed={collapseMode === 'auto' ? undefined : collapseMode === 'all'}
                compact={effectiveTrainingMode}
              />
            ))}

            {props.visibleWorkoutExercises.length === 0 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-100">
                当前筛选下没有未填写动作。可以切回"全部动作"继续查看或修改。
              </div>
            ) : null}

            {effectiveTrainingMode ? null : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 p-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">训练操作</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Button onClick={props.onAddExercise}>新增当天动作</Button>
                  <Button variant="secondary" onClick={props.onSaveAsTemplate}>保存为模板</Button>
                </div>
              </div>
            )}
            {props.selectedWorkout && props.workoutSummary.completionPercent === 100 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-700/40 dark:bg-emerald-900/30">
                <p className="text-lg font-semibold text-emerald-950 dark:text-emerald-100">🎉 训练完成</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-md bg-white dark:bg-slate-900 p-2 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">动作</p>
                    <p className="mt-0.5 text-lg font-semibold text-slate-950 dark:text-slate-50">{props.workoutSummary.exerciseCount}</p>
                  </div>
                  <div className="rounded-md bg-white dark:bg-slate-900 p-2 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">完成组</p>
                    <p className="mt-0.5 text-lg font-semibold text-slate-950 dark:text-slate-50">{props.workoutSummary.filledSets}/{props.workoutSummary.totalSets}</p>
                  </div>
                  <div className="rounded-md bg-white dark:bg-slate-900 p-2 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">训练量</p>
                    <p className="mt-0.5 text-lg font-semibold text-slate-950 dark:text-slate-50">{Math.round(props.workoutSummary.totalVolume)} kg</p>
                  </div>
                  <div className="rounded-md bg-white dark:bg-slate-900 p-2 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">完成率</p>
                    <p className="mt-0.5 text-lg font-semibold text-slate-950 dark:text-slate-50">{props.workoutSummary.completionPercent}%</p>
                  </div>
                </div>
              </div>
            ) : null}
            <Field label="训练备注">
              <TextArea value={props.selectedWorkout.notes ?? ''} onChange={(event) => props.onUpdateWorkout({ ...props.selectedWorkout!, notes: event.target.value })} />
            </Field>
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-600 dark:bg-slate-800">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">还没有这一天的训练记录</p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">在上方选择计划开始，或点"空白训练"手动添加动作。</p>
            <div className="mt-4 grid gap-2 sm:mx-auto sm:max-w-md sm:grid-cols-2">
              <Button onClick={() => props.onApplyTemplate(props.selectedTemplate)}>选择计划开始</Button>
              <Button variant="secondary" onClick={props.onAddExercise}>新增空白训练</Button>
            </div>
          </div>
        )}
      </Card>
      )}

      {effectiveTrainingMode ? null : (
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
        />
      )}
    </div>
  )
}
