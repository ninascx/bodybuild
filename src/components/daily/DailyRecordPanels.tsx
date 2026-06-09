import type { ReactNode } from 'react'
import { MiniCalendar } from '../MiniCalendar'
import { NumberField } from '../NumberField'
import type { DailyLog, WorkoutLog } from '../../types'
import { DisclosurePanel } from '../ui'

type DimensionKey = 'waistCm' | 'chestCm' | 'upperArmCm' | 'thighCm'

type DetailPanelProps = {
  title: string
  summary?: string
  tone?: 'neutral' | 'warning'
  className?: string
  children: ReactNode
}

const detailPanelTone = {
  neutral: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-600/40 dark:bg-amber-900/30',
}

function DetailPanel({ title, summary, tone = 'neutral', className = 'mt-3', children }: DetailPanelProps) {
  return (
    <DisclosurePanel
      className={`${className} ${detailPanelTone[tone]}`}
      title={(
        <>
          {title}
          {summary ? <span className="font-normal text-slate-500 dark:text-slate-400"> · {summary}</span> : null}
        </>
      )}
      summaryClassName={tone === 'warning' ? 'hover:bg-amber-100/70 dark:hover:bg-amber-900/40' : undefined}
      contentClassName={tone === 'warning' ? 'border-amber-200 dark:border-amber-600/40' : undefined}
    >
      {children}
    </DisclosurePanel>
  )
}

export function DailyCalendarPanel({
  selectedDate,
  today,
  dailyLogs,
  workoutLogs,
  onSelectDate,
  className,
}: {
  selectedDate: string
  today: string
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  onSelectDate: (date: string) => void
  className?: string
}) {
  return (
    <DetailPanel title="最近 6 周日历" className={className}>
      <MiniCalendar
        selectedDate={selectedDate}
        today={today}
        dailyLogs={dailyLogs}
        workoutLogs={workoutLogs}
        onSelectDate={onSelectDate}
      />
    </DetailPanel>
  )
}

const dimensionFields: Array<[string, DimensionKey]> = [
  ['腰围', 'waistCm'],
  ['胸围', 'chestCm'],
  ['上臂', 'upperArmCm'],
  ['大腿', 'thighCm'],
]

function buildDimensionSummary(selectedLog: Partial<DailyLog>, previousLogs: DailyLog[]) {
  const previousDimensionByKey = new Map<DimensionKey, DailyLog>()

  for (const [, key] of dimensionFields) {
    const previous = previousLogs.find((log) => log[key] !== undefined)
    if (previous) previousDimensionByKey.set(key, previous)
  }

  return dimensionFields
    .map(([label, key]) => {
      const value = selectedLog[key]
      if (value === undefined) return null
      const previous = previousDimensionByKey.get(key)
      const previousValue = previous?.[key]
      if (previousValue === undefined) return `${label} ${value}cm`
      const diff = Math.round((value - previousValue) * 10) / 10
      if (diff === 0) return `${label} ${value}cm（持平）`
      return `${label} ${value}cm（比上次 ${diff > 0 ? '+' : ''}${diff}）`
    })
    .filter((value): value is string => value !== null)
    .join(' · ')
}

export function MeasurementPanel({
  selectedLog,
  previousLogs,
  onUpdateDailyLog,
  className,
  compact = false,
}: {
  selectedLog: Partial<DailyLog>
  previousLogs: DailyLog[]
  onUpdateDailyLog: (patch: Partial<DailyLog>) => void
  className?: string
  compact?: boolean
}) {
  const dimensionSummary = buildDimensionSummary(selectedLog, previousLogs)
  const gridClassName = compact
    ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-2'
    : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4'

  return (
    <DetailPanel title="围度 / 更多记录" summary={dimensionSummary} className={className}>
      <div className={gridClassName}>
        <NumberField label="腰围 cm" value={selectedLog.waistCm} step="0.1" kind="decimal" range={{ min: 30, max: 200 }} onChange={(value) => onUpdateDailyLog({ waistCm: value })} />
        <NumberField label="胸围 cm" value={selectedLog.chestCm} step="0.1" kind="decimal" range={{ min: 30, max: 200 }} onChange={(value) => onUpdateDailyLog({ chestCm: value })} />
        <NumberField label="上臂围 cm" value={selectedLog.upperArmCm} step="0.1" kind="decimal" range={{ min: 10, max: 80 }} onChange={(value) => onUpdateDailyLog({ upperArmCm: value })} />
        <NumberField label="大腿围 cm" value={selectedLog.thighCm} step="0.1" kind="decimal" range={{ min: 20, max: 120 }} onChange={(value) => onUpdateDailyLog({ thighCm: value })} />
        <NumberField label="实际碳水 g" value={selectedLog.carbs} range={{ min: 0, max: 1000, allowZero: true }} onChange={(value) => onUpdateDailyLog({ carbs: value })} />
        <NumberField label="实际脂肪 g" value={selectedLog.fat} range={{ min: 0, max: 500, allowZero: true }} onChange={(value) => onUpdateDailyLog({ fat: value })} />
      </div>
    </DetailPanel>
  )
}
