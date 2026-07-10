import { bodyValue, latestBodyRecord } from '../../lib/bodyMetrics'
import type { BodyRecord, DailyLog, WorkoutLog } from '../../types'
import { Badge, Card } from '../ui'
import { keyRecordCompletion } from './dailyRecordActions'

function formatNumber(value: number | undefined, unit = ''): string {
  if (value === undefined) return '未填'
  return `${value}${unit}`
}

function buildTrendLabel(current: number | undefined, previous: number | undefined, unit: string): string {
  if (current === undefined) return '今天未填'
  if (previous === undefined) return '暂无上次数据'
  const diff = Math.round((current - previous) * 10) / 10
  if (diff === 0) return '较上次持平'
  return `较上次 ${diff > 0 ? '+' : ''}${diff}${unit}`
}

export function DailyRecordDesktopAside({
  selectedDate,
  selectedLog,
  selectedBodyRecords,
  bodyRecords,
  previousLogs,
  workoutLogs,
  onSelectDate,
}: {
  selectedDate: string
  selectedLog: Partial<DailyLog>
  selectedBodyRecords: BodyRecord[]
  bodyRecords: BodyRecord[]
  previousLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  onSelectDate: (date: string) => void
}) {
  const selectedWorkout = workoutLogs.find((log) => log.date === selectedDate)
  const previousWeight = latestBodyRecord(bodyRecords, 'weight', previousLogs[0]?.date)?.value
  const previousWaist = latestBodyRecord(bodyRecords, 'weist', previousLogs[0]?.date)?.value
  const selectedWeight = bodyValue(selectedBodyRecords, selectedDate, 'weight')
  const selectedWaist = bodyValue(selectedBodyRecords, selectedDate, 'weist')
  const completion = keyRecordCompletion({
    weight: selectedWeight,
    calories: selectedLog.calories,
    protein: selectedLog.protein,
  })
  const recentLogs = previousLogs.slice(0, 5)
  const workoutState = selectedLog.workoutCompletion !== undefined
    ? `${selectedLog.workoutCompletion}%`
    : selectedWorkout
      ? '有训练记录'
      : '未记录'

  return (
    <aside className="hidden self-stretch 2xl:block">
      <div data-daily-record-desktop-aside className="grid gap-3">
        <Card className="p-3 shadow-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">当天概览</p>
              <h3 className="mt-1 text-base font-semibold text-slate-950 dark:text-slate-50">{selectedDate}</h3>
            </div>
            <span role="status" aria-live="polite" aria-atomic="true">
              <Badge tone={completion.completed === completion.total ? 'positive' : completion.completed > 0 ? 'warning' : 'neutral'}>
                关键记录 {completion.completed}/{completion.total}
              </Badge>
            </span>
          </div>

          <dl className="mt-3 grid gap-2">
            <div className="flex items-center justify-between gap-3 rounded-md bg-[var(--surface-muted)] px-3 py-2 dark:bg-slate-800">
              <dt className="text-xs text-slate-500 dark:text-slate-400">体重</dt>
              <dd className="text-sm font-semibold tabular-nums text-slate-950 dark:text-slate-50">{formatNumber(selectedWeight, 'kg')}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md bg-[var(--surface-muted)] px-3 py-2 dark:bg-slate-800">
              <dt className="text-xs text-slate-500 dark:text-slate-400">热量 / 蛋白</dt>
              <dd className="text-sm font-semibold tabular-nums text-slate-950 dark:text-slate-50">
                {formatNumber(selectedLog.calories, 'kcal')} / {formatNumber(selectedLog.protein, 'g')}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md bg-[var(--surface-muted)] px-3 py-2 dark:bg-slate-800">
              <dt className="text-xs text-slate-500 dark:text-slate-400">训练</dt>
              <dd className="text-sm font-semibold text-slate-950 dark:text-slate-50">{workoutState}</dd>
            </div>
          </dl>

        </Card>

        <Card className="p-3 shadow-none">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">最近趋势</p>
          <div className="mt-3 grid gap-3">
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">体重</p>
                <p className="text-sm tabular-nums text-slate-600 dark:text-slate-300">{formatNumber(previousWeight, 'kg')}</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {buildTrendLabel(selectedWeight, previousWeight, 'kg')}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">腰围</p>
                <p className="text-sm tabular-nums text-slate-600 dark:text-slate-300">{formatNumber(previousWaist, 'cm')}</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {buildTrendLabel(selectedWaist, previousWaist, 'cm')}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 shadow-none">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">最近记录</p>
            <span className="text-xs text-slate-400 dark:text-slate-500">{recentLogs.length} 条</span>
          </div>
          <div className="mt-3 grid gap-2">
            {recentLogs.length > 0 ? recentLogs.map((log) => (
              <button
                key={log.date}
                type="button"
                className="rounded-md border border-[var(--surface-border)] bg-white px-3 py-2 text-left transition-colors hover:border-[var(--color-primary-300)] hover:bg-[var(--surface-selected)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-cyan-700/60 dark:hover:bg-cyan-950/20 dark:focus-visible:ring-cyan-500"
                onClick={() => onSelectDate(log.date)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{log.date}</span>
                  {log.trained ? <Badge tone="positive">训练</Badge> : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {formatNumber(bodyValue(bodyRecords, log.date, 'weight'), 'kg')} · {formatNumber(log.calories, 'kcal')} · {formatNumber(log.protein, 'g')}
                </p>
              </button>
            )) : (
              <p className="rounded-md border border-dashed border-[var(--surface-border)] px-3 py-4 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                还没有可对照的历史记录。
              </p>
            )}
          </div>
        </Card>
      </div>
    </aside>
  )
}
