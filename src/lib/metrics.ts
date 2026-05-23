import { dailyTargets, weeklyCalorieTarget } from '../data/plans'
import type { DailyLog, WorkoutLog, WeeklySummary } from '../types'
import {
  addDays,
  endOfWeekSaturday,
  getDayKey,
  getRecentWindow,
  isDateInRange,
  sortByDateAsc,
  sortByDateDesc,
  startOfWeekSunday,
} from './dates'

export interface DashboardStats {
  currentWeight?: number
  averageWeight7?: number
  weekAverageCalories?: number
  proteinMetDays: number
  trainingCompletionRate: number
  averageSteps?: number
  weekTotalCalories: number
  averageShoulderPain?: number
  calorieBudget: WeeklyCalorieBudget
}

export interface TrendPoint {
  date: string
  fullDate: string
  weight?: number
  weightAverage7?: number
  waist?: number
  calories?: number
  proteinMet?: number
  protein?: number
  shoulderPain?: number
}

export interface WeeklyCalorieBudget {
  target: number
  consumed: number
  remaining: number
  remainingDays: number
  averagePerRemainingDay: number
}

export interface TrainingPerformancePoint {
  date: string
  fullDate: string
  benchPress?: number
  chestPress?: number
  pulldown?: number
  row?: number
  squatOrLegPress?: number
  romanianDeadlift?: number
}

