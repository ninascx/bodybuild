import { TodayDetailsPanels } from '../components/today/TodayDetailsPanels'
import { TodayOverview } from '../components/today/TodayOverview'
import type { AdjustmentRecommendation, DailyLog, DailyTarget, WorkoutPlan } from '../types'
import type { DashboardStats } from '../lib/metrics'
import type { TodaySnapshot } from '../lib/statusInsights'

type TodayTabProps = {
  today: string
  todayKey: number
  target: DailyTarget
  plan: WorkoutPlan
  todayLog: Partial<DailyLog> | undefined
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

  return (
    <div className="grid gap-3 sm:gap-4">
      <TodayOverview
        today={props.today}
        todayKey={props.todayKey}
        target={props.target}
        todaySnapshot={props.todaySnapshot}
        onRecordToday={props.onRecordToday}
        onStartWorkout={props.onStartWorkout}
      />

      <TodayDetailsPanels
        target={props.target}
        plan={props.plan}
        todayLog={props.todayLog}
        dashboardStats={props.dashboardStats}
        hasWeeklyCalorieLogs={props.hasWeeklyCalorieLogs}
        weeklyCalorieTarget={props.weeklyCalorieTarget}
        todayCalorieTarget={props.todayCalorieTarget}
        weekendRisk={props.weekendRisk}
        trendAlerts={props.trendAlerts}
        dailyRecommendations={props.dailyRecommendations}
        hasRecommendations={hasRecommendations}
        signedRemaining={props.signedRemaining}
        remainingTone={props.remainingTone}
        onRecordToday={props.onRecordToday}
        onStartWorkout={props.onStartWorkout}
      />
    </div>
  )
}
