import type { ExercisePlan, WorkoutLog, WorkoutTemplate } from '../../types'
import { Button } from '../ui'
import { CustomTemplateCard } from './CustomTemplateCard'

export function WorkoutTemplateManager({
  templates,
  selectedWorkout,
  onCreateTemplate,
  onSaveCurrent,
  onUpdateTemplate,
  onUpdateTemplateExercise,
  onAddTemplateExercise,
  onDeleteTemplateExercise,
  onApplyTemplate,
  onDeleteTemplate,
}: {
  templates: WorkoutTemplate[]
  selectedWorkout: WorkoutLog | undefined
  onCreateTemplate: () => void
  onSaveCurrent: () => void
  onUpdateTemplate: (templateId: string, patch: Partial<WorkoutTemplate>) => void
  onUpdateTemplateExercise: (templateId: string, exerciseIndex: number, patch: Partial<ExercisePlan>) => void
  onAddTemplateExercise: (templateId: string) => void
  onDeleteTemplateExercise: (templateId: string, exerciseIndex: number) => void
  onApplyTemplate: (template: WorkoutTemplate) => void
  onDeleteTemplate: (templateId: string) => void
}) {
  const customTemplates = templates.filter((t) => !t.isBuiltin)
  const builtinTemplates = templates.filter((t) => t.isBuiltin)

  return (
    <details className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-200">模板管理 · {customTemplates.length} 个自定义模板</summary>
      <div className="mt-4 grid gap-4">
        <div className="grid gap-2 sm:grid-cols-[auto_auto] sm:justify-start">
          <Button onClick={onCreateTemplate}>新建模板</Button>
          <Button variant="secondary" onClick={onSaveCurrent} disabled={!selectedWorkout || selectedWorkout.exercises.length === 0}>
            从当前训练保存为模板
          </Button>
        </div>

        {builtinTemplates.length > 0 ? (
          <details className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-200">内置计划 · {builtinTemplates.length} 个</summary>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              内置计划只展示与"填入当天"。如需修改，请用"从当前训练保存为模板"或"新建模板"创建一份自己的副本。
            </p>
            <div className="mt-3 grid gap-2">
              {builtinTemplates.map((template) => (
                <div key={template.id} className="rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{template.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{template.focus} · {template.exercises.length} 个动作</p>
                    </div>
                    <Button variant="secondary" className="px-3" onClick={() => onApplyTemplate(template)} disabled={template.exercises.length === 0}>填入当天</Button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {customTemplates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">还没有自定义模板。</p>
        ) : null}

        {customTemplates.map((template) => (
          <CustomTemplateCard
            key={template.id}
            template={template}
            onUpdateTemplate={onUpdateTemplate}
            onUpdateTemplateExercise={onUpdateTemplateExercise}
            onAddTemplateExercise={onAddTemplateExercise}
            onDeleteTemplateExercise={onDeleteTemplateExercise}
            onApplyTemplate={onApplyTemplate}
            onDeleteTemplate={onDeleteTemplate}
          />
        ))}
      </div>
    </details>
  )
}
