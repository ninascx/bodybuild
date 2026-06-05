import { lazy, Suspense, useState } from 'react'
import { Button, Card, LoadingBlock, SegmentedControl } from '../components/ui'
import type { TrendPoint, DashboardStats, TrainingPerformanceData } from '../lib/metrics'
import type { AdjustmentRecommendation, DailyLog, WeeklySummary } from '../types'
import type { RecommendationTone } from '../types'
import type { DailyFocusKey, TodayTaskPlan } from '../lib/productFlow'

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
  taskPlan: TodayTaskPlan
  onTrendDaysChange: (days: 7 | 14 | 30 | 90) => void
  onTogglePerformanceLines: () => void
  onAnchorChange: (date: string) => void
  onExportWeek: () => void
  onRecordToday: (focusKey?: DailyFocusKey) => void
  onStartWorkout: () => void
}

export function AnalyticsTab(props: AnalyticsTabProps) {
  const [view, setView] = useState<'dashboard' | 'weekly'>('weekly')
  const review = props.taskPlan.review
  const firstMissingRecord = props.taskPlan.missingItems.find((item) => item.key !== 'training')?.key

  return (
    <div className="grid gap-4">
      <Card className="shadow-none">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">复盘判断</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">{review.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{review.message}</p>
            {review.missingSignals.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {review.missingSignals.map((signal) => (
                  <span key={signal} className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {signal}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="grid gap-2 sm:flex md:justify-end">
            {review.primaryDestination === 'daily' ? (
              <Button onClick={() => props.onRecordToday(firstMissingRecord)}>补齐记录</Button>
            ) : review.primaryDestination === 'workout' ? (
              <Button onClick={props.onStartWorkout}>处理训练</Button>
            ) : (
              <Button onClick={() => setView('weekly')}>看周报结论</Button>
            )}
            <Button variant="secondary" onClick={() => setView('dashboard')}>
              看趋势图
            </Button>
          </div>
        </div>
      </Card>

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
