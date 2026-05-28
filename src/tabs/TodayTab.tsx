import { ActionCard, Badge, Button, Card, EmptyState, InsightCard, MetricGrid, RecommendationBox, SectionHeader, StatusHero } from '../components/ui'
import { BudgetTile, MacroTile } from '../components/BudgetTile'
import { TipsDetails } from '../components/TipsDetails'
import { dayNames } from '../data/plans'
import type { AdjustmentRecommendation, DailyLog, DailyTarget, WorkoutLog, WorkoutPlan } from '../types'
import type { DashboardStats } from '../lib/metrics'
import type { TodaySnapshot } from '../lib/statusInsights'

type TodayTabProps = {
  today: string
  todayKey: number
  target: DailyTarget
  plan: WorkoutPlan
  todayLog: Partial<DailyLog> | undefined
  todayWorkout: WorkoutLog | undefined
  dashboardStats: DashboardStats
  todaySnapshot: TodaySnapshot
  trendAlerts: AdjustmentRecommendation[]
  dailyRecommendations: AdjustmentRecommendation[]
  weekendRisk: AdjustmentRecommendation
  hasWeeklyCalorieLogs: boolean
  weeklyCalorieTarget: number
  todayCalorieTarget: number | undefined
  signedRemaining: (target: number | undefined, actual: number | undefined) => string
  remainingTone: (target: number | undefined, actual: number | undefined) => 'positive' | 'warning' | 'neutral'
  onRecordToday: () => void
  onStartWorkout: () => void
}

