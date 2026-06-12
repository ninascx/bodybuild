import { useMemo } from 'react'
import { addDays, parseDateInput } from '../lib/dates'
import { isCardioLogMeaningful } from '../lib/workout'
import type { DailyLog, WorkoutLog } from '../types'
import { Button } from './ui'

const weekHeaders = ['日', '一', '二', '三', '四', '五', '六'] as const

function hasDailyContent(log: DailyLog | undefined): boolean {
  if (!log) return false
  return (
    log.morningWeightKg !== undefined ||
    log.calories !== undefined ||
    log.protein !== undefined ||
    log.steps !== undefined ||
    log.sleepHours !== undefined ||
    log.waistCm !== undefined ||
    log.chestCm !== undefined ||
    log.upperArmCm !== undefined ||
    log.thighCm !== undefined ||
    log.carbs !== undefined ||
    log.fat !== undefined ||
    log.workoutCompletion !== undefined ||
    log.fatigueScore !== undefined ||
    log.trained !== undefined ||
    (typeof log.notes === 'string' && log.notes.trim() !== '')
  )
}

function hasWorkoutContent(workout: WorkoutLog | undefined): boolean {
  if (!workout) return false
  if ((workout.cardio ?? []).some(isCardioLogMeaningful)) return true
  if (!Array.isArray(workout.exercises) || workout.exercises.length === 0) return false
  return workout.exercises.some((exercise) =>
    exercise.sets?.some((set) => set.weight !== undefined || set.reps !== undefined || set.rir !== undefined),
  )
}

/**
 * 最近 6 周（42 天）的迷你日历视图。
 * 网格的最后一周以本周六结尾，保证 "今天" 一定可见。
 */
export function MiniCalendar({
  selectedDate,
  today,
  dailyLogs,
  workoutLogs,
  onSelectDate,
  density = 'default',
}: {
  selectedDate: string
  today: string
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  onSelectDate: (date: string) => void
  density?: 'default' | 'compact'
}) {
  const dailyByDate = useMemo(() => {
    const map = new Map<string, DailyLog>()
    for (const log of dailyLogs) map.set(log.date, log)
    return map
  }, [dailyLogs])

  const workoutByDate = useMemo(() => {
    const map = new Map<string, WorkoutLog>()
    for (const log of workoutLogs) map.set(log.date, log)
    return map
  }, [workoutLogs])

  const cells = useMemo(() => {
    const todayDate = parseDateInput(today)
    if (Number.isNaN(todayDate.getTime())) return []
    // 让最后一行以本周的周六（dayOfWeek === 6）结尾，保证今天在网格内可见。
    const todayDow = todayDate.getDay() // 0..6, 0=周日, 6=周六
    const daysUntilSaturday = 6 - todayDow
    const lastDate = addDays(today, daysUntilSaturday)
    const startDate = addDays(lastDate, -41) // 总共 6×7=42 天
    const result: Array<{ date: string; day: number; isFuture: boolean }> = []
    for (let i = 0; i < 42; i++) {
      const date = addDays(startDate, i)
      const parsed = parseDateInput(date)
      result.push({
        date,
        day: parsed.getDate(),
        isFuture: date > today,
      })
    }
    return result
  }, [today])

  if (cells.length === 0) return null
  const compact = density === 'compact'
  const containerClass = compact
    ? 'rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900'
    : 'rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900'
  const headingClass = compact
    ? 'grid gap-1.5'
    : 'flex items-center justify-between'
  const legendClass = compact
    ? 'flex items-center gap-2 text-[11px] leading-none text-slate-500 dark:text-slate-400'
    : 'flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400'
  const weekdayClass = compact
    ? 'mt-2 grid grid-cols-7 gap-0.5 text-center text-[11px] text-slate-400 dark:text-slate-500'
    : 'mt-2 grid grid-cols-7 gap-1 text-center text-xs text-slate-400 dark:text-slate-500'
  const calendarGridClass = compact
    ? 'mt-1 grid grid-cols-7 gap-0.5'
    : 'mt-1 grid grid-cols-7 gap-1'
  const cellBaseClass = compact
    ? 'relative h-8 min-h-0 min-w-0 w-full flex-col gap-0.5 rounded-md px-0.5 py-1 text-[11px] font-medium shadow-none'
    : 'relative min-h-11 min-w-11 w-full flex-col gap-0.5 rounded-md px-1 py-1 text-xs font-medium shadow-none'
  const dotClass = compact ? 'h-1 w-1 rounded-full' : 'h-1.5 w-1.5 rounded-full'
  const dotRowClass = compact ? 'mt-0.5 flex h-1 items-center gap-0.5' : 'mt-0.5 flex h-1.5 items-center gap-0.5'

  return (
    <div className={containerClass}>
      <div className={headingClass}>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">最近 6 周</p>
        <p className={legendClass}>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> 已记录
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" /> 已训练
          </span>
        </p>
      </div>
      <div className={weekdayClass}>
        {weekHeaders.map((label) => (
          <div key={label} className="py-0.5">
            {label}
          </div>
        ))}
      </div>
      <div className={calendarGridClass}>
        {cells.map((cell) => {
          const isSelected = cell.date === selectedDate
          const isToday = cell.date === today
          const dailyHit = hasDailyContent(dailyByDate.get(cell.date))
          const workoutHit = hasWorkoutContent(workoutByDate.get(cell.date))
          let stateClass: string
          if (isSelected) {
            stateClass = 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500'
          } else if (cell.isFuture) {
            stateClass = 'border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-600'
          } else if (isToday) {
            stateClass =
              'border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800'
          } else {
            stateClass =
              'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
          }
          const ariaLabel = `${cell.date}${dailyHit ? '（已记录）' : ''}${workoutHit ? '（已训练）' : ''}`
          return (
            <Button
              key={cell.date}
              variant="secondary"
              onClick={() => {
                if (cell.isFuture) return
                onSelectDate(cell.date)
              }}
              disabled={cell.isFuture}
              aria-label={ariaLabel}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={isSelected}
              className={`${cellBaseClass} ${stateClass}`}
            >
              <span className="leading-none">{cell.day}</span>
              <span className={dotRowClass}>
                <span
                  className={`${dotClass} ${
                    dailyHit ? (isSelected ? 'bg-white' : 'bg-emerald-500') : 'bg-transparent'
                  }`}
                />
                <span
                  className={`${dotClass} ${
                    workoutHit ? (isSelected ? 'bg-white' : 'bg-sky-500') : 'bg-transparent'
                  }`}
                />
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
