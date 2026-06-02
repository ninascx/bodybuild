import { Badge, Button, Card, InsightCard, PageHeader, SegmentedControl, StatCard } from '../components/ui'
import { ChartCard, ChartLegend, WeightTrendTooltip } from '../components/ChartCard'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { roundMetric, buildWeightDelta, buildNeutralDelta, buildHigherIsBetterDelta } from '../lib/metrics'
import { hasChartData } from '../lib/workout'
import type { TrendPoint, DashboardStats, TrainingPerformanceData, TrainingPerformancePoint, TrainingPerformanceSeries, TrainingPerformanceSetDetail } from '../lib/metrics'
import type { RecommendationTone } from '../types'

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

const DEFAULT_TRAINING_SERIES_LIMIT = 5

function visibleTrainingSeries(data: TrainingPerformanceData, showAllLines: boolean): TrainingPerformanceSeries[] {
  return showAllLines ? data.series : data.series.slice(0, DEFAULT_TRAINING_SERIES_LIMIT)
}

function countTrendPoints(data: TrendPoint[], key: keyof TrendPoint): number {
  return data.filter((point) => typeof point[key] === 'number').length
}

function countTrainingPoints(data: TrainingPerformanceData): number {
  return data.points.filter((point) => data.series.some((series) => typeof point[series.key] === 'number')).length
}

function formatTrainingDelta(delta: number | undefined): string {
  if (delta === undefined) return '还没有上一条可对比'
  if (Math.abs(delta) < 0.1) return '较上次持平'
  return delta > 0 ? `较上次 +${delta}` : `较上次 ${delta}`
}

function formatTrainingSet(detail: TrainingPerformanceSetDetail): string {
  return `${detail.weight}kg × ${detail.reps}次${detail.rir !== undefined ? ` · RIR ${detail.rir}` : ''}`
}

function summarizeTrainingPerformance(data: TrainingPerformanceData, series: TrainingPerformanceSeries[]): string {
  if (series.length === 0) return '训练表现图表暂无可读数据。'
  const summaries = series.slice(0, 4).map((item) => `${item.label}最近 ${item.latestValue}，${formatTrainingDelta(item.delta)}`)
  const extra = data.series.length > series.length ? `，另有 ${data.series.length - series.length} 个动作未显示` : ''
  return `训练表现图表包含 ${series.length} 个动作${extra}。${summaries.join('；')}。`
}

interface TrainingTooltipPayloadItem {
  dataKey?: string | number
  name?: string
  value?: number
  color?: string
  payload?: TrainingPerformancePoint
}

function isTrainingSetDetail(value: unknown): value is TrainingPerformanceSetDetail {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as TrainingPerformanceSetDetail).weight === 'number' &&
      typeof (value as TrainingPerformanceSetDetail).reps === 'number',
  )
}

function TrainingPerformanceTooltip({ active, payload }: { active?: boolean; payload?: TrainingTooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null
  const point = payload.find((item) => item.payload)?.payload
  if (!point) return null
  const rows = payload
    .filter((item) => typeof item.value === 'number' && item.dataKey !== undefined)
    .slice(0, 5)

  return (
    <div className="max-w-64 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs leading-5 shadow dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold text-slate-950 dark:text-slate-50">{point.fullDate}</p>
      <div className="mt-1 grid gap-1">
        {rows.map((item) => {
          const key = String(item.dataKey)
          const detail = point[`${key}Meta`]
          return (
            <div key={key} className="text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2">
                {item.color ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" /> : null}
                <span className="min-w-0 truncate font-medium">{item.name}</span>
              </div>
              <div className="pl-4 text-slate-500 dark:text-slate-400">
                估算 {item.value}
                {isTrainingSetDetail(detail) ? ` · ${formatTrainingSet(detail)}` : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
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
  const trainingSeries = visibleTrainingSeries(props.trainingPerformanceData, props.showAllPerformanceLines)
  const canToggleTrainingSeries = props.trainingPerformanceData.series.length > DEFAULT_TRAINING_SERIES_LIMIT
  const trainingEmptyMessage =
    props.trainingPerformanceData.totalLoggedExercises > 0 && props.trainingPerformanceData.totalScoredExercises === 0
      ? '已有训练动作，但还没有可计算的重量和次数。补齐本组重量、次数后，这里会显示动作表现。'
      : '记录几次训练重量和次数后，这里会按真实动作显示估算表现值。'
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
          description="按真实动作统计最佳工作组，观察自定义动作和主项是否下滑。"
          isEmpty={trainingSeries.length === 0}
          emptyMessage={trainingEmptyMessage}
          chartSummary={summarizeTrainingPerformance(props.trainingPerformanceData, trainingSeries)}
          legend={
            <div className="grid gap-3">
              <ChartLegend
                items={trainingSeries.map((series) => ({ label: series.label, color: series.color }))}
                note={props.trainingPerformanceData.series.length > trainingSeries.length ? `另有 ${props.trainingPerformanceData.series.length - trainingSeries.length} 个动作` : undefined}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                {trainingSeries.map((series) => (
                  <div key={`summary-${series.key}`} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: series.color }} aria-hidden="true" />
                      <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{series.label}</span>
                    </div>
                    <div className="mt-1 text-slate-600 dark:text-slate-300">
                      最近 {series.latestValue} · {formatTrainingSet(series.latestSet)}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      历史最好 {series.bestValue}（{series.bestDate}） · {formatTrainingDelta(series.delta)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
          action={
            canToggleTrainingSeries ? (
              <Button
                variant="secondary"
                onClick={props.onTogglePerformanceLines}
                className="px-3 text-xs"
              >
                {props.showAllPerformanceLines ? '只看常用动作' : '查看更多动作'}
              </Button>
            ) : null
          }
        >
          <LineChart data={props.trainingPerformanceData.points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<TrainingPerformanceTooltip />} />
            {trainingSeries.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                name={series.label}
                dataKey={series.key}
                stroke={series.color}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ChartCard>
      </div>
    </div>
  )
}
