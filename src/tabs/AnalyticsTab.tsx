import { lazy, Suspense, useState } from 'react'
import { LoadingBlock, SegmentedControl } from '../components/ui'
import type { TrendPoint, DashboardStats, TrainingPerformanceData } from '../lib/metrics'
import type { AdjustmentRecommendation, DailyLog, WeeklySummary } from '../types'
import type { RecommendationTone } from '../types'

const DashboardTab = lazy(() => import('./DashboardTab').then((mod) => ({ default: mod.DashboardTab })))
const WeeklyTab = lazy(() => import('./WeeklyTab').then((mod) => ({ default: mod.WeeklyTab })))

type AnalyticsTabProps = {
  dashboardStats: DashboardStats
  trendData: TrendPoint[]
  trainingPerformanceData: TrainingPerformanceData
  trendDays: number
  weeklyCalorieTarget: number
  showAllPerformanceLines: boolean
  twoWeekAdjustment: { title: string; message: string; tone: RecommendationTone }
  weekendRisk: { title: string; message: string; tone: RecommendationTone }
  weeklySummary: WeeklySummary
  weeklyAnchorDate: string
  today: string
  weeklyConclusionCard: AdjustmentRecommendation
  trendAlerts: AdjustmentRecommendation[]
  weeklyActionRecommendations: AdjustmentRecommendation[]
  weekendCalorieUpperKcal: number
  dailyLogs: DailyLog[]
  onTrendDaysChange: (days: 7 | 14 | 30 | 90) => void
  onTogglePerformanceLines: () => void
  onAnchorChange: (date: string) => void
  onExportWeek: () => void
}

export function AnalyticsTab(props: AnalyticsTabProps) {
  const [view, setView] = useState<'dashboard' | 'weekly'>('dashboard')

  return (
    <div className="grid gap-4">
      <div className="flex justify-center">
        <SegmentedControl
          value={view}
          options={[
            { value: 'dashboard', label: '趋势' },
            { value: 'weekly', label: '周报' },
          ]}
          onChange={(value) => setView(value as 'dashboard' | 'weekly')}
        />
      </div>

      <Suspense fallback={<LoadingBlock title={view === 'dashboard' ? '正在加载趋势...' : '正在加载周报...'} lines={3} />}>
        {view === 'dashboard' ? (
          <DashboardTab
            dashboardStats={props.dashboardStats}
            trendData={props.trendData}
            trainingPerformanceData={props.trainingPerformanceData}
            trendDays={props.trendDays}
            weeklyCalorieTarget={props.weeklyCalorieTarget}
            showAllPerformanceLines={props.showAllPerformanceLines}
            twoWeekAdjustment={props.twoWeekAdjustment}
            weekendRisk={props.weekendRisk}
            onTrendDaysChange={props.onTrendDaysChange}
            onTogglePerformanceLines={props.onTogglePerformanceLines}
          />
        ) : (
          <WeeklyTab
            weeklySummary={props.weeklySummary}
            weeklyAnchorDate={props.weeklyAnchorDate}
            today={props.today}
            twoWeekAdjustment={props.twoWeekAdjustment}
            weekendRisk={props.weekendRisk}
            weeklyConclusionCard={props.weeklyConclusionCard}
            trendAlerts={props.trendAlerts}
            weeklyActionRecommendations={props.weeklyActionRecommendations}
            weekendCalorieUpperKcal={props.weekendCalorieUpperKcal}
            dailyLogs={props.dailyLogs}
            onAnchorChange={props.onAnchorChange}
            onExportWeek={props.onExportWeek}
          />
        )}
      </Suspense>
    </div>
  )
}
