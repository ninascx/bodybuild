import type { WorkoutLog } from '../../types'
import type { TodayTaskPlan } from '../../lib/productFlow'
import type { WorkoutTemplateOption } from '../../lib/workout'
import { getDayKey } from '../../lib/dates'
import { Badge, Button, Card } from '../ui'
import { WorkoutDateControls } from './WorkoutDateControls'
import { WorkoutPlanPicker } from './WorkoutPlanPicker'

export function WorkoutDesktopCommandRail({
  selectedDate,
  today,
  selectedWorkout,
  selectedTemplate,
  selectedTemplateId,
  templateOptions,
  recommendedPlanName,
  taskPlan,
  restDay,
  onDateChange,
  onTemplateChange,
  onApplyTemplate,
  onApplyRecommended,
}: {
  selectedDate: string
  today: string
  selectedWorkout: WorkoutLog | undefined
  selectedTemplate: WorkoutTemplateOption | undefined
  selectedTemplateId: string
  templateOptions: WorkoutTemplateOption[]
  recommendedPlanName: string
  taskPlan: TodayTaskPlan
  restDay: boolean
  onDateChange: (date: string) => void
  onTemplateChange: (id: string) => void
  onApplyTemplate: (template: WorkoutTemplateOption) => void
  onApplyRecommended: () => void
}) {
  const hasWorkout = Boolean(selectedWorkout)
  const recommendedId = `builtin-${getDayKey(selectedDate)}`
  const selectedHasContent = Boolean(
    selectedTemplate && (selectedTemplate.exercises.length > 0 || (selectedTemplate.cardio ?? []).length > 0),
  )
  const summaryExerciseCount = selectedWorkout?.exercises.length ?? selectedTemplate?.exercises.length ?? 0
  const summaryCardioCount = (selectedWorkout?.cardio ?? selectedTemplate?.cardio ?? []).length

  return (
    <aside className="hidden lg:block lg:self-start">
      <div className="sticky top-20 grid max-h-[calc(100vh-6rem)] gap-3 overflow-y-auto pr-1">
        <Card className="p-3 shadow-none">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">训练日期</p>
          <div className="mt-2">
            <WorkoutDateControls selectedDate={selectedDate} today={today} onDateChange={onDateChange} compact />
          </div>
        </Card>

        <Card className="p-3 shadow-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">训练计划</p>
              <h3 className="mt-1 truncate text-base font-semibold text-slate-950 dark:text-slate-50">
                {restDay ? '今天休息' : selectedWorkout?.workoutName ?? selectedTemplate?.name ?? '选择计划'}
              </h3>
            </div>
            {!restDay ? (
              <Badge tone={hasWorkout ? 'positive' : selectedTemplate?.id === recommendedId ? 'positive' : selectedTemplate?.source === 'custom' ? 'warning' : 'neutral'}>
                {hasWorkout ? '已记录' : selectedTemplate?.id === recommendedId ? '推荐' : selectedTemplate?.source === 'custom' ? '自定' : '内置'}
              </Badge>
            ) : null}
          </div>

          {restDay ? (
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              今日记录已标记为休息，训练页只保留同步和回看。
            </p>
          ) : (
            <div className="mt-3 grid gap-3">
              <WorkoutPlanPicker
                selectedTemplate={selectedTemplate}
                selectedTemplateId={selectedTemplateId}
                templateOptions={templateOptions}
                recommendedId={recommendedId}
                recommendedPlanName={recommendedPlanName}
                showActions={false}
                onTemplateChange={onTemplateChange}
                onApplyTemplate={onApplyTemplate}
                onApplyRecommended={onApplyRecommended}
              />

              {selectedTemplate || selectedWorkout ? (
                <div className="rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{hasWorkout ? '当前记录' : '所选内容'}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
                    {summaryExerciseCount} 个动作 · {summaryCardioCount} 个有氧
                  </p>
                </div>
              ) : null}

              {hasWorkout ? (
                <div className="grid gap-2">
                  <Button
                    variant="secondary"
                    className="w-full justify-center shadow-none"
                    onClick={() => selectedTemplate && onApplyTemplate(selectedTemplate)}
                    disabled={!selectedHasContent}
                  >
                    填入所选
                  </Button>
                  <Button variant="secondary" className="w-full justify-center shadow-none" onClick={onApplyRecommended}>
                    今日推荐
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </Card>

        <Card className="p-3 shadow-none">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">今日建议</p>
          <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">{taskPlan.workoutActionLabel}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{taskPlan.workoutMessage}</p>
          {taskPlan.review.readiness === 'insufficient-data' && taskPlan.review.primaryDestination === 'workout' ? (
            <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{taskPlan.review.message}</p>
          ) : null}
        </Card>
      </div>
    </aside>
  )
}
