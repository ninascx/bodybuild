import type { ReactNode } from 'react'
import { Button, EmptyState, InsightCard, RecommendationBox, SectionHeader } from '../ui'
import { BudgetTile, MacroTile } from '../BudgetTile'
import { TipsDetails } from '../TipsDetails'
import type { AdjustmentRecommendation, DailyLog, DailyTarget, WorkoutPlan } from '../../types'
import type { DashboardStats } from '../../lib/metrics'

function TodayDetailSection({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3 dark:border-slate-700 dark:bg-slate-800/70 ${className}`}>
      {children}
    </section>
  )
}

export function TodayDetailsPanels({
  target,
  plan,
  todayLog,
  dashboardStats,
  hasWeeklyCalorieLogs,
  weeklyCalorieTarget,
  todayCalorieTarget,
  weekendRisk,
  trendAlerts,
  dailyRecommendations,
  signedRemaining,
  remainingTone,
  onRecordToday,
  onStartWorkout,
}: {
  target: DailyTarget
  plan: WorkoutPlan
  todayLog: Partial<DailyLog> | undefined
  dashboardStats: DashboardStats
  hasWeeklyCalorieLogs: boolean
  weeklyCalorieTarget: number
  todayCalorieTarget: number | undefined
  weekendRisk: AdjustmentRecommendation
  trendAlerts: AdjustmentRecommendation[]
  dailyRecommendations: AdjustmentRecommendation[]
  signedRemaining: (target: number | undefined, actual: number | undefined) => string
  remainingTone: (target: number | undefined, actual: number | undefined) => 'positive' | 'warning' | 'neutral'
  onRecordToday: () => void
  onStartWorkout: () => void
}) {
  return (
    <>
      <TipsDetails defaultOpen={false} summary="今日训练动作和详细预算">
        <div className="mt-3 grid gap-4">
          <TodayDetailSection>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">今日安排</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{target.workoutName}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{plan.focus}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" className="px-3" onClick={onRecordToday}>
                  记录数据
                </Button>
                <Button className="px-3" onClick={onStartWorkout}>
                  {target.isTrainingDay ? '开始训练' : '查看训练'}
                </Button>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <InsightCard title="热量" value={target.calories ?? `${target.calorieRange?.[0]}-${target.calorieRange?.[1]}`} message="kcal" />
              <InsightCard title="蛋白质" value={target.protein} message="g" />
              <InsightCard title="步数" value={target.stepTarget} message="步" />
            </div>
          </TodayDetailSection>

          <div className="grid gap-4 lg:grid-cols-2">
            <TodayDetailSection>
              <SectionHeader title="本周热量预算" action={<span className="text-sm text-slate-600 dark:text-slate-400">周目标 {weeklyCalorieTarget} kcal</span>} />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <BudgetTile label="已摄入" value={`${dashboardStats.calorieBudget.consumed} kcal`} />
                <BudgetTile
                  label="剩余"
                  value={`${dashboardStats.calorieBudget.remaining} kcal`}
                  danger={dashboardStats.calorieBudget.remaining < 0}
                />
                <BudgetTile label="剩余天数" value={`${dashboardStats.calorieBudget.remainingDays} 天`} />
                <BudgetTile
                  label="每天可吃"
                  value={hasWeeklyCalorieLogs ? `${dashboardStats.calorieBudget.averagePerRemainingDay} kcal` : '本周暂无记录'}
                  danger={hasWeeklyCalorieLogs && dashboardStats.calorieBudget.averagePerRemainingDay < 1500}
                />
              </div>
            </TodayDetailSection>

            <TodayDetailSection>
              <SectionHeader title="今日剩余额度" />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MacroTile label="热量" value={signedRemaining(todayCalorieTarget, todayLog?.calories)} unit="kcal" tone={remainingTone(todayCalorieTarget, todayLog?.calories)} />
                <MacroTile label="蛋白质" value={signedRemaining(target.protein, todayLog?.protein)} unit="g" tone={remainingTone(target.protein, todayLog?.protein)} />
                <MacroTile label="碳水" value={signedRemaining(target.carbs, todayLog?.carbs)} unit="g" tone={remainingTone(target.carbs, todayLog?.carbs)} />
                <MacroTile label="脂肪" value={signedRemaining(target.fat, todayLog?.fat)} unit="g" tone={remainingTone(target.fat, todayLog?.fat)} />
              </div>
            </TodayDetailSection>
          </div>

          <TodayDetailSection>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionHeader title="训练安排" />
              <span className="text-sm text-slate-600 dark:text-slate-400">{plan.name}</span>
            </div>
            {plan.exercises.length === 0 && (plan.cardio ?? []).length === 0 ? (
              <EmptyState title="休息日" message="无训练动作或有氧，专注吃好、睡好、走走。" />
            ) : (
              <div className="mt-4 grid gap-3">
                {plan.exercises.length > 0 ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {plan.exercises.map((exercise, index) => (
                      <div key={exercise.id} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-3 dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                          {index + 1}. {exercise.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{exercise.prescription}</p>
                        {exercise.note ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{exercise.note}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {(plan.cardio ?? []).length > 0 ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {(plan.cardio ?? []).map((cardio, index) => (
                      <div key={cardio.id} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-3 dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                          有氧 {index + 1}. {cardio.mode}
                        </p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          {cardio.durationMin ? `${cardio.durationMin} min` : '未设置时长'}
                        </p>
                        {cardio.note ? <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{cardio.note}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </TodayDetailSection>
        </div>
      </TipsDetails>

      <TipsDetails defaultOpen={false} summary="今日提示">
        <div className="mt-3 grid gap-2">
          <RecommendationBox title={weekendRisk.title} message={weekendRisk.message} tone={weekendRisk.tone} />
          {trendAlerts.map((item) => (
            <RecommendationBox key={item.title} title={item.title} message={item.message} tone={item.tone} />
          ))}
          {dailyRecommendations.map((item) => (
            <RecommendationBox key={item.title} title={item.title} message={item.message} tone={item.tone} />
          ))}
        </div>
      </TipsDetails>
    </>
  )
}
