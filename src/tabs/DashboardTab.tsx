import { lazy, Suspense } from 'react'
import { Badge, Card, InsightCard, PageHeader, SegmentedControl, StatCard } from '../components/ui'
import { Skeleton } from '../components/Skeleton'
import { roundMetric, buildWeightDelta, buildNeutralDelta, buildHigherIsBetterDelta } from '../lib/metrics'
import type { TrendPoint, DashboardStats, TrainingPerformanceData } from '../lib/metrics'
import type { RecommendationTone } from '../types'

// Lazy load all chart components to reduce initial bundle size
const DashboardCharts = lazy(() => import('../components/charts/DashboardCharts').then(m => ({ default: m.DashboardCharts })))

type DashboardTabProps = {
  dashboardStats: DashboardStats
  trendData: TrendPoint[]
  trainingPerformanceData: TrainingPerformanceData
  trendDays: number
  weeklyCalorieTarget: number
  showAllPerformanceLines: boolean
  twoWeekAdjustment: { title: string; message: string; tone: RecommendationTone }
  weekendRisk: { title: string; message: string; tone: RecommendationTone }
  onTrendDaysChange: (days: 7 | 14 | 30 | 90) => void
  onTogglePerformanceLines: () => void
}

function countTrendPoints(data: TrendPoint[], key: keyof TrendPoint): number {
  return data.filter((point) => typeof point[key] === 'number').length
}

function countTrainingPoints(data: TrainingPerformanceData): number {
  return data.points.filter((point) => data.series.some((series) => typeof point[series.key] === 'number')).length
}

