import { useEffect, useRef, useState } from 'react'
import type { WorkoutLog } from '../../types'
import type { SyncState } from '../../lib/storage'
import type { WorkoutSummary, WorkoutTemplateOption } from '../../lib/workout'
import { getDayKey } from '../../lib/dates'
import { Badge, Button, Card, DisclosurePanel } from '../ui'
import { WorkoutDateControls } from './WorkoutDateControls'
import { WorkoutMetrics } from './WorkoutMetrics'
import { WorkoutPlanPicker } from './WorkoutPlanPicker'
import { WorkoutPlanPreview } from './WorkoutPlanPreview'

export function WorkoutControlPanel({
  selectedDate,
  today,
  selectedWorkout,
  workoutSummary,
  selectedTemplate,
  selectedTemplateId,
  templateOptions,
  recommendedPlanName,
  workoutStatusLabel,
  workoutStatusTone,
  syncState,
  restDay,
  onDateChange,
  onTemplateChange,
  onApplyTemplate,
  onApplyRecommended,
  onAddExercise,
}: {
  selectedDate: string
  today: string
  selectedWorkout: WorkoutLog | undefined
  workoutSummary: WorkoutSummary
  selectedTemplate: WorkoutTemplateOption | undefined
  selectedTemplateId: string
  templateOptions: WorkoutTemplateOption[]
  recommendedPlanName: string
  workoutStatusLabel?: string
  workoutStatusTone?: 'positive' | 'warning' | 'neutral'
  syncState: SyncState
  restDay: boolean
  onDateChange: (date: string) => void
  onTemplateChange: (id: string) => void
  onApplyTemplate: (template: WorkoutTemplateOption) => void
  onApplyRecommended: () => void
  onAddExercise: () => void
}) {
  const hasWorkout = Boolean(selectedWorkout)
  const recommendedId = `builtin-${getDayKey(selectedDate)}`
  const canStartSelectedTemplate = Boolean(selectedTemplate && selectedTemplate.exercises.length > 0)

  // 当天还没开练时默认展开预览，已经记录了则折叠。用 soft-controlled state 保留用户手动切换。
  const [previewOpen, setPreviewOpen] = useState(!hasWorkout)
  const lastHasWorkoutRef = useRef(hasWorkout)
  useEffect(() => {
    if (lastHasWorkoutRef.current !== hasWorkout) {
      setPreviewOpen(!hasWorkout)
      lastHasWorkoutRef.current = hasWorkout
    }
  }, [hasWorkout])

  const syncBadge: { text: string; tone: 'positive' | 'warning' | 'danger' } =
    syncState === 'synced'
      ? { text: '已保存', tone: 'positive' }
      : syncState === 'saving' || syncState === 'loading'
        ? { text: '保存中…', tone: 'warning' }
        : { text: '离线', tone: 'danger' }
  const statusBadgeLabel = workoutStatusLabel ?? (hasWorkout ? '已记录' : '未开始')
  const statusBadgeTone = workoutStatusTone ?? (hasWorkout ? 'positive' : 'neutral')

  return (
    <Card className="border-slate-300 dark:border-slate-600">
      {/* Row 1: badges + title + sync */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {restDay ? <Badge tone="neutral">休息日</Badge> : <Badge tone={statusBadgeTone}>{statusBadgeLabel}</Badge>}
            {!restDay && !hasWorkout ? (
              <Badge tone={selectedTemplate?.source === 'custom' ? 'warning' : 'neutral'}>
                {selectedTemplate?.source === 'custom' ? '自定义模板' : '内置计划'}
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-slate-50 sm:text-2xl">
            {restDay ? '休息日' : selectedWorkout?.workoutName ?? selectedTemplate?.name ?? '选择今天的训练'}
          </h2>
        </div>
        <Badge tone={syncBadge.tone} className="min-w-16 shrink-0 justify-center">
          {syncBadge.text}
        </Badge>
      </div>

      {/* Row 2: date */}
      <div className="mt-4 grid gap-3 lg:grid-cols-[auto_1fr] lg:items-end">
        <WorkoutDateControls selectedDate={selectedDate} today={today} onDateChange={onDateChange} />

        {!restDay && !hasWorkout ? (
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
        ) : null}
      </div>

      {!restDay && !hasWorkout ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => selectedTemplate && onApplyTemplate(selectedTemplate)} disabled={!canStartSelectedTemplate}>
            选择计划开始
          </Button>
          {!canStartSelectedTemplate ? (
            <Button variant="secondary" onClick={onAddExercise}>空白训练</Button>
          ) : null}
          <Button variant="secondary" onClick={onApplyRecommended}>今日推荐</Button>
        </div>
      ) : null}

      {/* Row 4: plan preview (collapsible, auto-open when no workout) */}
      {!restDay && !hasWorkout && selectedTemplate ? (
        <WorkoutPlanPreview
          template={selectedTemplate}
          recommendedId={recommendedId}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      ) : null}

      {!restDay && hasWorkout ? (
        <DisclosurePanel className="mt-4" title="更换训练计划">
          <WorkoutPlanPicker
            selectedTemplate={selectedTemplate}
            selectedTemplateId={selectedTemplateId}
            templateOptions={templateOptions}
            recommendedId={recommendedId}
            recommendedPlanName={recommendedPlanName}
            onTemplateChange={onTemplateChange}
            onApplyTemplate={onApplyTemplate}
            onApplyRecommended={onApplyRecommended}
          />
        </DisclosurePanel>
      ) : null}

      {/* Row 5: workout metrics */}
      {!restDay && hasWorkout ? <WorkoutMetrics summary={workoutSummary} /> : null}
    </Card>
  )
}

