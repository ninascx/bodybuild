import { ActionCard, Badge, Button, InsightCard, MetricGrid, SectionHeader, StatusHero } from '../ui'
import { dayNames } from '../../data/plans'
import type { DailyTarget } from '../../types'
import type { TodaySnapshot } from '../../lib/statusInsights'

function isWorkoutAction(action: string | undefined): boolean {
  return action?.includes('训练') ?? false
}

function runTodayAction(action: string | undefined, onRecordToday: () => void, onStartWorkout: () => void) {
  if (isWorkoutAction(action)) {
    onStartWorkout()
    return
  }
  onRecordToday()
}

export function TodayOverview({
  today,
  todayKey,
  target,
  todaySnapshot,
  onRecordToday,
  onStartWorkout,
}: {
  today: string
  todayKey: number
  target: DailyTarget
  todaySnapshot: TodaySnapshot
  onRecordToday: () => void
  onStartWorkout: () => void
}) {
  const missingItems = todaySnapshot.checklist.filter((item) => !item.done)
  const primaryAction = todaySnapshot.actions[0]
  const secondaryActions = todaySnapshot.actions.slice(1)

  return (
    <>
      <StatusHero
        eyebrow={`身体状态 · ${today} · ${dayNames[todayKey]}`}
        title={todaySnapshot.statusLabel}
        tone={todaySnapshot.tone}
        message={
          missingItems.length > 0
            ? `${todaySnapshot.headline}（还有 ${missingItems.length} 项待补）`
            : todaySnapshot.headline
        }
        actions={
          primaryAction ? (
            <Button className="w-full px-4 sm:w-auto" onClick={() => runTodayAction(primaryAction, onRecordToday, onStartWorkout)}>
              {primaryAction}
            </Button>
          ) : null
        }
        meta={
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {target.isTrainingDay ? '训练日' : '休息日'} · {target.workoutName}
          </p>
        }
      />

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
          <SectionHeader title="今日行动" description="先做最影响今天判断的一件事。" />
          <div className="mt-3 grid gap-2">
            <ActionCard
              title={primaryAction ?? (target.isTrainingDay ? '完成今日训练' : '守住恢复节奏')}
              description={isWorkoutAction(primaryAction) ? '进入训练页后从当前动作开始记录。' : '进入记录页补齐今日状态。'}
              tone="neutral"
              action={
                primaryAction ? (
                  <Button
                    className="w-full sm:w-auto"
                    variant={isWorkoutAction(primaryAction) ? 'primary' : 'secondary'}
                    onClick={() => runTodayAction(primaryAction, onRecordToday, onStartWorkout)}
                  >
                    去处理
                  </Button>
                ) : null
              }
            />
            {secondaryActions.length > 0 && secondaryActions.length <= 2 ? (
              <div className="flex flex-wrap gap-2">
                {secondaryActions.slice(0, 2).map((action) => (
                  <Button
                    key={action}
                    variant="secondary"
                    className="px-3"
                    onClick={() => runTodayAction(action, onRecordToday, onStartWorkout)}
                  >
                    {action}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
          <SectionHeader title="本周趋势" description="只看会影响今天判断的信号。" />
          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {todaySnapshot.weeklySignals.map((signal) => (
              <InsightCard key={signal.label} title={signal.label} value={signal.value} tone={signal.tone} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
