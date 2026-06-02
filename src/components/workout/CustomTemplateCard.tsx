import type { CardioPlan, ExercisePlan, WorkoutTemplate } from '../../types'
import { Badge, Button, DisclosurePanel, Field, TextInput } from '../ui'

function parsePositiveNumber(value: string): number | undefined {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export function CustomTemplateCard({
  template,
  badgeLabel = '自定义',
  badgeTone = 'warning',
  showCategory = true,
  canDelete = true,
  onUpdateTemplate,
  onUpdateTemplateExercise,
  onAddTemplateExercise,
  onDeleteTemplateExercise,
  onUpdateTemplateCardio,
  onAddTemplateCardio,
  onDeleteTemplateCardio,
  onApplyTemplate,
  onDeleteTemplate,
}: {
  template: WorkoutTemplate
  badgeLabel?: string
  badgeTone?: 'positive' | 'warning' | 'neutral' | 'danger'
  showCategory?: boolean
  canDelete?: boolean
  onUpdateTemplate: (templateId: string, patch: Partial<WorkoutTemplate>) => void
  onUpdateTemplateExercise: (templateId: string, exerciseIndex: number, patch: Partial<ExercisePlan>) => void
  onAddTemplateExercise: (templateId: string) => void
  onDeleteTemplateExercise: (templateId: string, exerciseIndex: number) => void
  onUpdateTemplateCardio: (templateId: string, cardioIndex: number, patch: Partial<CardioPlan>) => void
  onAddTemplateCardio: (templateId: string) => void
  onDeleteTemplateCardio: (templateId: string, cardioIndex: number) => void
  onApplyTemplate: (template: WorkoutTemplate) => void
  onDeleteTemplate: (templateId: string) => void
}) {
  const cardio = template.cardio ?? []
  const templateHasContent = template.exercises.length > 0 || cardio.length > 0

  return (
    <DisclosurePanel
      className="bg-white dark:bg-slate-900"
      title={(
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{template.name}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {template.focus} · {template.exercises.length} 个动作 · {cardio.length} 个有氧 · {template.category}
          </p>
        </div>
        <Badge tone={badgeTone}>{badgeLabel}</Badge>
        </div>
      )}
      summaryClassName="items-start"
      contentClassName="p-3"
    >
        <div className={`grid gap-3 ${showCategory ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          <Field label="模板名称">
            <TextInput value={template.name} onChange={(event) => onUpdateTemplate(template.id, { name: event.target.value })} />
          </Field>
          <Field label="重点">
            <TextInput value={template.focus} onChange={(event) => onUpdateTemplate(template.id, { focus: event.target.value })} />
          </Field>
          {showCategory ? (
            <Field label="分类">
              <TextInput value={template.category} onChange={(event) => onUpdateTemplate(template.id, { category: event.target.value })} />
            </Field>
          ) : null}
        </div>

        <div className="mt-3 grid gap-1.5">
          <div className="hidden gap-2 px-2 text-xs text-slate-400 dark:text-slate-500 lg:grid lg:grid-cols-[2rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_2.75rem]">
            <span>#</span>
            <span>动作名称</span>
            <span>目标组次</span>
            <span>备注（可选）</span>
            <span aria-hidden="true" />
          </div>
          {template.exercises.map((exercise, exerciseIndex) => (
            <div
              key={`${template.id}-${exercise.id}-${exerciseIndex}`}
              className="grid gap-1.5 rounded-md bg-slate-50 px-2 py-1.5 dark:bg-slate-800 lg:grid-cols-[2rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_2.75rem] lg:items-center lg:gap-2"
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
              <Button
                variant="ghost"
                onClick={() => onDeleteTemplateExercise(template.id, exerciseIndex)}
                disabled={template.exercises.length <= 1 && cardio.length === 0}
                aria-label={`删除动作 ${exercise.name || exerciseIndex + 1}`}
                title="删除动作"
                className="min-w-11 px-3 text-lg leading-none text-rose-700/70 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-200/80 dark:hover:bg-rose-900/30 dark:hover:text-rose-100"
              >
                ×
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">有氧</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">记录运动模式和计划时长。</p>
            </div>
            <Button variant="secondary" onClick={() => onAddTemplateCardio(template.id)}>添加有氧</Button>
          </div>
          {cardio.length > 0 ? (
            <div className="grid gap-1.5">
              <div className="hidden gap-2 px-2 text-xs text-slate-400 dark:text-slate-500 lg:grid lg:grid-cols-[2rem_minmax(0,1.2fr)_8rem_minmax(0,1fr)_2.75rem]">
                <span>#</span>
                <span>模式</span>
                <span>时长 min</span>
                <span>备注</span>
                <span aria-hidden="true" />
              </div>
              {cardio.map((item, cardioIndex) => (
                <div
                  key={`${template.id}-${item.id}-${cardioIndex}`}
                  className="grid gap-1.5 rounded-md bg-cyan-50 px-2 py-1.5 dark:bg-cyan-950/30 lg:grid-cols-[2rem_minmax(0,1.2fr)_8rem_minmax(0,1fr)_2.75rem] lg:items-center lg:gap-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-100 text-xs font-semibold text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-100">
                    {cardioIndex + 1}
                  </div>
                  <TextInput
                    aria-label="有氧模式"
                    placeholder="跑步机 / 椭圆机 / 单车"
                    value={item.mode}
                    onChange={(event) => onUpdateTemplateCardio(template.id, cardioIndex, { mode: event.target.value })}
                  />
                  <TextInput
                    aria-label="有氧时长"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="20"
                    value={item.durationMin ?? ''}
                    onChange={(event) => onUpdateTemplateCardio(template.id, cardioIndex, { durationMin: parsePositiveNumber(event.target.value) })}
                  />
                  <TextInput
                    aria-label="有氧备注"
                    placeholder="坡度、速度或心率区间"
                    value={item.note ?? ''}
                    onChange={(event) => onUpdateTemplateCardio(template.id, cardioIndex, { note: event.target.value || undefined })}
                  />
                  <Button
                    variant="ghost"
                    onClick={() => onDeleteTemplateCardio(template.id, cardioIndex)}
                    aria-label={`删除有氧 ${item.mode || cardioIndex + 1}`}
                    title="删除有氧"
                    className="min-w-11 px-3 text-lg leading-none text-rose-700/70 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-200/80 dark:hover:bg-rose-900/30 dark:hover:text-rose-100"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => onAddTemplateExercise(template.id)}>添加动作</Button>
          <Button variant="secondary" onClick={() => onApplyTemplate(template)} disabled={!templateHasContent}>填入当天</Button>
          {canDelete ? <Button variant="ghost" onClick={() => onDeleteTemplate(template.id)}>删除模板</Button> : null}
        </div>
    </DisclosurePanel>
  )
}
