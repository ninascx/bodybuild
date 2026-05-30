import { Badge, Button, Card, InsightCard, PageHeader, SegmentedControl, StatCard } from '../components/ui'
import { ChartCard, ChartLegend, WeightTrendTooltip } from '../components/ChartCard'
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

function summarizeTrend(
  data: TrendPoint[],
  key: keyof Pick<TrendPoint, 'weight' | 'weightAverage7' | 'waist' | 'calories' | 'proteinMet'>,
  label: string,
  unit: string,
  digits = 1,
): string {
  const points = data.filter((point) => typeof point[key] === 'number')
  if (points.length === 0) return `${label}图表暂无可读数据。`
  const first = points[0]
  const last = points[points.length - 1]
  const firstValue = Number(first[key])
  const lastValue = Number(last[key])
  const diff = Math.round((lastValue - firstValue) * 10 ** digits) / 10 ** digits
  const direction = Math.abs(diff) < 0.01 ? '基本持平' : diff > 0 ? `上升 ${Math.abs(diff)}${unit}` : `下降 ${Math.abs(diff)}${unit}`
  return `${label}图表包含 ${points.length} 个记录点，从 ${first.fullDate} 的 ${firstValue}${unit} 到 ${last.fullDate} 的 ${lastValue}${unit}，整体${direction}。`
}

function summarizeProteinMet(data: TrendPoint[]): string {
  const points = data.filter((point) => typeof point.proteinMet === 'number')
  if (points.length === 0) return '蛋白质达标图表暂无可读数据。'
  const metCount = points.filter((point) => point.proteinMet === 1).length
  return `蛋白质达标图表包含 ${points.length} 天记录，其中 ${metCount} 天达标，${points.length - metCount} 天未达标。`
}

function summarizeTrainingPerformance(data: TrainingPerformancePoint[], showAllLines: boolean): string {
  const metrics: Array<[keyof Omit<TrainingPerformancePoint, 'date' | 'fullDate'>, string]> = showAllLines
    ? [
        ['benchPress', '卧推'],
        ['chestPress', '胸推'],
        ['pulldown', '下拉'],
        ['row', '划船'],
        ['squatOrLegPress', '深蹲/腿举'],
        ['romanianDeadlift', '罗马尼亚硬拉'],
      ]
    : [
        ['benchPress', '卧推'],
        ['chestPress', '胸推'],
      ]
  const summaries = metrics
    .map(([key, label]) => {
      const points = data.filter((point) => typeof point[key] === 'number')
      if (points.length === 0) return null
      const last = points[points.length - 1]
      return `${label}最近一次为 ${last[key]}，日期 ${last.fullDate}`
    })
    .filter((item): item is string => item !== null)

  return summaries.length > 0
    ? `训练表现图表包含 ${summaries.join('；')}。`
    : '训练表现图表暂无可读数据。'
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
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="体重 7 日均值是否下降"
          description="看均值，不被单日水分波动带跑。"
          isEmpty={!hasChartData(props.trendData, ['weight', 'weightAverage7'])}
          emptyMessage="连续记录晨起体重后，这里会显示每日体重和 7 日均值。"
          chartSummary={summarizeTrend(props.trendData, 'weightAverage7', '体重 7 日均值', ' kg')}
          legend={
            <ChartLegend
              items={[
                { label: '每日体重', color: '#059669' },
                { label: '7 日均重', color: '#2563eb', pattern: 'dashed' },
              ]}
            />
          }
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
          chartSummary={summarizeTrend(props.trendData, 'waist', '腰围', ' cm')}
          legend={<ChartLegend items={[{ label: '腰围', color: '#2563eb' }]} />}
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
          chartSummary={summarizeTrend(props.trendData, 'calories', '热量摄入', ' kcal', 0)}
          legend={<ChartLegend items={[{ label: '每日热量', color: '#f59e0b', pattern: 'area' }]} />}
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
          chartSummary={summarizeProteinMet(props.trendData)}
          legend={
            <ChartLegend
              items={[{ label: '达标 = 1，未达标 = 0', color: '#10b981', pattern: 'bar' }]}
              note="纵轴用于表达是否达标。"
            />
          }
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
          chartSummary={summarizeTrainingPerformance(props.trainingPerformanceData, props.showAllPerformanceLines)}
          legend={
            <ChartLegend
              items={[
                { label: '卧推', color: '#059669' },
                { label: '胸推', color: '#2563eb' },
                ...(props.showAllPerformanceLines
                  ? [
                      { label: '下拉', color: '#0891b2' },
                      { label: '划船', color: '#f59e0b' },
                      { label: '深蹲/腿举', color: '#0f766e' },
                      { label: '罗马尼亚硬拉', color: '#e11d48' },
                    ]
                  : []),
              ]}
            />
          }
          action={
            <Button
              variant="secondary"
              onClick={props.onTogglePerformanceLines}
              className="px-3 text-xs"
            >
              {props.showAllPerformanceLines ? '只看主要动作' : '显示全部动作'}
            </Button>
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
