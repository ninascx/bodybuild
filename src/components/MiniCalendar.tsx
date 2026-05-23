import { useMemo } from 'react'
import { addDays, parseDateInput } from '../lib/dates'
import type { DailyLog, WorkoutLog } from '../types'

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
    log.shoulderPainScore !== undefined ||
    log.fatigueScore !== undefined ||
    log.trained !== undefined ||
    (typeof log.notes === 'string' && log.notes.trim() !== '')
  )
}

function hasWorkoutContent(workout: WorkoutLog | undefined): boolean {
  if (!workout) return false
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
}: {
  selectedDate: string
  today: string
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  onSelectDate: (date: string) => void
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

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">最近 6 周</p>
        <p className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> 已记录
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" /> 已训练
          </span>
        </p>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400 dark:text-slate-500">
        {weekHeaders.map((label) => (
          <div key={label} className="py-0.5">
            {label}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const isSelected = cell.date === selectedDate
          const isToday = cell.date === today
          const dailyHit = hasDailyContent(dailyByDate.get(cell.date))
          const workoutHit = hasWorkoutContent(workoutByDate.get(cell.date))
          const baseClass =
            'relative flex h-9 min-w-0 flex-col items-center justify-center rounded-md text-xs transition focus:outline-none'
          let stateClass: string
          if (isSelected) {
            stateClass = 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500'
          } else if (cell.isFuture) {
            stateClass = 'cursor-not-allowed bg-slate-50 text-slate-300 dark:bg-slate-800/50 dark:text-slate-600'
          } else if (isToday) {
            stateClass =
              'border border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800'
          } else {
            stateClass =
              'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
          }
          const ariaLabel = `${cell.date}${dailyHit ? '（已记录）' : ''}${workoutHit ? '（已训练）' : ''}`
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => {
                if (cell.isFuture) return
                onSelectDate(cell.date)
              }}
              disabled={cell.isFuture}
              aria-label={ariaLabel}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={isSelected}
              className={`${baseClass} ${stateClass}`}
            >
              <span className="leading-none">{cell.day}</span>
              <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    dailyHit ? (isSelected ? 'bg-white' : 'bg-emerald-500') : 'bg-transparent'
                  }`}
                />
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    workoutHit ? (isSelected ? 'bg-white' : 'bg-sky-500') : 'bg-transparent'
                  }`}
                />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
