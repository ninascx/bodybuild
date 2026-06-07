import { dailyTargets, weeklyCalorieTarget } from '../data/plans'
import type { DailyLog, DailyTarget, DayKey, UserPreference, WorkoutLog, WeeklySummary } from '../types'
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
import { mergeUserPreference } from './userPreferences'
import { isSetComplete } from './workout'

export interface DashboardStats {
  currentWeight?: number
  averageWeight7?: number
  weekAverageCalories?: number
  proteinMetDays: number
  trainingCompletionRate: number
  averageSteps?: number
  weekTotalCalories: number
  calorieBudget: WeeklyCalorieBudget
  // 上一周对比，用于 KPI 趋势箭头
  previous: {
    averageWeight7?: number
    weekAverageCalories?: number
    proteinMetDays: number
    trainingCompletionRate: number
    averageSteps?: number
  }
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
}

export interface WeeklyCalorieBudget {
  target: number
  consumed: number
  remaining: number
  remainingDays: number
  averagePerRemainingDay: number
}

export interface TrainingPerformanceSetDetail {
  weight: number
  reps: number
  rir?: number
}

export interface TrainingPerformancePoint {
  date: string
  fullDate: string
  [key: string]: string | number | TrainingPerformanceSetDetail | undefined
}

export interface TrainingPerformanceSeries {
  key: string
  label: string
  color: string
  count: number
  latestDate: string
  latestValue: number
  latestSet: TrainingPerformanceSetDetail
  previousValue?: number
  delta?: number
  bestValue: number
  bestDate: string
}

export interface TrainingPerformanceData {
  points: TrainingPerformancePoint[]
  series: TrainingPerformanceSeries[]
  totalLoggedExercises: number
  totalScoredExercises: number
}

type DailyTargetMap = Record<DayKey, DailyTarget>

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

export function calculateDashboardStats(
  logs: DailyLog[],
  today: string,
  targets: DailyTargetMap = dailyTargets,
  calorieTarget = weeklyCalorieTarget,
): DashboardStats {
  const weekLogs = logsForWeek(logs, today)
  const currentWeight = sortByDateDesc(logs).find((log) => log.morningWeightKg !== undefined)?.morningWeightKg
  const calories = weekLogs.map((log) => log.calories)
  const steps = weekLogs.map((log) => log.steps)
  const proteinMetDays = weekLogs.filter((log) => {
    if (log.protein === undefined) return false
    return log.protein >= targets[getDayKey(log.date)].protein
  }).length
  const trainingDays = weekLogs.filter((log) => targets[getDayKey(log.date)].isTrainingDay)
  const completedTraining = trainingDays.filter((log) => log.trained || (log.workoutCompletion ?? 0) >= 80).length
  const weekTotalCalories = calories.reduce<number>((sum, value) => sum + (value ?? 0), 0)

  // 上一周对比
  const previousWeekAnchor = addDays(startOfWeekSunday(today), -1)
  const previousWeekLogs = logsForWeek(logs, previousWeekAnchor)
  const previousCalories = previousWeekLogs.map((log) => log.calories)
  const previousSteps = previousWeekLogs.map((log) => log.steps)
  const previousProteinMetDays = previousWeekLogs.filter((log) => {
    if (log.protein === undefined) return false
    return log.protein >= targets[getDayKey(log.date)].protein
  }).length
  const previousTrainingDays = previousWeekLogs.filter((log) => targets[getDayKey(log.date)].isTrainingDay)
  const previousCompletedTraining = previousTrainingDays.filter((log) => log.trained || (log.workoutCompletion ?? 0) >= 80).length

  return {
    currentWeight: round(currentWeight),
    averageWeight7: averageWeight(logs, today, 7),
    weekAverageCalories: round(average(calories), 0),
    proteinMetDays,
    trainingCompletionRate: trainingDays.length ? Math.round((completedTraining / trainingDays.length) * 100) : 0,
    averageSteps: round(average(steps), 0),
    weekTotalCalories,
    calorieBudget: calculateWeeklyCalorieBudget(logs, today, calorieTarget),
    previous: {
      averageWeight7: averageWeight(logs, previousWeekAnchor, 7),
      weekAverageCalories: round(average(previousCalories), 0),
      proteinMetDays: previousProteinMetDays,
      trainingCompletionRate: previousTrainingDays.length
        ? Math.round((previousCompletedTraining / previousTrainingDays.length) * 100)
        : 0,
      averageSteps: round(average(previousSteps), 0),
    },
  }
}

