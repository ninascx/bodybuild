import { useEffect, useRef, useState } from 'react'
import type { WorkoutLog } from '../../types'
import type { SyncState } from '../../lib/storage'
import type { WorkoutSummary, WorkoutTemplateOption } from '../../lib/workout'
import { addDays, getDayKey } from '../../lib/dates'
import { workoutPlans } from '../../data/plans'
import { Badge, Button, Card } from '../ui'

export function WorkoutControlPanel({
  selectedDate,
  today,
  selectedWorkout,
  workoutSummary,
  selectedTemplate,
  selectedTemplateId,
  templateOptions,
  syncState,
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
  syncState: SyncState
  onDateChange: (date: string) => void
  onTemplateChange: (id: string) => void
  onApplyTemplate: (template: WorkoutTemplateOption) => void
  onApplyRecommended: () => void
  onAddExercise: () => void
}) {
  const hasWorkout = Boolean(selectedWorkout)
  const recommendedId = `builtin-${getDayKey(selectedDate)}`
  const previewExercises = selectedTemplate?.exercises ?? []

  // 当天还没开练时默认展开预览，已经记录了则折叠。用 soft-controlled state 保留用户手动切换。
  const [previewOpen, setPreviewOpen] = useState(!hasWorkout)
  const lastHasWorkoutRef = useRef(hasWorkout)
  useEffect(() => {
    if (lastHasWorkoutRef.current !== hasWorkout) {
      setPreviewOpen(!hasWorkout)
      lastHasWorkoutRef.current = hasWorkout
    }
  }, [hasWorkout])

  const syncBadge: { text: string; className: string } =
    syncState === 'synced'
      ? { text: '已保存', className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200' }
      : syncState === 'saving' || syncState === 'loading'
        ? { text: '保存中…', className: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-600/40 dark:bg-amber-900/30 dark:text-amber-100' }
        : { text: '离线', className: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-600/40 dark:bg-rose-900/30 dark:text-rose-100' }

  return (
    <Card className="border-slate-300 dark:border-slate-600">
      {/* Row 1: badges + title + sync */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={hasWorkout ? 'positive' : 'neutral'}>{hasWorkout ? '已记录' : '未开始'}</Badge>
            <Badge tone={selectedTemplate?.source === 'custom' ? 'warning' : 'neutral'}>
              {selectedTemplate?.source === 'custom' ? '自定义模板' : '内置计划'}
            </Badge>
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">
            {selectedWorkout?.workoutName ?? selectedTemplate?.name ?? '选择今天的训练'}
          </h2>
        </div>
        <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${syncBadge.className}`}>
          {syncBadge.text}
        </span>
      </div>

      {/* Row 2: date + plan select */}
      <div className="mt-4 grid gap-3 lg:grid-cols-[auto_1fr] lg:items-end">
        <div className="grid gap-2 sm:grid-cols-2 lg:w-80">
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span>训练日期</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
              className="h-11 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
            />
          </label>
          <div className="grid grid-cols-3 gap-1 self-end">
            <Button variant="secondary" className="px-2" onClick={() => onDateChange(addDays(selectedDate, -1))} aria-label="前一天">‹ 前一天</Button>
            <Button variant="secondary" className="px-2" onClick={() => onDateChange(today)} disabled={selectedDate === today}>今天</Button>
            <Button variant="secondary" className="px-2" onClick={() => onDateChange(addDays(selectedDate, 1))} disabled={selectedDate >= today} aria-label="后一天">后一天 ›</Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] lg:items-end">
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span>训练计划（今日推荐：{workoutPlans[getDayKey(selectedDate)].name}）</span>
            <select
              value={selectedTemplateId}
              onChange={(event) => onTemplateChange(event.target.value)}
              className="h-11 rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
            >
              <optgroup label="内置计划">
                {templateOptions
                  .filter((t) => t.source === 'builtin' && t.exercises.length > 0)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id === recommendedId ? '今日推荐 · ' : ''}{t.name} · {t.focus}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="自定义模板">
                {templateOptions
                  .filter((t) => t.source === 'custom')
                  .map((t) => (
                    <option key={t.id} value={t.id}>{t.name} · {t.focus}</option>
                  ))}
              </optgroup>
            </select>
          </label>
          <Button onClick={() => selectedTemplate && onApplyTemplate(selectedTemplate)} disabled={!selectedTemplate || selectedTemplate.exercises.length === 0}>
            填入所选
          </Button>
          <Button variant="secondary" onClick={onApplyRecommended}>今日推荐</Button>
        </div>
      </div>

      {/* Row 3: quick actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => (hasWorkout ? onAddExercise() : selectedTemplate && onApplyTemplate(selectedTemplate))}>
          {hasWorkout ? '新增动作' : '选择计划开始'}
        </Button>
        <Button variant="secondary" onClick={onAddExercise}>空白训练</Button>
      </div>

      {/* Row 4: plan preview (collapsible, auto-open when no workout) */}
      {selectedTemplate ? (
        <details
          open={previewOpen}
          onToggle={(event) => setPreviewOpen((event.target as HTMLDetailsElement).open)}
          className="mt-4 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
        >
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            计划预览 · {selectedTemplate.name}
          </summary>
          <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">{selectedTemplate.focus} · {previewExercises.length} 个动作</p>
              <Badge tone={selectedTemplate.id === recommendedId ? 'positive' : selectedTemplate.source === 'custom' ? 'warning' : 'neutral'}>
                {selectedTemplate.id === recommendedId ? '今日推荐' : selectedTemplate.source === 'custom' ? '自定义模板' : '内置计划'}
              </Badge>
            </div>
            {previewExercises.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">休息日模板，无训练动作。</p>
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
        </details>
      ) : null}

      {/* Row 5: workout metrics */}
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
