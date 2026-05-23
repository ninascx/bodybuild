import type { WorkoutLog } from '../../types'
import type { WorkoutSummary, WorkoutTemplateOption } from '../../lib/workout'
import { addDays } from '../../lib/dates'
import { Badge, Button, Card, Field, TextInput } from '../ui'

export function WorkoutControlPanel({
  selectedDate,
  today,
  selectedWorkout,
  workoutSummary,
  selectedTemplate,
  onDateChange,
  onPrimaryAction,
  onBlankWorkout,
}: {
  selectedDate: string
  today: string
  selectedWorkout: WorkoutLog | undefined
  workoutSummary: WorkoutSummary
  selectedTemplate: WorkoutTemplateOption | undefined
  onDateChange: (date: string) => void
  onPrimaryAction: () => void
  onBlankWorkout: () => void
}) {
  return (
    <Card className="border-slate-300 dark:border-slate-600">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={selectedWorkout ? 'positive' : 'neutral'}>{selectedWorkout ? '已记录' : '未开始'}</Badge>
            <Badge tone={selectedTemplate?.source === 'custom' ? 'warning' : 'neutral'}>
              {selectedTemplate?.source === 'custom' ? '自定义模板' : '内置计划'}
            </Badge>
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-50">{selectedWorkout?.workoutName ?? selectedTemplate?.name ?? '选择今天的训练'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            今日训练优先：先确定练什么，再记录每组表现；模板管理放在页面底部。
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:w-80">
          <Field label="训练日期">
            <TextInput type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-1 sm:col-span-2">
            <Button
              variant="secondary"
              className="px-2"
              onClick={() => onDateChange(addDays(selectedDate, -1))}
              aria-label="前一天"
            >
              ‹ 前一天
            </Button>
            <Button
              variant="secondary"
              className="px-2"
              onClick={() => onDateChange(today)}
              disabled={selectedDate === today}
            >
              今天
            </Button>
            <Button
              variant="secondary"
              className="px-2"
              onClick={() => onDateChange(addDays(selectedDate, 1))}
              disabled={selectedDate >= today}
              aria-label="后一天"
            >
              后一天 ›
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            <Button onClick={onPrimaryAction}>{selectedWorkout ? '新增动作' : '选择计划开始'}</Button>
            <Button variant="secondary" onClick={onBlankWorkout}>空白训练</Button>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <WorkoutMetric label="动作数" value={`${workoutSummary.exerciseCount}`} />
        <WorkoutMetric label="已填组数" value={`${workoutSummary.filledSets}/${workoutSummary.totalSets}`} />
        <WorkoutMetric label="记录进度" value={`${workoutSummary.completionPercent}%`} />
        <WorkoutMetric label="本次训练量" value={`${Math.round(workoutSummary.totalVolume)} kg`} />
      </div>
    </Card>
  )
}

function WorkoutMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 p-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">{value}</p>
    </div>
  )
}