export function buildTrendData(logs: DailyLog[], today: string, days = 30, targets: DailyTargetMap = dailyTargets): TrendPoint[] {
  const sorted = sortByDateAsc(logs)
  const windowStart = addDays(today, -(days - 1))

  // 用 7 日滑动窗口预计算每个 log 的 7 日均重，避免 O(n²) 的 averageWeight 调用。
  // 注意：窗口需要看到 trend 范围之外的更早日期（最早的 trend 点也可能要往前 6 天找体重），
  // 所以遍历整个 sorted。
  const weightAvgByIndex = new Array<number | undefined>(sorted.length)
  let left = 0
  let sumWeight = 0
  let countWeight = 0
  for (let i = 0; i < sorted.length; i++) {
    const currentDate = sorted[i].date
    const minDate = addDays(currentDate, -6)
    while (left < i && sorted[left].date < minDate) {
      const dropping = sorted[left].morningWeightKg
      if (typeof dropping === 'number' && Number.isFinite(dropping)) {
        sumWeight -= dropping
        countWeight -= 1
      }
      left++
    }
    const incoming = sorted[i].morningWeightKg
    if (typeof incoming === 'number' && Number.isFinite(incoming)) {
      sumWeight += incoming
      countWeight += 1
    }
    weightAvgByIndex[i] = countWeight > 0 ? Math.round((sumWeight / countWeight) * 10) / 10 : undefined
  }

  const result: TrendPoint[] = []
  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i]
    if (log.date < windowStart || log.date > today) continue
    const target = targets[getDayKey(log.date)]
    result.push({
      date: log.date.slice(5),
      fullDate: log.date,
      weight: log.morningWeightKg,
      weightAverage7: weightAvgByIndex[i],
      waist: log.waistCm,
      calories: log.calories,
      protein: log.protein,
      proteinMet: log.protein !== undefined && log.protein >= target.protein ? 1 : 0,
    })
  }
  return result
}

export function calculateWeeklyCalorieBudget(logs: DailyLog[], today: string, calorieTarget = weeklyCalorieTarget): WeeklyCalorieBudget {
  const weekLogs = logsForWeek(logs, today)
  const consumed = weekLogs.reduce((sum, log) => sum + (log.calories ?? 0), 0)
  const remaining = calorieTarget - consumed
  const remainingDays = Math.max(1, 7 - getDayKey(today))
  return {
    target: calorieTarget,
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

const TRAINING_SERIES_COLORS = ['#059669', '#2563eb', '#0891b2', '#f59e0b', '#0f766e', '#e11d48', '#7c3aed', '#475569']

type TrainingSeriesDraft = Omit<TrainingPerformanceSeries, 'color'> & {
  values: number[]
}

function normalizeExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

function stableHash(value: string): string {
  let hash = 5381
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index)
  }
  return (hash >>> 0).toString(36)
}

function exercisePerformanceIdentity(id: string, name: string): string | undefined {
  const cleanId = id.trim()
  if (cleanId) return `id:${cleanId}`
  const normalizedName = normalizeExerciseName(name)
  return normalizedName ? `name:${normalizedName}` : undefined
}

function bestExerciseSet(sets: WorkoutLog['exercises'][number]['sets']): { score: number; detail: TrainingPerformanceSetDetail } | undefined {
  return sets.reduce<{ score: number; detail: TrainingPerformanceSetDetail } | undefined>((best, set) => {
    const score = bestSetScore(set.weight, set.reps)
    if (score === undefined || set.weight === undefined || set.reps === undefined) return best
    if (best && score <= best.score) return best
    return {
      score,
      detail: {
        weight: set.weight,
        reps: set.reps,
        rir: set.rir,
      },
    }
  }, undefined)
}

