import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard, ChartLegend, WeightTrendTooltip } from '../ChartCard'
import type { TrendPoint, TrainingPerformanceData, TrainingPerformancePoint, TrainingPerformanceSeries, TrainingPerformanceSetDetail } from '../../lib/metrics'
import { hasChartData } from '../../lib/workout'

// Helper functions moved from DashboardTab
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
    .map((item) => {
      const detail = point[item.dataKey as keyof TrainingPerformancePoint]
      return {
        name: item.name || String(item.dataKey),
        value: item.value as number,
        color: item.color,
        detail: isTrainingSetDetail(detail) ? detail : undefined,
      }
    })
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 font-semibold text-slate-900 dark:text-slate-100">{point.fullDate}</div>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
              <span className="text-slate-700 dark:text-slate-300">{row.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900 dark:text-slate-100">{row.value}</span>
              {row.detail && <span className="text-xs text-slate-500 dark:text-slate-400">({formatTrainingSet(row.detail)})</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const DEFAULT_TRAINING_SERIES_LIMIT = 5

function visibleTrainingSeries(data: TrainingPerformanceData, showAllLines: boolean): TrainingPerformanceSeries[] {
  return showAllLines ? data.series : data.series.slice(0, DEFAULT_TRAINING_SERIES_LIMIT)
}

type DashboardChartsProps = {
  trendData: TrendPoint[]
  trainingPerformanceData: TrainingPerformanceData
  showAllPerformanceLines: boolean
  onTogglePerformanceLines: () => void
}

/**
 * All dashboard charts - lazy loaded to reduce initial bundle
 */
export function DashboardCharts({
  trendData,
  trainingPerformanceData,
  showAllPerformanceLines,
  onTogglePerformanceLines
}: DashboardChartsProps) {
  const visibleSeries = visibleTrainingSeries(trainingPerformanceData, showAllPerformanceLines)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Weight trend chart */}
      <ChartCard
        title="体重 7 日均值是否下降"
        description="看均值，不被单日水分波动带跑。"
        isEmpty={!hasChartData(trendData, ['weight', 'weightAverage7'])}
        emptyMessage="连续记录晨起体重后，这里会显示每日体重和 7 日均值。"
        chartSummary={summarizeTrend(trendData, 'weightAverage7', '体重 7 日均值', ' kg')}
        legend={
          <ChartLegend
            items={[
              { label: '每日体重', color: '#059669' },
              { label: '7 日均重', color: '#2563eb', pattern: 'dashed' },
            ]}
          />
        }
      >
        <LineChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
          <Tooltip content={<WeightTrendTooltip />} />
          <Line type="monotone" name="每日体重" dataKey="weight" stroke="#059669" strokeWidth={2} dot={false} />
          <Line type="monotone" name="7 日均重" dataKey="weightAverage7" stroke="#2563eb" strokeWidth={2} strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ChartCard>

      {/* Waist chart */}
      <ChartCard
        title="腰围是否同步变化"
        description="体重不动但腰围下降时，不急着压热量。"
        isEmpty={!hasChartData(trendData, ['waist'])}
        emptyMessage="连续记录腰围后，这里会显示腰围趋势。"
        chartSummary={summarizeTrend(trendData, 'waist', '腰围', ' cm')}
        legend={<ChartLegend items={[{ label: '腰围', color: '#2563eb' }]} />}
      >
        <LineChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
          <Tooltip />
          <Line type="monotone" dataKey="waist" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ChartCard>

      {/* Calories chart */}
      <ChartCard
        title="每日热量是否合理"
        description="工作日保持目标，周末允许放松。"
        isEmpty={!hasChartData(trendData, ['calories'])}
        emptyMessage="连续记录热量后，这里会显示每日热量摄入趋势。"
        chartSummary={summarizeTrend(trendData, 'calories', '热量摄入', ' kcal', 0)}
        legend={<ChartLegend items={[{ label: '每日热量', color: '#f59e0b', pattern: 'area' }]} />}
      >
        <AreaChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="calories" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
        </AreaChart>
      </ChartCard>

      {/* Protein chart */}
      <ChartCard
        title="蛋白质是否达标"
        description="目标每日 120g 以上，有助保持肌肉量。"
        isEmpty={!hasChartData(trendData, ['proteinMet'])}
        emptyMessage="连续记录蛋白质后，这里会显示每日达标情况。"
        chartSummary={summarizeProteinMet(trendData)}
        legend={
          <ChartLegend
            items={[
              { label: '达标', color: '#10b981' },
              { label: '未达标', color: '#f43f5e' },
            ]}
          />
        }
      >
        <BarChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis ticks={[0, 1]} />
          <Tooltip />
          <Bar dataKey="proteinMet" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      {/* Training performance chart - full width */}
      <div className="lg:col-span-2">
        <ChartCard
          title="训练表现"
          description="追踪每个动作的重量进步。"
          isEmpty={trainingPerformanceData.series.length === 0}
          emptyMessage="记录训练后，这里会显示主要动作的表现趋势。"
          chartSummary={summarizeTrainingPerformance(trainingPerformanceData, visibleSeries)}
          legend={
            <div className="flex items-center gap-4">
              <ChartLegend items={visibleSeries.map((s) => ({ label: s.label, color: s.color }))} />
              {trainingPerformanceData.series.length > DEFAULT_TRAINING_SERIES_LIMIT && (
                <button
                  type="button"
                  onClick={onTogglePerformanceLines}
                  className="text-sm text-teal-600 hover:text-teal-700 dark:text-cyan-400 dark:hover:text-cyan-300"
                >
                  {showAllPerformanceLines ? '收起' : `显示全部 ${trainingPerformanceData.series.length} 个动作`}
                </button>
              )}
            </div>
          }
        >
          <LineChart data={trainingPerformanceData.points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<TrainingPerformanceTooltip />} />
            {visibleSeries.map((series) => (
              <Line key={series.key} type="monotone" name={series.label} dataKey={series.key} stroke={series.color} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ChartCard>
      </div>
    </div>
  )
}
