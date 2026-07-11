import { Card, Badge, Button } from '../ui'
import { Sparkline } from '../TrendIndicator'
import type { DashboardStats, TrendPoint } from '../../lib/metrics'
import type { AdjustmentRecommendation } from '../../types'

type AnalyticsContextRailProps = {
  dashboardStats: DashboardStats
  trendData: TrendPoint[]
  trendAlerts?: AdjustmentRecommendation[]
  onExport?: () => void
}

export function AnalyticsContextRail({
  dashboardStats,
  trendData,
  trendAlerts = [],
  onExport,
}: AnalyticsContextRailProps) {
  const weightData = trendData
    .filter(p => p.weightAverage7 !== undefined)
    .slice(-14)
    .map(p => p.weightAverage7 as number)

  const calorieData = trendData
    .filter(p => p.calories !== undefined)
    .slice(-14)
    .map(p => p.calories as number)

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <Card className="elevation-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">关键指标</h3>
        <div className="space-y-3">
          <MetricRow
            label="7日均重"
            value={`${dashboardStats.averageWeight7?.toFixed(1) ?? '-'} kg`}
            sparkline={weightData}
            color="emerald"
          />
          <MetricRow
            label="周均热量"
            value={`${Math.round(dashboardStats.weekAverageCalories ?? 0)} kcal`}
            sparkline={calorieData}
            color="slate"
          />
          <MetricRow
            label="训练完成"
            value={`${dashboardStats.trainingCompletionRate}%`}
            badge={
              dashboardStats.trainingCompletionRate >= 80 ? '优秀' :
              dashboardStats.trainingCompletionRate >= 60 ? '良好' : '需改进'
            }
            badgeTone={
              dashboardStats.trainingCompletionRate >= 80 ? 'positive' :
              dashboardStats.trainingCompletionRate >= 60 ? 'warning' : 'danger'
            }
          />
        </div>
      </Card>

      {/* Trend Alerts */}
      {trendAlerts.length > 0 && (
        <Card className="elevation-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">⚠️ 趋势提醒</h3>
          <div className="space-y-2">
            {trendAlerts.slice(0, 3).map((alert, idx) => (
              <div
                key={idx}
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800/50 dark:bg-amber-950/30"
              >
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  {alert.title}
                </p>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                  {alert.message}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* This Week Summary */}
      <Card className="elevation-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">本周概览</h3>
        <div className="space-y-2 text-xs">
          <SummaryRow label="蛋白达标" value={`${dashboardStats.proteinMetDays} 天`} />
          <SummaryRow label="平均步数" value={`${Math.round(dashboardStats.averageSteps ?? 0)} 步`} />
          <SummaryRow label="总热量" value={`${Math.round(dashboardStats.weekTotalCalories ?? 0)} kcal`} />
        </div>
      </Card>

      {/* Actions */}
      <Card className="elevation-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">操作</h3>
        <div className="space-y-2">
          {onExport && (
            <Button variant="secondary" onClick={onExport} className="w-full text-sm">
              导出数据
            </Button>
          )}
          <Button variant="ghost" onClick={() => window.print()} className="w-full text-sm">
            打印报告
          </Button>
        </div>
      </Card>

      {/* Tips */}
      <Card className="elevation-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">💡 分析提示</h3>
        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          <li>• 至少 7 天数据才能看出趋势</li>
          <li>• 体重以 7 日均值为准</li>
          <li>• 关注训练完成率 ≥ 80%</li>
        </ul>
      </Card>
    </div>
  )
}

function MetricRow({
  label,
  value,
  sparkline,
  color,
  badge,
  badgeTone,
}: {
  label: string
  value: string
  sparkline?: number[]
  color?: 'emerald' | 'rose' | 'slate'
  badge?: string
  badgeTone?: 'positive' | 'warning' | 'danger'
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="text-xs text-slate-600 dark:text-slate-400">{label}</div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{value}</span>
          {badge && badgeTone && (
            <Badge tone={badgeTone} className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
      </div>
      {sparkline && sparkline.length >= 2 && (
        <Sparkline data={sparkline} color={color} className="h-8 w-16" />
      )}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  )
}