export function DashboardTab(props: DashboardTabProps) {
  const weightTrendTone: RecommendationTone =
    props.dashboardStats.averageWeight7 === undefined || props.dashboardStats.previous.averageWeight7 === undefined
      ? 'neutral'
      : props.dashboardStats.averageWeight7 < props.dashboardStats.previous.averageWeight7
        ? 'positive'
        : props.dashboardStats.averageWeight7 > props.dashboardStats.previous.averageWeight7 + 0.3
          ? 'warning'
          : 'neutral'
  const trainingTone: RecommendationTone =
    props.dashboardStats.trainingCompletionRate >= 80
      ? 'positive'
      : props.dashboardStats.trainingCompletionRate >= 60
        ? 'warning'
        : 'danger'
  const weightTrendPoints = countTrendPoints(props.trendData, 'weightAverage7')
  const calorieTrendPoints = countTrendPoints(props.trendData, 'calories')
  const proteinTrendPoints = countTrendPoints(props.trendData, 'proteinMet')
  const trainingTrendPoints = countTrainingPoints(props.trainingPerformanceData)
  const reliableTrendCount = [
    weightTrendPoints >= 3,
    calorieTrendPoints >= 3,
    proteinTrendPoints >= 3,
    trainingTrendPoints >= 2,
  ].filter(Boolean).length
  const hasSparseData = reliableTrendCount < 2
  const missingDataHints = [
    weightTrendPoints < 3 ? `晨起体重还差 ${3 - weightTrendPoints} 次` : null,
    calorieTrendPoints < 3 ? `热量记录还差 ${3 - calorieTrendPoints} 天` : null,
    proteinTrendPoints < 3 ? `蛋白记录还差 ${3 - proteinTrendPoints} 天` : null,
    trainingTrendPoints < 2 ? `训练重量记录还差 ${2 - trainingTrendPoints} 次` : null,
  ].filter((item): item is string => item !== null)

  if (hasSparseData) {
    return (
      <div className="grid gap-3 sm:gap-4">
        <PageHeader
          eyebrow="仪表盘"
          title="先补数据，再看趋势"
          description="目前记录点还少，先明确缺口，避免被低可信图表误导。"
          actions={
            <SegmentedControl
              value={String(props.trendDays)}
              options={([7, 14, 30, 90] as const).map((days) => ({ value: String(days), label: `${days} 天` }))}
              onChange={(value) => props.onTrendDaysChange(Number(value) as 7 | 14 | 30 | 90)}
            />
          }
        />

        <section className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.45fr)]">
          <Card className="shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">当前判断</p>
              <Badge tone={props.twoWeekAdjustment.tone}>两周趋势</Badge>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-950 dark:text-slate-50">{props.twoWeekAdjustment.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{props.twoWeekAdjustment.message}</p>
          </Card>

          <Card className="shadow-none">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">需要再记录哪些数据</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              至少积累 3 个饮食/体重记录点和 2 次训练记录后，再展示趋势图表。
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {missingDataHints.map((hint) => (
                <div key={hint} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {hint}
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:gap-4">
      <PageHeader
        eyebrow="仪表盘"
        title="先看结论，再看图表"
        description="用最近数据判断体重、执行和恢复是否需要调整。"
        actions={
          <SegmentedControl
            value={String(props.trendDays)}
            options={([7, 14, 30, 90] as const).map((days) => ({ value: String(days), label: `${days} 天` }))}
            onChange={(value) => props.onTrendDaysChange(Number(value) as 7 | 14 | 30 | 90)}
          />
        }
      />

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.45fr)]">
        <Card className="shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">当前判断</p>
            <Badge tone={props.twoWeekAdjustment.tone}>两周趋势</Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-slate-950 dark:text-slate-50">{props.twoWeekAdjustment.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{props.twoWeekAdjustment.message}</p>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3">
          <InsightCard
            title="体重 7 日均值"
            value={`${roundMetric(props.dashboardStats.averageWeight7)} kg`}
            message={buildWeightDelta(props.dashboardStats.averageWeight7, props.dashboardStats.previous.averageWeight7)?.text ?? '记录不足'}
            tone={weightTrendTone}
          />
          <InsightCard
            title="训练完成率"
            value={`${props.dashboardStats.trainingCompletionRate}%`}
            message="低于 80% 时优先保主项"
            tone={trainingTone}
          />
          <InsightCard
            title="周末风险"
            value={props.weekendRisk.title}
            message={props.weekendRisk.message}
            tone={props.weekendRisk.tone}
          />
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard size="large" label="当前体重" value={`${roundMetric(props.dashboardStats.currentWeight)} kg`} />
        <StatCard
          size="large"
          label="7 日平均体重"
          value={`${roundMetric(props.dashboardStats.averageWeight7)} kg`}
          delta={buildWeightDelta(props.dashboardStats.averageWeight7, props.dashboardStats.previous.averageWeight7)}
        />
        <StatCard
          size="large"
          label="本周平均热量"
          value={`${roundMetric(props.dashboardStats.weekAverageCalories, 0)} kcal`}
          delta={buildNeutralDelta(props.dashboardStats.weekAverageCalories, props.dashboardStats.previous.weekAverageCalories, 'kcal', 0)}
        />
        <StatCard
          size="large"
          label="训练完成率"
          value={`${props.dashboardStats.trainingCompletionRate}%`}
          delta={buildHigherIsBetterDelta(props.dashboardStats.trainingCompletionRate, props.dashboardStats.previous.trainingCompletionRate, '%')}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="蛋白质达标天数"
          value={`${props.dashboardStats.proteinMetDays} 天`}
          helper="按每天目标判断"
          delta={buildHigherIsBetterDelta(props.dashboardStats.proteinMetDays, props.dashboardStats.previous.proteinMetDays, '天')}
        />
        <StatCard
          label="本周平均步数"
          value={`${roundMetric(props.dashboardStats.averageSteps, 0)} 步`}
          delta={buildHigherIsBetterDelta(props.dashboardStats.averageSteps, props.dashboardStats.previous.averageSteps, '步', 0)}
        />
        <StatCard label="周总热量进度" value={`${props.dashboardStats.weekTotalCalories} kcal`} helper={`目标约 ${props.weeklyCalorieTarget} kcal`} />
      </div>
      <Suspense fallback={
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton height="400px" />
          <Skeleton height="400px" />
          <Skeleton height="400px" />
          <Skeleton height="400px" />
          <div className="lg:col-span-2">
            <Skeleton height="400px" />
          </div>
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
