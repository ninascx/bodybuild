import type { WorkoutTemplateOption } from '../../lib/workout'
import { Badge, DisclosurePanel } from '../ui'

export function WorkoutPlanPreview({
  template,
  recommendedId,
  open,
  onOpenChange,
}: {
  template: WorkoutTemplateOption
  recommendedId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const previewExercises = template.exercises
  const badgeTone = template.id === recommendedId
    ? 'positive'
    : template.source === 'custom'
      ? 'warning'
      : 'neutral'
  const badgeLabel = template.id === recommendedId
    ? '今日推荐'
    : template.source === 'custom'
      ? '自定义模板'
      : '内置计划'

  return (
    <DisclosurePanel
      open={open}
      onOpenChange={onOpenChange}
      className="mt-4"
      title={`计划预览 · ${template.name}`}
      contentClassName="py-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {template.focus} · {previewExercises.length} 个动作
        </p>
        <Badge tone={badgeTone}>{badgeLabel}</Badge>
      </div>

      {previewExercises.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          休息日模板，无训练动作。
        </p>
      ) : (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {previewExercises.map((exercise, index) => (
            <div
              key={`${exercise.id}-${index}`}
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 rounded-md bg-white px-3 py-2 text-sm dark:bg-slate-900"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                {index + 1}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-slate-800 dark:text-slate-200">{exercise.name}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{exercise.prescription}</p>
                {exercise.note ? <p className="mt-1 text-xs leading-5 text-amber-700">{exercise.note}</p> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </DisclosurePanel>
  )
}
