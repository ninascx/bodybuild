import type { WorkoutTemplateOption } from '../../lib/workout'
import { Button, Select } from '../ui'

export function WorkoutPlanPicker({
  selectedTemplate,
  selectedTemplateId,
  templateOptions,
  recommendedId,
  recommendedPlanName,
  showActions = true,
  onTemplateChange,
  onApplyTemplate,
  onApplyRecommended,
}: {
  selectedTemplate: WorkoutTemplateOption | undefined
  selectedTemplateId: string
  templateOptions: WorkoutTemplateOption[]
  recommendedId: string
  recommendedPlanName: string
  showActions?: boolean
  onTemplateChange: (id: string) => void
  onApplyTemplate: (template: WorkoutTemplateOption) => void
  onApplyRecommended: () => void
}) {
  const selectedHasContent = Boolean(
    selectedTemplate && (selectedTemplate.exercises.length > 0 || (selectedTemplate.cardio ?? []).length > 0),
  )

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] lg:items-end">
      <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        <span>训练计划（今日推荐：{recommendedPlanName}）</span>
        <Select
          value={selectedTemplateId}
          onChange={(event) => onTemplateChange(event.target.value)}
        >
          <optgroup label="内置计划">
            {templateOptions
              .filter((template) => template.source === 'builtin')
              .map((template) => (
                <option key={template.id} value={template.id}>
                  {template.id === recommendedId ? '今日推荐 · ' : ''}{template.name} · {template.focus}
                </option>
              ))}
          </optgroup>
          <optgroup label="自定义模板">
            {templateOptions
              .filter((template) => template.source === 'custom')
              .map((template) => (
                <option key={template.id} value={template.id}>{template.name} · {template.focus}</option>
              ))}
          </optgroup>
        </Select>
      </label>
      {showActions ? (
        <>
          <Button variant="secondary" onClick={() => selectedTemplate && onApplyTemplate(selectedTemplate)} disabled={!selectedHasContent}>
            填入所选
          </Button>
          <Button variant="secondary" onClick={onApplyRecommended}>今日推荐</Button>
        </>
      ) : null}
    </div>
  )
}
