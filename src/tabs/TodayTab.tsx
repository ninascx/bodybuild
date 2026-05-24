import { Badge, Button, Card, RecommendationBox } from '../components/ui'
import { BudgetTile, MacroTile } from '../components/BudgetTile'
import { TipsDetails } from '../components/TipsDetails'
import { dayNames } from '../data/plans'
import type { AdjustmentRecommendation, DailyLog, DailyTarget, WorkoutLog, WorkoutPlan } from '../types'
import type { DashboardStats } from '../lib/metrics'

type TodayTabProps = {
  today: string
  todayKey: number
  target: DailyTarget
  plan: WorkoutPlan
  todayLog: Partial<DailyLog> | undefined
  todayWorkout: WorkoutLog | undefined
  dashboardStats: DashboardStats
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
    props.weekendRisk.tone !== 'positive'

  return (
    <div className="grid gap-4">
      {/* 今日计划 — 全宽 */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{props.today} · {dayNames[props.todayKey]}</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">{props.target.workoutName}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{props.plan.focus}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={props.target.isTrainingDay ? 'positive' : 'neutral'}>{props.target.isTrainingDay ? '训练日' : '休息日'}</Badge>
            <Button variant="secondary" className="px-3" onClick={props.onRecordToday}>记录今天</Button>
            <Button className="px-3" onClick={props.onStartWorkout}>{props.target.isTrainingDay ? '开始训练' : '查看训练'}</Button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">热量</p>
            <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">{props.target.calories ?? `${props.target.calorieRange?.[0]}-${props.target.calorieRange?.[1]}`}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">kcal</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">蛋白质</p>
            <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">{props.target.protein}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">g</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">步数</p>
            <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">{props.target.stepTarget}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">步</p>
          </div>
        </div>
      </Card>

      {/* 预算 + 宏量营养 — 桌面端并排 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">本周热量预算</h2>
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
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">今日宏量营养剩余额度</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MacroTile label="热量" value={props.signedRemaining(props.todayCalorieTarget, props.todayLog?.calories)} unit="kcal" tone={props.remainingTone(props.todayCalorieTarget, props.todayLog?.calories)} />
            <MacroTile label="蛋白质" value={props.signedRemaining(props.target.protein, props.todayLog?.protein)} unit="g" tone={props.remainingTone(props.target.protein, props.todayLog?.protein)} />
            <MacroTile label="碳水" value={props.signedRemaining(props.target.carbs, props.todayLog?.carbs)} unit="g" tone={props.remainingTone(props.target.carbs, props.todayLog?.carbs)} />
            <MacroTile label="脂肪" value={props.signedRemaining(props.target.fat, props.todayLog?.fat)} unit="g" tone={props.remainingTone(props.target.fat, props.todayLog?.fat)} />
          </div>
        </Card>
      </div>

      {/* 今日训练动作 — 全宽 */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">今日训练动作</h2>
          <Badge tone="neutral">{props.plan.name}</Badge>
        </div>
        {props.plan.exercises.length === 0 ? (
          <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">休息日，无训练动作。专注吃好、睡好、走走。</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {props.plan.exercises.map((exercise, index) => (
              <div key={exercise.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{index + 1}. {exercise.name}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{exercise.prescription}</p>
                {exercise.note ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{exercise.note}</p> : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 提示 + 建议 */}
      <div className="grid gap-4">
        <TipsDetails defaultOpen={hasRecommendations} summary="今日提示">
          <div className="mt-3 grid gap-2">
            <RecommendationBox title={props.weekendRisk.title} message={props.weekendRisk.message} tone={props.weekendRisk.tone} />
            {props.dailyRecommendations.map((item) => (
              <RecommendationBox key={item.title} title={item.title} message={item.message} tone={item.tone} />
            ))}
          </div>
        </TipsDetails>
      </div>
    </div>
  )
}
