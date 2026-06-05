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
  compact = false,
  motionIndex,
}: {
  item: TodayTaskPlan['checklist'][number]
  onRecordToday: (focusKey?: DailyFocusKey) => void
  compact?: boolean
  motionIndex?: number
}) {
  return (
    <button
      type="button"
      style={motionIndex !== undefined ? ({ '--motion-index': motionIndex } as CSSProperties) : undefined}
      className={`flex min-h-12 w-full items-center justify-between gap-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] dark:focus-visible:ring-cyan-500 ${
        item.done
          ? compact
            ? 'border-b border-[var(--surface-border)] py-2 text-slate-500 last:border-b-0 dark:border-slate-800 dark:text-slate-400'
            : 'rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400'
          : compact
            ? 'border-b border-[var(--surface-border)] py-2 text-slate-950 last:border-b-0 hover:text-[var(--color-primary-700)] dark:border-slate-800 dark:text-slate-100 dark:hover:text-cyan-200'
            : 'rounded-md border border-[var(--surface-border)] bg-[var(--surface-panel)] px-3 py-2 text-slate-950 hover:border-[var(--color-primary-100)] hover:bg-[var(--surface-muted)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-cyan-700/50 dark:hover:bg-slate-800'
      }`}
      onClick={() => onRecordToday(item.key)}
      aria-label={`${item.done ? '查看' : '补'}${item.label}`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{item.label}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{item.helper}</span>
      </span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
          item.done
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
            : 'bg-[var(--surface-muted)] text-[var(--color-primary-700)] dark:bg-slate-800 dark:text-cyan-200'
        }`}
      >
        {item.done ? '已填' : '待补'}
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
  const visibleMissingItems = taskPlan.missingItems.slice(0, 4)
  const remainingMissingCount = Math.max(taskPlan.missingItems.length - visibleMissingItems.length, 0)

  return (
    <>
      <div className="md:hidden">
        <section className="motion-enter rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                今日 · {today} · {dayNames[todayKey]}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">{taskPlan.title}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{taskPlan.message}</p>
            </div>
            {missingCount > 0 ? <Badge tone="neutral">{missingCount} 待补</Badge> : <Badge tone="positive">完整</Badge>}
          </div>
          <div className="mt-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{primary.label}</p>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{primary.helper}</p>
            <Button className="mt-3 w-full" data-pressable="true" onClick={() => runTodayAction(primary, onRecordToday, onStartWorkout, onReview)}>
              立即处理
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{target.isTrainingDay ? '训练日' : '休息日'} · {target.workoutName}</span>
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
        </section>

        <section className="motion-enter mt-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">缺口清单</h3>
            {remainingMissingCount > 0 ? (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">还有 {remainingMissingCount} 项</span>
            ) : null}
          </div>
          <div className="motion-list mt-1">
            {visibleMissingItems.length > 0 ? visibleMissingItems.map((item, index) => (
              <ChecklistRow key={item.key} item={item} onRecordToday={onRecordToday} compact motionIndex={index} />
            )) : (
              <p className="py-3 text-sm text-slate-500 dark:text-slate-400">今日关键记录已补齐。</p>
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
              {missingCount > 0 ? <Badge tone="neutral">{missingCount} 项待补</Badge> : <Badge tone="positive">今日记录完整</Badge>}
            </div>
          }
        />
      </div>

      <section className="hidden gap-3 md:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
        <Card className="p-3 sm:p-4">
          <SectionHeader title="今日行动" description="先处理最影响判断的一件事。" />
          <div className="mt-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{primary.label}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{primary.helper}</p>
            <Button className="mt-3 w-full" data-pressable="true" onClick={() => runTodayAction(primary, onRecordToday, onStartWorkout, onReview)}>
              立即处理
            </Button>
          </div>
          {taskPlan.secondaryActions.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {taskPlan.secondaryActions.slice(0, 2).map((action) => (
                <Button
                  key={`${action.kind}-${action.label}`}
                  variant="secondary"
                  className="px-3 text-xs shadow-none"
                  onClick={() => runTodayAction(action, onRecordToday, onStartWorkout, onReview)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="p-3 sm:p-4">
          <SectionHeader title="缺口清单" description="点任何一项都能直达对应记录。" />
          <div className="motion-list mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {taskPlan.missingItems.length > 0 ? taskPlan.missingItems.slice(0, 6).map((item, index) => (
              <ChecklistRow key={item.key} item={item} onRecordToday={onRecordToday} motionIndex={Math.min(index, 3)} />
            )) : (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                今日关键记录已补齐。
              </p>
            )}
          </div>
        </Card>
      </section>
    </>
  )
}
