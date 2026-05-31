import { Badge, Button, Card, InsightCard, SectionHeader, StatusHero } from '../ui'
import { dayNames } from '../../data/plans'
import type { DailyTarget } from '../../types'
import type { DailyFocusKey, TodayTaskAction, TodayTaskPlan } from '../../lib/productFlow'

function runTodayAction(
  action: TodayTaskAction,
  onRecordToday: (focusKey?: DailyFocusKey) => void,
  onStartWorkout: () => void,
) {
  if (action.kind === 'workout') {
    onStartWorkout()
    return
  }
  if (action.kind === 'review') {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    return
  }
  onRecordToday(action.focusKey)
}

function ChecklistRow({
  item,
  onRecordToday,
}: {
  item: TodayTaskPlan['checklist'][number]
  onRecordToday: (focusKey?: DailyFocusKey) => void
}) {
  return (
    <button
      type="button"
      className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:focus-visible:ring-cyan-500 ${
        item.done
          ? 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400'
          : 'border-teal-200 bg-white text-teal-950 hover:border-teal-400 hover:bg-cyan-50 dark:border-cyan-700/40 dark:bg-slate-900 dark:text-cyan-50 dark:hover:bg-cyan-950/30'
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
            : 'bg-cyan-100 text-teal-800 dark:bg-cyan-900/40 dark:text-cyan-200'
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
}: {
  today: string
  todayKey: number
  target: DailyTarget
  taskPlan: TodayTaskPlan
  onRecordToday: (focusKey?: DailyFocusKey) => void
  onStartWorkout: () => void
}) {
  const primary = taskPlan.primaryAction
  const runWorkoutCardAction = () => {
    if (taskPlan.workoutState === 'complete') {
      onRecordToday('notes')
      return
    }
    onStartWorkout()
  }

  return (
    <>
      <StatusHero
        eyebrow={`今日 · ${today} · ${dayNames[todayKey]}`}
        title={taskPlan.title}
        tone={taskPlan.tone}
        message={taskPlan.message}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span>{target.isTrainingDay ? '训练日' : '休息日'} · {target.workoutName}</span>
            {taskPlan.missingItems.length > 0 ? <Badge tone="neutral">{taskPlan.missingItems.length} 项待补</Badge> : <Badge tone="positive">今日记录完整</Badge>}
          </div>
        }
      />

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
        <Card className="p-3 sm:p-4">
          <SectionHeader title="今日行动" description="先处理最影响判断的一件事。" />
          <div className="mt-3 rounded-lg border border-teal-200 bg-cyan-50/60 p-3 dark:border-cyan-700/40 dark:bg-cyan-950/20">
            <p className="text-sm font-bold text-slate-950 dark:text-slate-50">{primary.label}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{primary.helper}</p>
            <Button className="mt-3 w-full" onClick={() => runTodayAction(primary, onRecordToday, onStartWorkout)}>
              立即处理
            </Button>
          </div>
          {taskPlan.secondaryActions.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {taskPlan.secondaryActions.slice(0, 3).map((action) => (
                <Button
                  key={`${action.kind}-${action.label}`}
                  variant="secondary"
                  className="px-3 text-xs shadow-none"
                  onClick={() => runTodayAction(action, onRecordToday, onStartWorkout)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="p-3 sm:p-4">
          <SectionHeader title="缺口清单" description="点任何一项都能直达对应记录。" />
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {taskPlan.checklist.slice(0, 6).map((item) => (
              <ChecklistRow key={item.key} item={item} onRecordToday={onRecordToday} />
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="p-3 sm:p-4">
          <SectionHeader title="训练入口" description="训练现场只保留开始、继续和确认。" />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-base font-bold text-slate-950 dark:text-slate-50">{taskPlan.workoutTitle}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{taskPlan.workoutMessage}</p>
            </div>
            <Button className="w-full shrink-0 sm:w-auto" variant={taskPlan.workoutState === 'complete' ? 'secondary' : 'primary'} onClick={runWorkoutCardAction}>
              {taskPlan.workoutActionLabel}
            </Button>
          </div>
        </Card>

        <Card className="p-3 sm:p-4">
          <SectionHeader title="复盘信号" description="只放会改变今天策略的趋势。" />
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {taskPlan.weeklySignals.map((signal) => (
              <InsightCard key={signal.label} title={signal.label} value={signal.value} tone={signal.tone} />
            ))}
          </div>
        </Card>
      </section>
    </>
  )
}
