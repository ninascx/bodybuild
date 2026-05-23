import type { ExercisePlan, WorkoutTemplate } from '../../types'
import { Badge, Button, Field, TextInput } from '../ui'

export function CustomTemplateCard({
  template,
  onUpdateTemplate,
  onUpdateTemplateExercise,
  onAddTemplateExercise,
  onDeleteTemplateExercise,
  onApplyTemplate,
  onDeleteTemplate,
}: {
  template: WorkoutTemplate
  onUpdateTemplate: (templateId: string, patch: Partial<WorkoutTemplate>) => void
  onUpdateTemplateExercise: (templateId: string, exerciseIndex: number, patch: Partial<ExercisePlan>) => void
  onAddTemplateExercise: (templateId: string) => void
  onDeleteTemplateExercise: (templateId: string, exerciseIndex: number) => void
  onApplyTemplate: (template: WorkoutTemplate) => void
  onDeleteTemplate: (templateId: string) => void
}) {
  return (
    <details className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{template.name}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {template.focus} · {template.exercises.length} 个动作 · {template.category}
          </p>
        </div>
        <Badge tone="warning">自定义</Badge>
      </summary>
      <div className="border-t border-slate-200 dark:border-slate-700 p-3">
        <div className="grid gap-3 lg:grid-cols-3">
          <Field label="模板名称">
            <TextInput value={template.name} onChange={(event) => onUpdateTemplate(template.id, { name: event.target.value })} />
          </Field>
          <Field label="重点">
            <TextInput value={template.focus} onChange={(event) => onUpdateTemplate(template.id, { focus: event.target.value })} />
          </Field>
          <Field label="分类">
            <TextInput value={template.category} onChange={(event) => onUpdateTemplate(template.id, { category: event.target.value })} />
          </Field>
        </div>

        <div className="mt-3 grid gap-1.5">
          <div className="hidden gap-2 px-2 text-xs text-slate-400 dark:text-slate-500 lg:grid lg:grid-cols-[2rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_2.25rem]">
            <span>#</span>
            <span>动作名称</span>
            <span>目标组次</span>
            <span>备注（可选）</span>
            <span aria-hidden="true" />
          </div>
          {template.exercises.map((exercise, exerciseIndex) => (
            <div
              key={`${template.id}-${exercise.id}-${exerciseIndex}`}
              className="grid gap-1.5 rounded-md bg-slate-50 px-2 py-1.5 dark:bg-slate-800 lg:grid-cols-[2rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_2.25rem] lg:items-center lg:gap-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                {exerciseIndex + 1}
              </div>
              <TextInput
                aria-label="动作名称"
                placeholder="动作名称"
                value={exercise.name}
                onChange={(event) => onUpdateTemplateExercise(template.id, exerciseIndex, { name: event.target.value })}
              />
              <TextInput
                aria-label="目标组次"
                placeholder="3 组 × 8-12 次"
                value={exercise.prescription}
                onChange={(event) => onUpdateTemplateExercise(template.id, exerciseIndex, { prescription: event.target.value })}
              />
              <TextInput
                aria-label="备注"
                placeholder="备注（可选）"
                value={exercise.note ?? ''}
                onChange={(event) => onUpdateTemplateExercise(template.id, exerciseIndex, { note: event.target.value })}
              />
              <button
                type="button"
                onClick={() => onDeleteTemplateExercise(template.id, exerciseIndex)}
                disabled={template.exercises.length <= 1}
                aria-label={`删除动作 ${exercise.name || exerciseIndex + 1}`}
                title="删除动作"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => onAddTemplateExercise(template.id)}>添加动作</Button>
          <Button variant="secondary" onClick={() => onApplyTemplate(template)} disabled={template.exercises.length === 0}>填入当天</Button>
          <Button variant="ghost" onClick={() => onDeleteTemplate(template.id)}>删除模板</Button>
        </div>
      </div>
    </details>
  )
}