export function TodayTab(props: TodayTabProps) {
  const hasRecommendations =
    props.dailyRecommendations.length > 0 ||
    props.trendAlerts.some((item) => item.tone !== 'positive') ||
    props.weekendRisk.tone !== 'positive'
  const missingItems = props.todaySnapshot.checklist.filter((item) => !item.done)
  const primaryAction = props.todaySnapshot.actions[0]
  const secondaryActions = props.todaySnapshot.actions.slice(1)

  return (
    <div className="grid gap-3 sm:gap-4">
      <StatusHero
        eyebrow={`身体状态 · ${props.today} · ${dayNames[props.todayKey]}`}
        title={props.todaySnapshot.statusLabel}
        tone={props.todaySnapshot.tone}
        message={props.todaySnapshot.headline}
        actions={primaryAction ? (
          <Button
            className="w-full px-4 sm:w-auto"
            onClick={primaryAction.includes('训练') ? props.onStartWorkout : props.onRecordToday}
          >
            {primaryAction}
          </Button>
        ) : null}
        meta={
          <div className="flex flex-wrap gap-2">
            <Badge tone={props.target.isTrainingDay ? 'positive' : 'neutral'}>
              {props.target.isTrainingDay ? '训练日' : '休息日'}
            </Badge>
            <Badge tone="neutral">{props.target.workoutName}</Badge>
          </div>
        }
      />

      {missingItems.length > 0 ? (
        <Card>
          <SectionHeader
            title="待补记录"
            description="先补齐这些字段，建议判断才可靠。"
            action={<Badge tone="warning">{missingItems.length} 项待补</Badge>}
          />
          <MetricGrid className="mt-3 lg:grid-cols-4">
            {missingItems.map((item) => (
              <InsightCard key={item.key} title={item.label} message={item.helper} tone="warning" />
            ))}
          </MetricGrid>
        </Card>
      ) : null}

      <Card>
        <SectionHeader title="今日行动" description="只突出当前最重要动作，其余作为补充。" />
        <div className="mt-3 grid gap-2">
          <ActionCard
            title={primaryAction ?? (props.target.isTrainingDay ? '完成今日训练' : '守住恢复节奏')}
            description={primaryAction?.includes('训练') ? '进入训练页后从当前动作开始记录。' : '进入记录页补齐今日状态。'}
            tone={props.todaySnapshot.tone}
            action={primaryAction ? (
              <Button
                className="w-full sm:w-auto"
                variant={primaryAction.includes('训练') ? 'primary' : 'secondary'}
                onClick={primaryAction.includes('训练') ? props.onStartWorkout : props.onRecordToday}
              >
                去处理
              </Button>
            ) : null}
          />
          {secondaryActions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {secondaryActions.map((action) => (
                <Button
                  key={action}
                  variant="secondary"
                  className="px-3"
                  onClick={action.includes('训练') ? props.onStartWorkout : props.onRecordToday}
                >
                  {action}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <SectionHeader title="本周趋势" description="只看会影响今天判断的信号。" />
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {props.todaySnapshot.weeklySignals.map((signal) => (
            <InsightCard key={signal.label} title={signal.label} value={signal.value} tone={signal.tone} />
          ))}
        </div>
      </Card>

      <TipsDetails defaultOpen={false} summary="今日训练动作和详细预算">
        <div className="mt-3 grid gap-4">
          <section className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">今日计划</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{props.target.workoutName}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{props.plan.focus}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" className="px-3" onClick={props.onRecordToday}>记录今天</Button>
                <Button className="px-3" onClick={props.onStartWorkout}>{props.target.isTrainingDay ? '开始训练' : '查看训练'}</Button>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <InsightCard title="热量" value={props.target.calories ?? `${props.target.calorieRange?.[0]}-${props.target.calorieRange?.[1]}`} message="kcal" />
              <InsightCard title="蛋白质" value={props.target.protein} message="g" />
              <InsightCard title="步数" value={props.target.stepTarget} message="步" />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
              <SectionHeader title="本周热量预算" />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <BudgetTile label="已摄入" value={`${props.dashboardStats.calorieBudget.consumed} kcal`} />
                <BudgetTile
                  label="剩余额度"
                  value={`${props.dashboardStats.calorieBudget.remaining} kcal`}
                  danger={props.dashboardStats.calorieBudget.remaining < 0}
                />
                <BudgetTile label="剩余天数" value={`${props.dashboardStats.calorieBudget.remainingDays} 天`} />
                <BudgetTile
                  label="平均还能吃"
                  value={props.hasWeeklyCalorieLogs ? `${props.dashboardStats.calorieBudget.averagePerRemainingDay} kcal/天` : '本周暂无摄入记录'}
                  danger={props.hasWeeklyCalorieLogs && props.dashboardStats.calorieBudget.averagePerRemainingDay < 1500}
                />
              </div>
            </section>

            <section className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
              <SectionHeader title="今日宏量剩余额度" />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MacroTile label="热量" value={props.signedRemaining(props.todayCalorieTarget, props.todayLog?.calories)} unit="kcal" tone={props.remainingTone(props.todayCalorieTarget, props.todayLog?.calories)} />
                <MacroTile label="蛋白质" value={props.signedRemaining(props.target.protein, props.todayLog?.protein)} unit="g" tone={props.remainingTone(props.target.protein, props.todayLog?.protein)} />
                <MacroTile label="碳水" value={props.signedRemaining(props.target.carbs, props.todayLog?.carbs)} unit="g" tone={props.remainingTone(props.target.carbs, props.todayLog?.carbs)} />
                <MacroTile label="脂肪" value={props.signedRemaining(props.target.fat, props.todayLog?.fat)} unit="g" tone={props.remainingTone(props.target.fat, props.todayLog?.fat)} />
              </div>
            </section>
          </div>

          <section className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionHeader title="训练动作" />
              <Badge tone="neutral">{props.plan.name}</Badge>
            </div>
            {props.plan.exercises.length === 0 ? (
              <EmptyState title="休息日" message="无训练动作，专注吃好、睡好、走走。" />
            ) : (
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {props.plan.exercises.map((exercise, index) => (
                  <div key={exercise.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{index + 1}. {exercise.name}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{exercise.prescription}</p>
                    {exercise.note ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{exercise.note}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </TipsDetails>

      <div className="grid gap-3">
        <TipsDetails defaultOpen={hasRecommendations} summary="今日提示">
          <div className="mt-3 grid gap-2">
            <RecommendationBox title={props.weekendRisk.title} message={props.weekendRisk.message} tone={props.weekendRisk.tone} />
            {props.trendAlerts.map((item) => (
              <RecommendationBox key={item.title} title={item.title} message={item.message} tone={item.tone} />
            ))}
            {props.dailyRecommendations.map((item) => (
              <RecommendationBox key={item.title} title={item.title} message={item.message} tone={item.tone} />
            ))}
          </div>
        </TipsDetails>
      </div>
    </div>
  )
}
