import { Card, StatCard } from '../components/ui'
import { ChartCard, WeightTrendTooltip } from '../components/ChartCard'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { roundMetric, buildWeightDelta, buildNeutralDelta, buildHigherIsBetterDelta } from '../lib/metrics'
import { hasChartData } from '../lib/workout'
import { weeklyCalorieTarget } from '../data/plans'
import type { TrendPoint, DashboardStats, TrainingPerformancePoint } from '../lib/metrics'

type DashboardTabProps = {
  dashboardStats: DashboardStats
  trendData: TrendPoint[]
  trainingPerformanceData: TrainingPerformancePoint[]
  trendDays: number
  showAllPerformanceLines: boolean
  twoWeekAdjustment: { title: string; message: string; tone: string }
  weekendRisk: { title: string; message: string; tone: string }
  onTrendDaysChange: (days: 7 | 14 | 30 | 90) => void
  onTogglePerformanceLines: () => void
}

export function DashboardTab(props: DashboardTabProps) {

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-3 shadow-sm">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">趋势图时间范围</p>
        <div className="flex flex-wrap gap-1">
          {([7, 14, 30, 90] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => props.onTrendDaysChange(days)}
              className={`min-h-9 rounded-md border px-3 text-sm font-medium transition ${
                props.trendDays === days
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-200'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {days} 天
            </button>
          ))}
        </div>
      </div>
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
        <StatCard label="周总热量进度" value={`${props.dashboardStats.weekTotalCalories} kcal`} helper={`目标约 ${weeklyCalorieTarget} kcal`} />
      </div>
      <Card>
        <p className="text-sm text-slate-500 dark:text-slate-400">两周建议</p>
        <p className="mt-2 font-semibold text-slate-950 dark:text-slate-50">{props.twoWeekAdjustment.title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{props.twoWeekAdjustment.message}</p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="体重趋势" isEmpty={!hasChartData(props.trendData, ['weight', 'weightAverage7'])}>
          <LineChart data={props.trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
            <Tooltip content={<WeightTrendTooltip />} />
            <Line type="monotone" name="每日体重" dataKey="weight" stroke="#059669" strokeWidth={2} dot={false} />
            <Line type="monotone" name="7 日均重" dataKey="weightAverage7" stroke="#0f172a" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ChartCard>
        <ChartCard title="腰围趋势" isEmpty={!hasChartData(props.trendData, ['waist'])}>
          <LineChart data={props.trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
            <Tooltip />
            <Line type="monotone" dataKey="waist" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>
        <ChartCard title="热量摄入趋势" isEmpty={!hasChartData(props.trendData, ['calories'])}>
          <AreaChart data={props.trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="calories" stroke="#ea580c" fill="#fed7aa" />
          </AreaChart>
        </ChartCard>
        <ChartCard title="蛋白质达标趋势" isEmpty={!hasChartData(props.trendData, ['proteinMet'])}>
          <BarChart data={props.trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis ticks={[0, 1]} />
            <Tooltip />
            <Bar dataKey="proteinMet" fill="#10b981" />
          </BarChart>
        </ChartCard>
        <ChartCard
          title="训练表现趋势（估算最佳工作组）"
          isEmpty={!hasChartData(props.trainingPerformanceData, ['benchPress', 'chestPress', 'pulldown', 'row', 'squatOrLegPress', 'romanianDeadlift'])}
          action={
            <button
              type="button"
              onClick={props.onTogglePerformanceLines}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
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
            {props.showAllPerformanceLines ? <Line type="monotone" name="下拉" dataKey="pulldown" stroke="#7c3aed" strokeWidth={2} dot={false} /> : null}
            {props.showAllPerformanceLines ? <Line type="monotone" name="划船" dataKey="row" stroke="#ea580c" strokeWidth={2} dot={false} /> : null}
            {props.showAllPerformanceLines ? <Line type="monotone" name="深蹲/腿举" dataKey="squatOrLegPress" stroke="#0f766e" strokeWidth={2} dot={false} /> : null}
            {props.showAllPerformanceLines ? <Line type="monotone" name="罗马尼亚硬拉" dataKey="romanianDeadlift" stroke="#be123c" strokeWidth={2} dot={false} /> : null}
          </LineChart>
        </ChartCard>
      </div>
    </div>
  )
}
