import { lazy, Suspense, useState } from 'react'
import { Button, LoadingBlock, SegmentedControl, StatusHero } from '../components/ui'
import type { TrendPoint, DashboardStats, TrainingPerformanceData } from '../lib/metrics'
import type { AdjustmentRecommendation, DailyLog, RecommendationTone, WeeklySummary } from '../types'
import type { DailyFocusKey, TodayTaskPlan } from '../lib/productFlow'
import { addDays, startOfWeekSunday } from '../lib/dates'

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
  const decision = review.readiness === 'insufficient-data'
    ? { title: review.title, message: review.message, tone: props.taskPlan.tone }
    : view === 'weekly'
      ? props.weeklyConclusionCard
      : props.twoWeekAdjustment
  const decisionActions = review.readiness === 'insufficient-data'
    ? review.primaryDestination === 'daily'
      ? <Button onClick={() => props.onRecordToday(firstMissingRecord)}>补齐记录</Button>
      : review.primaryDestination === 'workout'
        ? <Button onClick={props.onStartWorkout}>处理训练</Button>
        : null
    : null

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 border-b border-[var(--surface-border)] pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          ariaLabel="复盘视图"
          value={view}
          options={[
            { value: 'dashboard', label: '趋势' },
            { value: 'weekly', label: '周报' },
          ]}
          onChange={(value) => setView(value as 'dashboard' | 'weekly')}
        />

        {view === 'dashboard' ? (
          <SegmentedControl
            ariaLabel="趋势时间范围"
            value={String(props.trendDays)}
            options={([7, 14, 30, 90] as const).map((days) => ({ value: String(days), label: `${days} 天` }))}
            onChange={(value) => props.onTrendDaysChange(Number(value) as 7 | 14 | 30 | 90)}
          />
        ) : (
          <div className="grid gap-1">
            <p className="text-right text-xs text-slate-500 dark:text-slate-400">{props.weeklySummary.weekStart} 至 {props.weeklySummary.weekEnd}</p>
            <div className="grid grid-cols-4 gap-1 sm:flex">
              <Button variant="secondary" className="px-3" onClick={() => props.onAnchorChange(addDays(props.weeklyAnchorDate, -7))} aria-label="上一周">上一周</Button>
              <Button variant="secondary" className="px-3" onClick={() => props.onAnchorChange(props.today)} disabled={startOfWeekSunday(props.weeklyAnchorDate) === startOfWeekSunday(props.today)}>本周</Button>
              <Button variant="secondary" className="px-3" onClick={() => props.onAnchorChange(addDays(props.weeklyAnchorDate, 7))} disabled={addDays(props.weeklyAnchorDate, 7) > props.today} aria-label="下一周">下一周</Button>
              <Button variant="secondary" className="px-3" onClick={props.onExportWeek}>导出</Button>
            </div>
          </div>
        )}
      </div>

      <StatusHero
        eyebrow={view === 'weekly' ? '本周结论' : '当前判断'}
        title={decision.title}
        message={decision.message}
        tone={decision.tone}
        actions={decisionActions}
        meta={review.missingSignals.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {review.missingSignals.map((signal) => (
              <span key={signal} className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{signal}</span>
            ))}
          </div>
        ) : undefined}
      />

      <Suspense fallback={<LoadingBlock title={view === 'dashboard' ? '正在加载趋势...' : '正在加载周报...'} lines={3} />}>
        {view === 'dashboard' ? (
          <DashboardTab
            dashboardStats={props.dashboardStats}
            trendData={props.trendData}
            trainingPerformanceData={props.trainingPerformanceData}
            weeklyCalorieTarget={props.weeklyCalorieTarget}
            showAllPerformanceLines={props.showAllPerformanceLines}
            onTogglePerformanceLines={props.onTogglePerformanceLines}
          />
        ) : (
          <WeeklyTab
            weeklySummary={props.weeklySummary}
            twoWeekAdjustment={props.twoWeekAdjustment}
            weekendRisk={props.weekendRisk}
            trendAlerts={props.trendAlerts}
            weeklyActionRecommendations={props.weeklyActionRecommendations}
            weekendCalorieUpperKcal={props.weekendCalorieUpperKcal}
            dailyLogs={props.dailyLogs}
          />
        )}
      </Suspense>
    </div>
  )
}
