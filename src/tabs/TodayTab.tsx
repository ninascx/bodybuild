import { Badge, Card, ProgressBar, RecommendationBox } from '../components/ui'
import { BudgetTile, MacroTile } from '../components/BudgetTile'
import { TipsDetails } from '../components/TipsDetails'
import { shoulderProtectionTips, dayNames } from '../data/plans'
import type { AdjustmentRecommendation, DailyLog, DailyTarget, TaskChecks, WorkoutLog, WorkoutPlan } from '../types'
import type { DashboardStats } from '../lib/metrics'

type TodayTabProps = {
  today: string
  todayKey: number
  target: DailyTarget
  plan: WorkoutPlan
  todayLog: Partial<DailyLog> | undefined
  todayWorkout: WorkoutLog | undefined
  checks: TaskChecks
  completion: number
  dashboardStats: DashboardStats
  dailyRecommendations: AdjustmentRecommendation[]
  weekendRisk: AdjustmentRecommendation
  pushShoulderRisk: AdjustmentRecommendation
  hasWeeklyCalorieLogs: boolean
  weeklyCalorieTarget: number
  todayCalorieTarget: number | undefined
  signedRemaining: (target: number | undefined, actual: number | undefined) => string
  remainingTone: (target: number | undefined, actual: number | undefined) => 'positive' | 'warning' | 'neutral'
  onToggleTask: (key: keyof TaskChecks) => void
}

export function TodayTab(props: TodayTabProps) {
  const taskItems: Array<[keyof TaskChecks, string]> = [
    ['diet', '饮食记录完成'],
    ['workout', props.target.isTrainingDay ? '训练完成' : '休息日任务完成'],
    ['steps', `步数完成 - ${props.target.stepTarget} 步`],
    ['sleep', '睡眠记录完成'],
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="bg-slate-950 text-white dark:bg-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-200">{props.today} · {dayNames[props.todayKey]}</p>
            <h2 className="mt-2 text-3xl font-semibold">{props.target.workoutName}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{props.plan.focus}</p>
          </div>
          <Badge tone={props.target.isTrainingDay ? 'positive' : 'neutral'}>{props.target.isTrainingDay ? '训练日' : '休息日'}</Badge>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-xs text-slate-300">热量</p>
            <p className="mt-1 text-xl font-semibold">{props.target.calories ?? `${props.target.calorieRange?.[0]}-${props.target.calorieRange?.[1]}`}</p>
            <p className="text-xs text-slate-300">kcal</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-xs text-slate-300">蛋白质</p>
            <p className="mt-1 text-xl font-semibold">{props.target.protein}</p>
            <p className="text-xs text-slate-300">g</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-xs text-slate-300">步数</p>
            <p className="mt-1 text-xl font-semibold">{props.target.stepTarget}</p>
            <p className="text-xs text-slate-300">步</p>
          </div>
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span>今日完成度</span>
            <span>{Math.round(props.completion)}%</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={props.completion} />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">一键勾选</h2>
        <div className="mt-4 grid gap-2">
          {taskItems.map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={props.checks[key] ?? false}
                onChange={() => props.onToggleTask(key)}
                className="h-5 w-5 rounded border-slate-300 text-emerald-600"
              />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>
      </Card>

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
        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {props.hasWeeklyCalorieLogs
            ? `预算按周日到周六、约 ${props.weeklyCalorieTarget} kcal 计算；如果周末偏高，优先控制周末自由饮食，不建议极端压低工作日热量。`
            : '先记录今天热量后，这里会开始计算本周剩余额度和剩余天数平均值。'}
        </p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">今日宏量营养剩余额度</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MacroTile label="热量" value={props.signedRemaining(props.todayCalorieTarget, props.todayLog?.calories)} unit="kcal" tone={props.remainingTone(props.todayCalorieTarget, props.todayLog?.calories)} />
          <MacroTile label="蛋白质" value={props.signedRemaining(props.target.protein, props.todayLog?.protein)} unit="g" tone={props.remainingTone(props.target.protein, props.todayLog?.protein)} />
          <MacroTile label="碳水" value={props.signedRemaining(props.target.carbs, props.todayLog?.carbs)} unit="g" tone={props.remainingTone(props.target.carbs, props.todayLog?.carbs)} />
          <MacroTile label="脂肪" value={props.signedRemaining(props.target.fat, props.todayLog?.fat)} unit="g" tone={props.remainingTone(props.target.fat, props.todayLog?.fat)} />
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">在"每日记录"输入已吃数据后，这里会自动更新。</p>
      </Card>

      <Card className="lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">今日训练动作</h2>
          <Badge tone="neutral">{props.plan.name}</Badge>
        </div>
        {props.plan.exercises.length === 0 ? (
          <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
            休息日，无训练动作。专注吃好、睡好、走走。
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {props.plan.exercises.map((exercise, index) => (
              <div key={exercise.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{index + 1}. {exercise.name}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{exercise.prescription}</p>
                {exercise.note ? <p className="mt-1 text-xs text-amber-700">{exercise.note}</p> : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <TipsDetails defaultOpen={false} summary="肩部保护提醒">
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {shoulderProtectionTips.map((tip) => (
            <li key={tip} className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800">{tip}</li>
          ))}
        </ul>
      </TipsDetails>

      <TipsDetails defaultOpen={props.weekendRisk.tone !== 'positive'} summary="今日提示">
        <div className="mt-3 grid gap-2">
          <RecommendationBox title={props.weekendRisk.title} message={props.weekendRisk.message} tone={props.weekendRisk.tone} />
          <RecommendationBox title={props.pushShoulderRisk.title} message={props.pushShoulderRisk.message} tone={props.pushShoulderRisk.tone} />
          {props.dailyRecommendations.map((item) => (
            <RecommendationBox key={item.title} title={item.title} message={item.message} tone={item.tone} />
          ))}
        </div>
      </TipsDetails>
    </div>
  )
}