export function buildTrainingPerformanceData(workoutLogs: WorkoutLog[], today: string, days = 60): TrainingPerformanceData {
  const seriesDrafts = new Map<string, TrainingSeriesDraft>()
  let totalLoggedExercises = 0
  let totalScoredExercises = 0

  const points = getRecentWindow(workoutLogs, today, days).map((log) => {
    const point: TrainingPerformancePoint = {
      date: log.date.slice(5),
      fullDate: log.date,
    }

    log.exercises.forEach((exercise) => {
      totalLoggedExercises += 1
      const identity = exercisePerformanceIdentity(exercise.exerciseId, exercise.name)
      if (!identity) return
      const best = bestExerciseSet(exercise.sets)
      if (!best) return

      totalScoredExercises += 1
      const key = `exercise_${stableHash(identity)}`
      const label = exercise.name.trim() || '未命名动作'
      const existingValue = point[key]
      if (typeof existingValue !== 'number' || best.score > existingValue) {
        point[key] = best.score
        point[`${key}Meta`] = best.detail
      }

      const draft = seriesDrafts.get(key)
      if (!draft) {
        seriesDrafts.set(key, {
          key,
          label,
          count: 1,
          latestDate: log.date,
          latestValue: best.score,
          latestSet: best.detail,
          bestValue: best.score,
          bestDate: log.date,
          values: [best.score],
        })
        return
      }

      draft.count += 1
      draft.values.push(best.score)
      draft.label = label
      draft.latestDate = log.date
      draft.latestValue = best.score
      draft.latestSet = best.detail
      if (best.score > draft.bestValue) {
        draft.bestValue = best.score
        draft.bestDate = log.date
      }
    })

    return point
  })

  const series = Array.from(seriesDrafts.values())
    .map(({ values, ...draft }) => {
      const previousValue = values.length >= 2 ? values[values.length - 2] : undefined
      const delta = previousValue !== undefined ? Math.round((draft.latestValue - previousValue) * 10) / 10 : undefined
      return {
        ...draft,
        previousValue,
        delta,
        color: '',
      }
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      if (b.latestDate !== a.latestDate) return b.latestDate.localeCompare(a.latestDate)
      return a.label.localeCompare(b.label)
    })
    .map((seriesItem, index) => ({
      ...seriesItem,
      color: TRAINING_SERIES_COLORS[index % TRAINING_SERIES_COLORS.length],
    }))

  return {
    points,
    series,
    totalLoggedExercises,
    totalScoredExercises,
  }
}

export function createWeeklySummary(
  logs: DailyLog[],
  today: string,
  targets: DailyTargetMap = dailyTargets,
  calorieTarget = weeklyCalorieTarget,
  preference?: UserPreference,
): WeeklySummary {
  const settings = mergeUserPreference(preference)
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
  const trainingLogs = weekLogs.filter((log) => targets[getDayKey(log.date)].isTrainingDay)
  const completedTraining = trainingLogs.filter((log) => log.trained || (log.workoutCompletion ?? 0) >= 80).length
  const suggestions: string[] = []

  let calorieStatus: WeeklySummary['calorieStatus'] = 'unknown'
  if (loggedCaloriesDays >= 4) {
    if (totalCalories < calorieTarget - 900) calorieStatus = 'low'
    else if (totalCalories > calorieTarget + 900) calorieStatus = 'high'
    else calorieStatus = 'on-track'
  }

  if (calorieStatus === 'on-track') suggestions.push(`本周热量接近 ${calorieTarget} kcal，先保持当前节奏。`)
  if (calorieStatus === 'high') suggestions.push('本周热量偏高，优先检查周五/周六是否超过自由饮食上限。')
  if (calorieStatus === 'low') suggestions.push('本周热量偏低，先观察训练状态和疲劳，不用继续压低摄入。')
  if ((weekendAverageCalories ?? 0) > settings.weekendCalorieUpperKcal) suggestions.push(`周末两天平均热量超过 ${settings.weekendCalorieUpperKcal} kcal，先控制周末自由饮食，不用压低工作日热量来补偿。`)
  if (trainingLogs.length > 0 && completedTraining / trainingLogs.length < 0.8) suggestions.push('训练完成率偏低，下周优先保证主项质量，附件动作可以少做一点。')
  if (suggestions.length === 0) suggestions.push('数据还不够完整，先连续记录体重、热量、蛋白、步数和训练完成度。')

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
    weekendOverLimit: (weekendAverageCalories ?? 0) > settings.weekendCalorieUpperKcal,
    suggestions,
  }
}

