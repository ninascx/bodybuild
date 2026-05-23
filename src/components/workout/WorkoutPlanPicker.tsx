import { useEffect, useRef, useState } from 'react'
import { workoutPlans } from '../../data/plans'
import { getDayKey } from '../../lib/dates'
import type { WorkoutTemplateOption } from '../../lib/workout'
import { Badge, Button, Field } from '../ui'

export function WorkoutPlanPicker({
  selectedDate,
  selectedTemplateId,
  selectedTemplate,
  templateOptions,
  hasWorkout,
  onTemplateChange,
  onApplySelected,
  onApplyRecommended,
}: {
  selectedDate: string
  selectedTemplateId: string
  selectedTemplate: WorkoutTemplateOption | undefined
  templateOptions: WorkoutTemplateOption[]
  hasWorkout: boolean
  onTemplateChange: (templateId: string) => void
  onApplySelected: () => void
  onApplyRecommended: () => void
}) {
  const recommendedId = `builtin-${getDayKey(selectedDate)}`
  const previewExercises = selectedTemplate?.exercises ?? []
  // 当天还没开练时默认展开，让用户第一眼就能选计划；已经记录了则保持折叠。
  // 用 state + onToggle 而不是受控 open，让用户手动展开/折叠后能保留选择。
  const [open, setOpen] = useState(!hasWorkout)
  const lastHasWorkoutRef = useRef(hasWorkout)
  useEffect(() => {
    // hasWorkout 切换（比如换日期到一个还没记录的日子）时重新按规则展开/折叠。
    if (lastHasWorkoutRef.current !== hasWorkout) {
      setOpen(!hasWorkout)
      lastHasWorkoutRef.current = hasWorkout
    }
  }, [hasWorkout])

  return (
    <details
      open={open}
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
      className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm"
    >
      <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-200">选择 / 切换训练计划</summary>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
        <Field label={`训练计划（今日推荐：${workoutPlans[getDayKey(selectedDate)].name}）`}>
          <select
            value={selectedTemplateId}
            onChange={(event) => onTemplateChange(event.target.value)}
            className="h-11 rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
          >
            <optgroup label="内置计划">
              {templateOptions
                .filter((template) => template.source === 'builtin')
                .map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.id === recommendedId ? '今日推荐 · ' : ''}
                    {template.name} · {template.focus}
                  </option>
                ))}
            </optgroup>
            <optgroup label="自定义模板">
              {templateOptions
                .filter((template) => template.source === 'custom')
                .map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.focus}
                  </option>
                ))}
            </optgroup>
          </select>
        </Field>
        <Button onClick={onApplySelected}>填入所选计划</Button>
        <Button variant="secondary" onClick={onApplyRecommended}>填入今日推荐</Button>
      </div>

      {selectedTemplate ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-950 dark:text-slate-50">{selectedTemplate.name}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedTemplate.focus} · {selectedTemplate.exercises.length} 个动作</p>
            </div>
            <Badge tone={selectedTemplate.id === recommendedId ? 'positive' : selectedTemplate.source === 'custom' ? 'warning' : 'neutral'}>
              {selectedTemplate.id === recommendedId ? '今日推荐' : selectedTemplate.source === 'custom' ? '自定义模板' : '内置计划'}
            </Badge>
          </div>
          {previewExercises.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              休息日模板，无动作。如需自由训练，可点"空白训练"开始。
            </p>
          ) : (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {previewExercises.map((exercise, index) => (
                <div key={`${exercise.id}-${index}`} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 rounded-md bg-white px-3 py-2 text-sm dark:bg-slate-900">
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
        </div>
      ) : null}
    </details>
  )
}