function average(values: Array<number | undefined>): number | undefined {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (valid.length === 0) return undefined
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function round(value: number | undefined, digits = 1): number | undefined {
  if (typeof value !== 'number') return undefined
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

export function latestDailyLog(logs: DailyLog[]): DailyLog | undefined {
  return sortByDateDesc(logs).find(
    (log) =>
      log.morningWeightKg !== undefined ||
      log.calories !== undefined ||
      log.steps !== undefined ||
      log.sleepHours !== undefined,
  )
}

export function averageWeight(logs: DailyLog[], endDate: string, days: number): number | undefined {
  return round(average(getRecentWindow(logs, endDate, days).map((log) => log.morningWeightKg)))
}

export function logsForWeek(logs: DailyLog[], dateValue: string): DailyLog[] {
  const start = startOfWeekSunday(dateValue)
  const end = endOfWeekSaturday(dateValue)
  return sortByDateAsc(logs).filter((log) => isDateInRange(log.date, start, end))
}

export function calculateDashboardStats(logs: DailyLog[], today: string): DashboardStats {
  const weekLogs = logsForWeek(logs, today)
  const currentWeight = sortByDateDesc(logs).find((log) => log.morningWeightKg !== undefined)?.morningWeightKg
  const calories = weekLogs.map((log) => log.calories)
  const steps = weekLogs.map((log) => log.steps)
  const proteinMetDays = weekLogs.filter((log) => {
    if (log.protein === undefined) return false
    return log.protein >= dailyTargets[getDayKey(log.date)].protein
  }).length
  const trainingDays = weekLogs.filter((log) => dailyTargets[getDayKey(log.date)].isTrainingDay)
  const completedTraining = trainingDays.filter((log) => log.trained || (log.workoutCompletion ?? 0) >= 80).length
  const weekTotalCalories = calories.reduce<number>((sum, value) => sum + (value ?? 0), 0)
  const averageShoulderPain = round(average(weekLogs.map((log) => log.shoulderPainScore)))

  return {
    currentWeight: round(currentWeight),
    averageWeight7: averageWeight(logs, today, 7),
    weekAverageCalories: round(average(calories), 0),
    proteinMetDays,
    trainingCompletionRate: trainingDays.length ? Math.round((completedTraining / trainingDays.length) * 100) : 0,
    averageSteps: round(average(steps), 0),
    weekTotalCalories,
    averageShoulderPain,
    calorieBudget: calculateWeeklyCalorieBudget(logs, today),
  }
}

export function buildTrendData(logs: DailyLog[], today: string, days = 30): TrendPoint[] {
  const sorted = sortByDateAsc(logs)
  return getRecentWindow(sorted, today, days).map((log) => {
    const target = dailyTargets[getDayKey(log.date)]
    return {
      date: log.date.slice(5),
      fullDate: log.date,
      weight: log.morningWeightKg,
      weightAverage7: averageWeight(sorted, log.date, 7),
      waist: log.waistCm,
      calories: log.calories,
      protein: log.protein,
      proteinMet: log.protein !== undefined && log.protein >= target.protein ? 1 : 0,
      shoulderPain: log.shoulderPainScore,
    }
  })
}

export function calculateWeeklyCalorieBudget(logs: DailyLog[], today: string): WeeklyCalorieBudget {
  const weekLogs = logsForWeek(logs, today)
  const consumed = weekLogs.reduce((sum, log) => sum + (log.calories ?? 0), 0)
  const remaining = weeklyCalorieTarget - consumed
  const remainingDays = Math.max(1, 7 - getDayKey(today))
  return {
    target: weeklyCalorieTarget,
    consumed,
    remaining,
    remainingDays,
    averagePerRemainingDay: Math.round(remaining / remainingDays),
  }
}

function bestSetScore(weight: number | undefined, reps: number | undefined): number | undefined {
  if (!weight || !reps) return undefined
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

function performanceKey(name: string, id: string): keyof Omit<TrainingPerformancePoint, 'date' | 'fullDate'> | undefined {
  const text = `${id} ${name}`.toLowerCase()
  if (text.includes('bench') || name.includes('杠铃卧推')) return 'benchPress'
  if (text.includes('chest-press') || text.includes('machine-chest') || name.includes('胸推')) return 'chestPress'
  if (text.includes('pulldown') || name.includes('下拉') || name.includes('引体')) return 'pulldown'
  if (text.includes('row') || name.includes('划船')) return 'row'
  if (text.includes('squat') || text.includes('leg-press') || name.includes('深蹲') || name.includes('腿举')) return 'squatOrLegPress'
  if (text.includes('romanian') || name.includes('罗马尼亚硬拉')) return 'romanianDeadlift'
  return undefined
}

export function buildTrainingPerformanceData(workoutLogs: WorkoutLog[], today: string, days = 60): TrainingPerformancePoint[] {
  return getRecentWindow(workoutLogs, today, days).map((log) => {
    const point: TrainingPerformancePoint = {
      date: log.date.slice(5),
      fullDate: log.date,
    }

    log.exercises.forEach((exercise) => {
      const key = performanceKey(exercise.name, exercise.exerciseId)
      if (!key) return
      const best = Math.max(
        ...exercise.sets.map((set) => bestSetScore(set.weight, set.reps) ?? 0),
      )
      if (best > 0) {
        point[key] = Math.max(point[key] ?? 0, best)
      }
    })

    return point
  })
}

export function createWeeklySummary(logs: DailyLog[], today: string): WeeklySummary {
  const weekStart = startOfWeekSunday(today)
  const weekEnd = endOfWeekSaturday(today)
  const previousEnd = addDays(weekStart, -1)
  const previousStart = addDays(weekStart, -7)
  const weekLogs = sortByDateAsc(logs.filter((log) => isDateInRange(log.date, weekStart, weekEnd)))
  const previousLogs = sortByDateAsc(logs.filter((log) => isDateInRange(log.date, previousStart, previousEnd)))
  const averageCurrentWeight = round(average(weekLogs.map((log) => log.morningWeightKg)))
  const averagePreviousWeight = round(average(previousLogs.map((log) => log.morningWeightKg)))
  const firstWaist = weekLogs.find((log) => log.waistCm !== undefined)?.waistCm
  const lastWaist = sortByDateDesc(weekLogs).find((log) => log.waistCm !== undefined)?.waistCm
  const totalCalories = weekLogs.reduce((sum, log) => sum + (log.calories ?? 0), 0)
  const loggedCaloriesDays = weekLogs.filter((log) => log.calories !== undefined).length
  const weekendLogs = weekLogs.filter((log) => [5, 6].includes(getDayKey(log.date)))
  const weekendAverageCalories = round(average(weekendLogs.map((log) => log.calories)), 0)
  const trainingLogs = weekLogs.filter((log) => dailyTargets[getDayKey(log.date)].isTrainingDay)
  const completedTraining = trainingLogs.filter((log) => log.trained || (log.workoutCompletion ?? 0) >= 80).length
  const suggestions: string[] = []

  let calorieStatus: WeeklySummary['calorieStatus'] = 'unknown'
  if (loggedCaloriesDays >= 4) {
    if (totalCalories < weeklyCalorieTarget - 900) calorieStatus = 'low'
    else if (totalCalories > weeklyCalorieTarget + 900) calorieStatus = 'high'
    else calorieStatus = 'on-track'
  }

  if (calorieStatus === 'on-track') suggestions.push('本周热量接近 16000 kcal，先保持当前节奏。')
  if (calorieStatus === 'high') suggestions.push('本周热量偏高，优先检查周五周六是否超过自由饮食上限。')
  if (calorieStatus === 'low') suggestions.push('本周热量偏低，留意训练状态和疲劳，不用用极端节食补偿。')
  if ((weekendAverageCalories ?? 0) > 3000) suggestions.push('周末两天平均热量超过 3000 kcal，优先控制周末自由饮食，不要用极端压低工作日热量来补偿。')
  if (trainingLogs.length > 0 && completedTraining / trainingLogs.length < 0.8) suggestions.push('训练完成率偏低，下周优先保证主项和胸部关键动作。')
  if (suggestions.length === 0) suggestions.push('数据还不够完整，先连续记录体重、热量、步数和训练完成度。')

  return {
    weekStart,
    weekEnd,
    averageWeight: averageCurrentWeight,
    previousAverageWeight: averagePreviousWeight,
    weightDelta:
      averageCurrentWeight !== undefined && averagePreviousWeight !== undefined
        ? round(averageCurrentWeight - averagePreviousWeight)
        : undefined,
    waistDelta: firstWaist !== undefined && lastWaist !== undefined ? round(lastWaist - firstWaist) : undefined,
    trainingCompletionRate: trainingLogs.length ? Math.round((completedTraining / trainingLogs.length) * 100) : 0,
    totalCalories,
    calorieStatus,
    weekendAverageCalories,
    weekendOverLimit: (weekendAverageCalories ?? 0) > 3000,
    suggestions,
  }
}

export function roundMetric(value: number | undefined, digits = 1): string {
  return value === undefined ? '暂无' : String(round(value, digits))
}
