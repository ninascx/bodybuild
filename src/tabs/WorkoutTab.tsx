import { Badge, Button, Card, Field, TextArea, TextInput } from '../components/ui'
import { ExerciseRecordCard } from '../components/workout/ExerciseRecordCard'
import { ExerciseQuickJumpStrip } from '../components/workout/ExerciseQuickJumpStrip'
import { WorkoutControlPanel } from '../components/workout/WorkoutControlPanel'
import { WorkoutPlanPicker } from '../components/workout/WorkoutPlanPicker'
import { WorkoutTemplateManager } from '../components/workout/WorkoutTemplateManager'
import type { ExerciseLog, ExercisePlan, WorkoutLog, WorkoutTemplate } from '../types'
import type { PreviousExerciseRecord } from '../lib/metrics'
import type { WorkoutSummary, WorkoutTemplateOption } from '../lib/workout'

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
  onSaveAsTemplate: () => void
  onCreateTemplate: () => void
  onUpdateTemplate: (id: string, patch: Partial<WorkoutTemplate>) => void
  onUpdateTemplateExercise: (templateId: string, exerciseIndex: number, patch: Partial<ExercisePlan>) => void
  onAddTemplateExercise: (templateId: string) => void
  onDeleteTemplateExercise: (templateId: string, exerciseIndex: number) => void
  onDeleteTemplate: (id: string) => void
}

export function WorkoutTab(props: WorkoutTabProps) {
  const templateToOption = (template: WorkoutTemplate): WorkoutTemplateOption => ({
    id: template.id,
    name: template.name,
    focus: template.focus,
    source: template.isBuiltin ? 'builtin' : 'custom',
    exercises: template.exercises,
  })

  return (
    <div className="grid gap-4">
      <WorkoutControlPanel
        selectedDate={props.selectedDate}
        today={props.today}
        selectedWorkout={props.selectedWorkout}
        workoutSummary={props.workoutSummary}
        selectedTemplate={props.selectedTemplate}
        onDateChange={props.onDateChange}
        onPrimaryAction={() => {
          if (props.selectedWorkout) props.onAddExercise()
          else props.onApplyTemplate(props.selectedTemplate)
        }}
        onBlankWorkout={props.onAddExercise}
      />

      <WorkoutPlanPicker
        selectedDate={props.selectedDate}
        selectedTemplateId={props.selectedTemplateId}
        selectedTemplate={props.selectedTemplate}
        templateOptions={props.templateOptions}
        hasWorkout={Boolean(props.selectedWorkout)}
        onTemplateChange={props.onTemplateChange}
        onApplySelected={() => props.onApplyTemplate(props.selectedTemplate)}
        onApplyRecommended={props.onApplyRecommended}
      />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">当天动作记录</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">先记组数和表现；动作名称、目标和备注放在每张卡的编辑区。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {props.selectedWorkout ? <Badge tone="positive">已记录</Badge> : <Badge tone="neutral">未开始</Badge>}
            {props.selectedWorkout ? (
              <button
                type="button"
                onClick={props.onToggleShowUnfinished}
                className={`min-h-10 rounded-md border px-3 text-sm font-medium transition ${
                  props.showOnlyUnfinishedExercises
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {props.showOnlyUnfinishedExercises ? '显示全部动作' : '只看未填写'}
              </button>
            ) : null}
          </div>
        </div>

        {props.selectedWorkout ? (
          <div className="mt-5 grid gap-4">
            <Field label="训练名称">
              <TextInput value={props.selectedWorkout.workoutName} onChange={(event) => props.onUpdateWorkout({ ...props.selectedWorkout!, workoutName: event.target.value })} />
            </Field>

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
                onUpdateSet={props.onUpdateSet}
                onAddSet={props.onAddSet}
                onDeleteLastSet={props.onDeleteLastSet}
                onRebuildSets={props.onRebuildSets}
                onDeleteExercise={props.onDeleteExercise}
              />
            ))}

            {props.visibleWorkoutExercises.length === 0 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-100">
                当前筛选下没有未填写动作。可以切回"显示全部动作"继续查看或修改。
              </div>
            ) : null}

            <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 p-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">训练操作</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button onClick={props.onAddExercise}>新增当天动作</Button>
                <Button variant="secondary" onClick={props.onSaveAsTemplate}>保存为模板</Button>
              </div>
            </div>
            <Field label="训练备注">
              <TextArea value={props.selectedWorkout.notes ?? ''} onChange={(event) => props.onUpdateWorkout({ ...props.selectedWorkout!, notes: event.target.value })} />
            </Field>
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-600 dark:bg-slate-800">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">还没有这一天的训练记录</p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">选择计划开始会生成完整动作列表；临时改练也可以直接新增空白动作。</p>
            <div className="mt-4 grid gap-2 sm:mx-auto sm:max-w-md sm:grid-cols-2">
              <Button onClick={() => props.onApplyTemplate(props.selectedTemplate)}>选择计划开始</Button>
              <Button variant="secondary" onClick={props.onAddExercise}>新增空白训练</Button>
            </div>
          </div>
        )}
      </Card>

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
    </div>
  )
}