export interface PreviousExerciseRecord {
  date: string
  bestWeight: number
  reps?: number
  rir?: number
  allSets?: Array<{ weight?: number; reps?: number; rir?: number }>
}

export function findPreviousExerciseRecord(
  workoutLogs: WorkoutLog[],
  exerciseId: string,
  exerciseName: string,
  beforeDate: string,
): PreviousExerciseRecord | undefined {
  const sorted = sortByDateDesc(workoutLogs).filter((log) => log.date < beforeDate)
  for (const log of sorted) {
    const match = log.exercises.find(
      (exercise) =>
        (exerciseId && exercise.exerciseId === exerciseId) ||
        (exerciseName.trim() && exercise.name.trim() === exerciseName.trim()),
    )
    if (!match) continue
    const filledSets = match.sets.filter(isSetComplete)
    if (filledSets.length === 0) continue
    const bestSet = filledSets.reduce((best, current) =>
      (current.weight ?? 0) > (best.weight ?? 0) ? current : best,
    )
    return {
      date: log.date,
      bestWeight: bestSet.weight as number,
      reps: bestSet.reps,
      rir: bestSet.rir,
      allSets: match.sets.filter(isSetComplete),
    }
  }
  return undefined
}

export function roundMetric(value: number | undefined, digits = 1): string {
  return value === undefined ? '暂无' : String(round(value, digits))
}

export type StatDelta = { direction: 'up' | 'down' | 'flat'; text: string; tone: 'positive' | 'warning' | 'neutral' }

function formatDeltaText(diff: number, unit: string, digits = 1): string {
  const scale = 10 ** digits
  const rounded = Math.round(diff * scale) / scale
  const abs = Math.abs(rounded)
  if (abs === 0) return `较上周持平`
  return `较上周 ${rounded > 0 ? '+' : '−'}${abs}${unit}`
}

// 体重：变化方向不简单代表好坏，用中性色显示，但箭头方向真实反映上下
export function buildWeightDelta(current: number | undefined, previous: number | undefined): StatDelta | undefined {
  if (current === undefined || previous === undefined) return undefined
  const diff = current - previous
  const direction: StatDelta['direction'] = diff > 0.05 ? 'up' : diff < -0.05 ? 'down' : 'flat'
  return { direction, text: formatDeltaText(diff, ' kg', 1), tone: 'neutral' }
}

// 越高越好：达标天数 / 完成率 / 步数
export function buildHigherIsBetterDelta(
  current: number | undefined,
  previous: number | undefined,
  unit: string,
  digits = 0,
): StatDelta | undefined {
  if (current === undefined || previous === undefined) return undefined
  const diff = current - previous
  const direction: StatDelta['direction'] = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  const tone: StatDelta['tone'] = diff > 0 ? 'positive' : diff < 0 ? 'warning' : 'neutral'
  return { direction, text: formatDeltaText(diff, unit ? ` ${unit}` : '', digits), tone }
}

// 中性指标（如热量），只显示方向不评价好坏
export function buildNeutralDelta(
  current: number | undefined,
  previous: number | undefined,
  unit: string,
  digits = 0,
): StatDelta | undefined {
  if (current === undefined || previous === undefined) return undefined
  const diff = current - previous
  const direction: StatDelta['direction'] = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  return { direction, text: formatDeltaText(diff, unit ? ` ${unit}` : '', digits), tone: 'neutral' }
}
