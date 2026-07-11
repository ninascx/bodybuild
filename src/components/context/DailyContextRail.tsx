import { Card, Button, Badge } from '../ui'
import type { DailyLog, DailyTarget } from '../../types'

type DailyContextRailProps = {
  today: string
  todayLog?: DailyLog
  dailyTarget: DailyTarget
  recentLogs: DailyLog[]
  onQuickFill?: () => void
  onCopyYesterday?: () => void
}

export function DailyContextRail({
  todayLog,
  dailyTarget,
  recentLogs,
  onQuickFill,
  onCopyYesterday,
}: DailyContextRailProps) {
  const todayProgress = {
    weight: todayLog?.morningWeightKg !== undefined,
    calories: todayLog?.calories !== undefined,
    protein: todayLog?.protein !== undefined,
    steps: todayLog?.steps !== undefined,
  }

  const completionRate = Object.values(todayProgress).filter(Boolean).length / 4 * 100

  return (
    <div className="space-y-4">
      {/* Today's Progress */}
      <Card className="elevation-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">今日完成度</h3>
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{Math.round(completionRate)}%</span>
            <Badge tone={completionRate >= 75 ? 'positive' : completionRate >= 50 ? 'warning' : 'danger'}>
              {completionRate >= 75 ? '优秀' : completionRate >= 50 ? '一般' : '需加油'}
            </Badge>
          </div>
          <div className="mt-3 space-y-2">
            <CheckItem label="晨起体重" checked={todayProgress.weight} />
            <CheckItem label="热量摄入" checked={todayProgress.calories} />
            <CheckItem label="蛋白质" checked={todayProgress.protein} />
            <CheckItem label="步数" checked={todayProgress.steps} />
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="elevation-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">快捷操作</h3>
        <div className="space-y-2">
          {onQuickFill && (
            <Button variant="secondary" onClick={onQuickFill} className="w-full text-sm">
              填入目标值
            </Button>
          )}
          {onCopyYesterday && (
            <Button variant="ghost" onClick={onCopyYesterday} className="w-full text-sm">
              复制昨天数据
            </Button>
          )}
        </div>
      </Card>

      {/* Recent History */}
      <Card className="elevation-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">最近记录</h3>
        <div className="space-y-2">
          {recentLogs.slice(0, 5).map((log) => (
            <div
              key={log.date}
              className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800"
            >
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {log.date.slice(5)}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {log.morningWeightKg ? `${log.morningWeightKg}kg` : '-'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Daily Targets */}
      <Card className="elevation-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">今日目标</h3>
        <div className="space-y-2 text-xs">
          <TargetItem label="热量" target={`${dailyTarget.calories} kcal`} />
          <TargetItem label="蛋白质" target={`${dailyTarget.protein} g`} />
          <TargetItem label="步数" target={`${dailyTarget.stepTarget} 步`} />
        </div>
      </Card>
    </div>
  )
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
          checked
            ? 'border-emerald-500 bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-400'
            : 'border-slate-300 dark:border-slate-600'
        }`}
      >
        {checked && (
          <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
    </div>
  )
}

function TargetItem({ label, target }: { label: string; target: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100">{target}</span>
    </div>
  )
}
