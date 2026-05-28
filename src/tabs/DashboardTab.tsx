import { InsightCard, MetricGrid, PageHeader, RecommendationBox, SegmentedControl, StatCard } from '../components/ui'
import { ChartCard, WeightTrendTooltip } from '../components/ChartCard'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { roundMetric, buildWeightDelta, buildNeutralDelta, buildHigherIsBetterDelta } from '../lib/metrics'
import { hasChartData } from '../lib/workout'
import type { TrendPoint, DashboardStats, TrainingPerformancePoint } from '../lib/metrics'
import type { RecommendationTone } from '../types'

type DashboardTabProps = {
  dashboardStats: DashboardStats
  trendData: TrendPoint[]
  trainingPerformanceData: TrainingPerformancePoint[]
  trendDays: number
  weeklyCalorieTarget: number
  showAllPerformanceLines: boolean
  twoWeekAdjustment: { title: string; message: string; tone: RecommendationTone }
  weekendRisk: { title: string; message: string; tone: RecommendationTone }
  onTrendDaysChange: (days: 7 | 14 | 30 | 90) => void
  onTogglePerformanceLines: () => void
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

      <MetricGrid>
        <InsightCard
          title="两周调整"
          value={props.twoWeekAdjustment.title}
          message={props.twoWeekAdjustment.message}
          tone={props.twoWeekAdjustment.tone}
        />
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
      </MetricGrid>

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
      <RecommendationBox title={props.weekendRisk.title} message={props.weekendRisk.message} tone={props.weekendRisk.tone} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="体重 7 日均值是否下降"
          description="看均值，不被单日水分波动带跑。"
          isEmpty={!hasChartData(props.trendData, ['weight', 'weightAverage7'])}
          emptyMessage="连续记录晨起体重后，这里会显示每日体重和 7 日均值。"
        >
          <LineChart data={props.trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
            <Tooltip content={<WeightTrendTooltip />} />
            <Line type="monotone" name="每日体重" dataKey="weight" stroke="#059669" strokeWidth={2} dot={false} />
            <Line type="monotone" name="7 日均重" dataKey="weightAverage7" stroke="#2563eb" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ChartCard>
        <ChartCard
          title="腰围是否同步变化"
          description="体重不动但腰围下降时，不急着压热量。"
          isEmpty={!hasChartData(props.trendData, ['waist'])}
          emptyMessage="记录两次以上腰围后，这里会显示腰围趋势。"
        >
          <LineChart data={props.trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
            <Tooltip />
            <Line type="monotone" dataKey="waist" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>
        <ChartCard
          title="热量是否稳定执行"
          description="先看趋势，再决定是否调整目标。"
          isEmpty={!hasChartData(props.trendData, ['calories'])}
          emptyMessage="补齐每日热量后，这里会显示摄入趋势。"
        >
          <AreaChart data={props.trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="calories" stroke="#f59e0b" fill="#fef3c7" />
          </AreaChart>
        </ChartCard>
        <ChartCard
          title="蛋白质是否达标"
          description="用达标天数判断执行底线。"
          isEmpty={!hasChartData(props.trendData, ['proteinMet'])}
          emptyMessage="记录蛋白质后，这里会显示每日达标情况。"
        >
          <BarChart data={props.trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis ticks={[0, 1]} />
            <Tooltip />
            <Bar dataKey="proteinMet" fill="#10b981" />
          </BarChart>
        </ChartCard>
        <ChartCard
          title="训练表现是否维持"
          description="估算最佳工作组，用来观察主项是否下滑。"
          isEmpty={!hasChartData(props.trainingPerformanceData, ['benchPress', 'chestPress', 'pulldown', 'row', 'squatOrLegPress', 'romanianDeadlift'])}
          emptyMessage="记录几次训练重量和次数后，这里会显示主项表现。"
          action={
            <button
              type="button"
              onClick={props.onTogglePerformanceLines}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {props.showAllPerformanceLines ? '只看主要动作' : '显示全部动作'}
            </button>
          }
        >
          <LineChart data={props.trainingPerformanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" name="卧推" dataKey="benchPress" stroke="#059669" strokeWidth={2} dot={false} />
            <Line type="monotone" name="胸推" dataKey="chestPress" stroke="#2563eb" strokeWidth={2} dot={false} />
            {props.showAllPerformanceLines ? <Line type="monotone" name="下拉" dataKey="pulldown" stroke="#0891b2" strokeWidth={2} dot={false} /> : null}
            {props.showAllPerformanceLines ? <Line type="monotone" name="划船" dataKey="row" stroke="#f59e0b" strokeWidth={2} dot={false} /> : null}
            {props.showAllPerformanceLines ? <Line type="monotone" name="深蹲/腿举" dataKey="squatOrLegPress" stroke="#0f766e" strokeWidth={2} dot={false} /> : null}
            {props.showAllPerformanceLines ? <Line type="monotone" name="罗马尼亚硬拉" dataKey="romanianDeadlift" stroke="#e11d48" strokeWidth={2} dot={false} /> : null}
          </LineChart>
        </ChartCard>
      </div>
    </div>
  )
}
