import { lazy, Suspense, useMemo } from 'react'
import { Card, DisclosurePanel, StatCard } from '../components/ui'
import { Skeleton } from '../components/Skeleton'
import { TrendIndicator } from '../components/TrendIndicator'
import { roundMetric, buildHigherIsBetterDelta } from '../lib/metrics'
import type { TrendPoint, DashboardStats, TrainingPerformanceData } from '../lib/metrics'

const DashboardCharts = lazy(() => import('../components/charts/DashboardCharts').then((module) => ({ default: module.DashboardCharts })))

type DashboardTabProps = {
  dashboardStats: DashboardStats
  trendData: TrendPoint[]
  trainingPerformanceData: TrainingPerformanceData
  weeklyCalorieTarget: number
  showAllPerformanceLines: boolean
  onTogglePerformanceLines: () => void
}

function countTrendPoints(data: TrendPoint[], key: keyof TrendPoint): number {
  return data.filter((point) => typeof point[key] === 'number').length
}

function countTrainingPoints(data: TrainingPerformanceData): number {
  return data.points.filter((point) => data.series.some((series) => typeof point[series.key] === 'number')).length
}

export function DashboardTab(props: DashboardTabProps) {
  const weightTrendPoints = countTrendPoints(props.trendData, 'weightAverage7')
  const calorieTrendPoints = countTrendPoints(props.trendData, 'calories')
  const proteinTrendPoints = countTrendPoints(props.trendData, 'proteinMet')
  const trainingTrendPoints = countTrainingPoints(props.trainingPerformanceData)
  const reliableTrendCount = [weightTrendPoints >= 3, calorieTrendPoints >= 3, proteinTrendPoints >= 3, trainingTrendPoints >= 2].filter(Boolean).length
  const hasSparseData = reliableTrendCount < 2
  const missingDataHints = [
    weightTrendPoints < 3 ? `晨起体重还差 ${3 - weightTrendPoints} 次` : null,
    calorieTrendPoints < 3 ? `热量记录还差 ${3 - calorieTrendPoints} 天` : null,
    proteinTrendPoints < 3 ? `蛋白记录还差 ${3 - proteinTrendPoints} 天` : null,
    trainingTrendPoints < 2 ? `训练重量记录还差 ${2 - trainingTrendPoints} 次` : null,
  ].filter((item): item is string => item !== null)

  const weightSparkline = useMemo(() => props.trendData.filter((point) => point.weightAverage7 !== undefined).slice(-10).map((point) => point.weightAverage7 as number), [props.trendData])
  const calorieSparkline = useMemo(() => props.trendData.filter((point) => point.calories !== undefined).slice(-10).map((point) => point.calories as number), [props.trendData])
  const stepsSparkline = useMemo(() => props.trendData.filter((point) => point.steps !== undefined).slice(-10).map((point) => point.steps as number), [props.trendData])

  if (hasSparseData) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">先补足数据，再看趋势</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">至少积累 3 个饮食/体重记录点和 2 次训练记录后，再展示趋势图表。</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {missingDataHints.map((hint) => (
            <div key={hint} className="rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{hint}</div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 sm:gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          size="large"
          label="当前体重"
          value={<TrendIndicator value={props.dashboardStats.currentWeight ?? 0} previousValue={props.dashboardStats.previous.averageWeight7} format={(value) => `${roundMetric(value)} kg`} showSparkline={weightSparkline.length >= 3} sparklineData={weightSparkline} inverse />}
        />
        <StatCard
          size="large"
          label="7 日平均体重"
          value={<TrendIndicator value={props.dashboardStats.averageWeight7 ?? 0} previousValue={props.dashboardStats.previous.averageWeight7} format={(value) => `${roundMetric(value)} kg`} showSparkline={weightSparkline.length >= 3} sparklineData={weightSparkline} inverse />}
        />
        <StatCard
          size="large"
          label="本周平均热量"
          value={<TrendIndicator value={props.dashboardStats.weekAverageCalories ?? 0} previousValue={props.dashboardStats.previous.weekAverageCalories} format={(value) => `${roundMetric(value, 0)} kcal`} showSparkline={calorieSparkline.length >= 3} sparklineData={calorieSparkline} />}
        />
        <StatCard
          size="large"
          label="训练完成率"
          value={`${props.dashboardStats.trainingCompletionRate}%`}
          delta={buildHigherIsBetterDelta(props.dashboardStats.trainingCompletionRate, props.dashboardStats.previous.trainingCompletionRate, '%')}
        />
      </div>

      <DisclosurePanel title="更多指标" contentClassName="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="蛋白质达标天数" value={`${props.dashboardStats.proteinMetDays} 天`} helper="按每天目标判断" delta={buildHigherIsBetterDelta(props.dashboardStats.proteinMetDays, props.dashboardStats.previous.proteinMetDays, '天')} />
        <StatCard
          label="本周平均步数"
          value={<TrendIndicator value={props.dashboardStats.averageSteps ?? 0} previousValue={props.dashboardStats.previous.averageSteps} format={(value) => `${roundMetric(value, 0)} 步`} showSparkline={stepsSparkline.length >= 3} sparklineData={stepsSparkline} />}
        />
        <StatCard label="周总热量进度" value={`${props.dashboardStats.weekTotalCalories} kcal`} helper={`目标约 ${props.weeklyCalorieTarget} kcal`} />
      </DisclosurePanel>

      <Suspense fallback={
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton height="400px" />
          <Skeleton height="400px" />
          <Skeleton height="400px" />
          <Skeleton height="400px" />
          <div className="lg:col-span-2"><Skeleton height="400px" /></div>
        </div>
      }>
        <DashboardCharts
          trendData={props.trendData}
          trainingPerformanceData={props.trainingPerformanceData}
          showAllPerformanceLines={props.showAllPerformanceLines}
          onTogglePerformanceLines={props.onTogglePerformanceLines}
        />
      </Suspense>
    </div>
  )
}
