import type { CSSProperties } from 'react'
import { Badge, Button, Card, SectionHeader, StatusHero } from '../ui'
import { dayNames } from '../../data/plans'
import type { DailyTarget } from '../../types'
import type { DailyFocusKey, TodayTaskAction, TodayTaskPlan } from '../../lib/productFlow'

function runTodayAction(
  action: TodayTaskAction,
  onRecordToday: (focusKey?: DailyFocusKey) => void,
  onStartWorkout: () => void,
  onReview: () => void,
) {
  if (action.kind === 'workout') {
    onStartWorkout()
    return
  }
  if (action.kind === 'review') {
    if (action.destination === 'daily') {
      onRecordToday(action.focusKey)
      return
    }
    if (action.destination === 'workout') {
      onStartWorkout()
      return
    }
    onReview()
    return
  }
  onRecordToday(action.focusKey)
}

function ChecklistRow({
  item,
  onRecordToday,
  motionIndex,
}: {
  item: TodayTaskPlan['checklist'][number]
  onRecordToday: (focusKey?: DailyFocusKey) => void
  motionIndex?: number
}) {
  return (
    <button
      type="button"
      style={motionIndex !== undefined ? ({ '--motion-index': motionIndex } as CSSProperties) : undefined}
      className={`flex min-h-12 w-full items-center justify-between gap-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] dark:focus-visible:ring-cyan-500 ${
        item.done
          ? 'border-b border-[var(--surface-border)] py-2 text-slate-500 last:border-b-0 dark:border-slate-800 dark:text-slate-400'
          : 'border-b border-[var(--surface-border)] py-2 text-slate-950 last:border-b-0 hover:text-[var(--color-primary-700)] dark:border-slate-800 dark:text-slate-100 dark:hover:text-cyan-200'
      }`}
      onClick={() => onRecordToday(item.key)}
      aria-label={`${item.done ? '查看' : '补'}${item.label}`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{item.label}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{item.helper}</span>
      </span>
      <span
        className={`shrink-0 text-xs font-semibold ${
          item.done
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-[var(--color-primary-600)] dark:text-cyan-400'
        }`}
      >
        {item.done ? '✓' : ''}
      </span>
    </button>
  )
}

export function TodayOverview({
  today,
  todayKey,
  target,
  taskPlan,
  onRecordToday,
  onStartWorkout,
  onReview,
}: {
  today: string
  todayKey: number
  target: DailyTarget
  taskPlan: TodayTaskPlan
  onRecordToday: (focusKey?: DailyFocusKey) => void
  onStartWorkout: () => void
  onReview: () => void
}) {
  const primary = taskPlan.primaryAction
  const missingCount = taskPlan.missingItems.length
  const visibleMissingItems = taskPlan.missingItems.slice(0, 3)
  const remainingMissingCount = Math.max(taskPlan.missingItems.length - visibleMissingItems.length, 0)

  return (
    <>
      <div className="md:hidden">
        <section className="motion-enter rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                今日 · {today} · {dayNames[todayKey]}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">{taskPlan.title}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{taskPlan.message}</p>
            </div>
            {missingCount > 0 ? <Badge tone="neutral">{missingCount} 项待补</Badge> : <Badge tone="positive">完整</Badge>}
          </div>
          <div className="mt-4">
            <Button className="w-full" data-pressable="true" onClick={() => runTodayAction(primary, onRecordToday, onStartWorkout, onReview)}>
              {primary.label}
            </Button>
            <p className="mt-2 text-center text-sm leading-5 text-slate-600 dark:text-slate-300">{primary.helper}</p>
          </div>
          {taskPlan.secondaryActions.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-[var(--surface-border)] pt-4 dark:border-slate-700">
              {taskPlan.secondaryActions.slice(0, 2).map((action) => (
                <Button
                  key={`${action.kind}-${action.label}`}
                  variant="ghost"
                  className="min-h-8 px-2 py-1 text-xs"
                  onClick={() => runTodayAction(action, onRecordToday, onStartWorkout, onReview)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="motion-enter mt-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">待补项目</h3>
            {remainingMissingCount > 0 ? (
              <Button
                variant="ghost"
                className="min-h-7 px-2 text-xs text-slate-500 dark:text-slate-400"
                onClick={() => onRecordToday()}
              >
                +{remainingMissingCount} 项
              </Button>
            ) : null}
          </div>
          <div className="motion-list mt-1">
            {visibleMissingItems.length > 0 ? visibleMissingItems.map((item, index) => (
              <ChecklistRow key={item.key} item={item} onRecordToday={onRecordToday} motionIndex={index} />
            )) : (
              <p className="py-3 text-sm text-slate-500 dark:text-slate-400">今日关键项目已完成</p>
            )}
          </div>
        </section>
      </div>

      <div className="hidden md:block">
        <StatusHero
          eyebrow={`今日 · ${today} · ${dayNames[todayKey]}`}
          title={taskPlan.title}
          tone={taskPlan.tone}
          message={taskPlan.message}
          meta={
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span>{target.isTrainingDay ? '训练日' : '休息日'} · {target.workoutName}</span>
              {missingCount > 0 ? <Badge tone="neutral">{missingCount} 项待补</Badge> : <Badge tone="positive">完整</Badge>}
            </div>
          }
        />
      </div>

      <section className="hidden gap-3 md:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
        <Card className="p-3 sm:p-4">
          <SectionHeader title="今日行动" description="优先处理最重要的一件事" />
          <div className="mt-4">
            <Button className="w-full" data-pressable="true" onClick={() => runTodayAction(primary, onRecordToday, onStartWorkout, onReview)}>
              {primary.label}
            </Button>
            <p className="mt-2 text-center text-sm leading-6 text-slate-600 dark:text-slate-300">{primary.helper}</p>
          </div>
          {taskPlan.secondaryActions.length > 0 ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2 border-t border-[var(--surface-border)] pt-4 dark:border-slate-700">
              {taskPlan.secondaryActions.slice(0, 2).map((action) => (
                <Button
                  key={`${action.kind}-${action.label}`}
                  variant="ghost"
                  className="px-3 text-xs"
                  onClick={() => runTodayAction(action, onRecordToday, onStartWorkout, onReview)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="p-3 sm:p-4">
          <SectionHeader title="待补项目" description="点击可直达对应记录页" />
          <div className="motion-list mt-3 space-y-0">
            {taskPlan.missingItems.length > 0 ? taskPlan.missingItems.slice(0, 3).map((item, index) => (
              <ChecklistRow key={item.key} item={item} onRecordToday={onRecordToday} motionIndex={Math.min(index, 3)} />
            )) : (
              <p className="py-3 text-sm text-emerald-700 dark:text-emerald-300">
                今日关键项目已完成
              </p>
            )}
          </div>
        </Card>
      </section>
    </>
  )
}
