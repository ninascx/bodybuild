import type { AdjustmentRecommendation, DailyLog, DailyTarget, DayKey, RecommendationTone, UserPreference, WeeklySummary, WorkoutLog } from '../types'
import { addDays, getDayKey, getRecentWindow, sortByDateAsc, sortByDateDesc } from './dates'
import { logsForWeek, type DashboardStats } from './metrics'
import { mergeUserPreference } from './userPreferences'
import { isCardioLogMeaningful } from './workout'

type DailyTargetMap = Record<DayKey, DailyTarget>

export interface TodayChecklistItem {
  key: string
  label: string
  done: boolean
  helper: string
}

export interface WeeklySignal {
  label: string
  value: string
  tone: RecommendationTone
}

export interface TodaySnapshot {
  statusLabel: '正常' | '保守训练' | '注意恢复' | '记录不足'
  tone: RecommendationTone
  headline: string
  actions: string[]
  checklist: TodayChecklistItem[]
  weeklySignals: WeeklySignal[]
}

function average(values: Array<number | undefined>): number | undefined {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (valid.length === 0) return undefined
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function round(value: number | undefined, digits = 1): number | undefined {
  if (value === undefined) return undefined
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

function isTrainingLogged(log: Partial<DailyLog> | undefined, workout: WorkoutLog | undefined, target: DailyTarget): boolean {
  if (!target.isTrainingDay) return true
  if (log?.trained !== undefined || log?.workoutCompletion !== undefined) return true
  return (workout?.exercises.length ?? 0) > 0 || (workout?.cardio ?? []).some(isCardioLogMeaningful)
}

function recentTrainingCompletion(logs: DailyLog[], endDate: string, targets: DailyTargetMap, days: number): number | undefined {
  const trainingLogs = getRecentWindow(logs, endDate, days).filter((log) => targets[getDayKey(log.date)].isTrainingDay)
  if (trainingLogs.length === 0) return undefined
  const completed = trainingLogs.filter((log) => log.trained || (log.workoutCompletion ?? 0) >= 80).length
  return Math.round((completed / trainingLogs.length) * 100)
}

function currentStreak(logs: DailyLog[], today: string, predicate: (log: DailyLog) => boolean): number {
  const byDate = new Map(logs.map((log) => [log.date, log]))
  let streak = 0
  for (let date = today; ; date = addDays(date, -1)) {
    const log = byDate.get(date)
    if (!log || !predicate(log)) break
    streak += 1
  }
  return streak
}

export function buildTodaySnapshot({
  today,
  log,
  workout,
  target,
  logs,
  dashboardStats,
  targets,
  preference,
}: {
  today: string
  log: Partial<DailyLog> | undefined
  workout: WorkoutLog | undefined
  target: DailyTarget
  logs: DailyLog[]
  dashboardStats: DashboardStats
  targets: DailyTargetMap
  preference?: UserPreference
}): TodaySnapshot {
  const settings = mergeUserPreference(preference)
  const checklist: TodayChecklistItem[] = [
    { key: 'weight', label: '体重', done: log?.morningWeightKg !== undefined, helper: log?.morningWeightKg === undefined ? '晨起体重未填' : `${log.morningWeightKg} kg` },
    { key: 'calories', label: '热量', done: log?.calories !== undefined, helper: log?.calories === undefined ? '热量未填' : `${log.calories} kcal` },
    { key: 'protein', label: '蛋白', done: log?.protein !== undefined, helper: log?.protein === undefined ? '蛋白未填' : `${log.protein} g / ${target.protein} g` },
    { key: 'steps', label: '步数', done: log?.steps !== undefined, helper: log?.steps === undefined ? '步数未填' : `${log.steps} / ${target.stepTarget}` },
    { key: 'sleep', label: '睡眠', done: log?.sleepHours !== undefined, helper: log?.sleepHours === undefined ? '睡眠未填' : `${log.sleepHours} h` },
    { key: 'fatigue', label: '疲劳', done: log?.fatigueScore !== undefined, helper: log?.fatigueScore === undefined ? '疲劳未填' : `${log.fatigueScore} / 10` },
    {
      key: 'training',
      label: '训练',
      done: isTrainingLogged(log, workout, target),
      helper: target.isTrainingDay
        ? log?.trained === false
          ? '标记未练'
          : log?.trained || (log?.workoutCompletion ?? 0) >= 80
            ? '已完成'
            : workout
              ? '训练记录已创建'
              : '训练未记录'
        : '休息日',
    },
  ]

  const missing = checklist.filter((item) => !item.done)
  const fatigue = log?.fatigueScore
  const sleep = log?.sleepHours
  const completion = log?.workoutCompletion
  const recoveryRisk =
    (sleep !== undefined && sleep < settings.sleepFloorHours - 1) ||
    (fatigue !== undefined && fatigue >= settings.fatigueThreshold + 2)
  const conservativeRisk =
    target.isTrainingDay &&
    ((sleep !== undefined && sleep < settings.sleepFloorHours) ||
      (fatigue !== undefined && fatigue >= settings.fatigueThreshold) ||
      (completion !== undefined && completion < 70))

  let statusLabel: TodaySnapshot['statusLabel'] = '正常'
  let tone: RecommendationTone = 'positive'
  let headline = target.isTrainingDay ? '按计划训练，主项保持质量。' : '休息日优先恢复、蛋白和步数。'

  if (missing.length >= 3) {
    statusLabel = '记录不足'
    tone = 'neutral'
    headline = '先补齐关键记录，再判断今天训练节奏。'
  } else if (recoveryRisk) {
    statusLabel = '注意恢复'
    tone = 'danger'
    headline = '睡眠或疲劳已经亮红灯，今天优先恢复。'
  } else if (conservativeRisk) {
    statusLabel = '保守训练'
    tone = 'warning'
    headline = '可以训练，但主项保留余力，附件少做一点。'
  }

  const actions: string[] = []
  missing.slice(0, 3).forEach((item) => actions.push(`补${item.label}`))
  if (target.isTrainingDay && !isTrainingLogged(log, workout, target)) {
    actions.push('开始训练')
  }
  if (statusLabel === '保守训练') actions.push('附件减少 1-2 组')
  if (statusLabel === '注意恢复') actions.push('优先睡眠与低强度活动')
  if (actions.length === 0) actions.push(target.isTrainingDay ? '完成今日训练' : '守住蛋白和步数')

  const weekLogs = logsForWeek(logs, today)
  const loggedCalorieDays = weekLogs.filter((item) => item.calories !== undefined).length
  const averageTargetSteps = average(weekLogs.map((item) => targets[getDayKey(item.date)].stepTarget))
  const calorieTone: RecommendationTone =
    loggedCalorieDays < 3 ? 'neutral' : dashboardStats.calorieBudget.remaining < -300 ? 'danger' : dashboardStats.calorieBudget.remaining < 0 ? 'warning' : 'positive'
  const stepTone: RecommendationTone =
    dashboardStats.averageSteps === undefined || averageTargetSteps === undefined
      ? 'neutral'
      : dashboardStats.averageSteps >= averageTargetSteps
        ? 'positive'
        : 'warning'
  const trainingTone: RecommendationTone =
    dashboardStats.trainingCompletionRate >= 80 ? 'positive' : dashboardStats.trainingCompletionRate >= 60 ? 'warning' : 'danger'

  return {
    statusLabel,
    tone,
    headline,
    actions,
    checklist,
    weeklySignals: [
      {
        label: '本周热量',
        value: loggedCalorieDays < 3 ? '记录不足' : `${dashboardStats.calorieBudget.remaining} kcal`,
        tone: calorieTone,
      },
      {
        label: '平均步数',
        value: dashboardStats.averageSteps === undefined ? '暂无' : `${dashboardStats.averageSteps} 步`,
        tone: stepTone,
      },
      {
        label: '训练完成',
        value: `${dashboardStats.trainingCompletionRate}%`,
        tone: trainingTone,
      },
    ],
  }
}

export function buildTrendAlerts(
  logs: DailyLog[],
  today: string,
  targets: DailyTargetMap,
  preference?: UserPreference,
): AdjustmentRecommendation[] {
  const settings = mergeUserPreference(preference)
  const sorted = sortByDateAsc(logs)
  const recentFourteen = getRecentWindow(sorted, today, 14)
  const latestWeight = average(getRecentWindow(sorted, today, 7).map((log) => log.morningWeightKg))
  const previousWeight = average(getRecentWindow(sorted, addDays(today, -7), 7).map((log) => log.morningWeightKg))
  const firstWaist = recentFourteen.find((log) => log.waistCm !== undefined)?.waistCm
  const lastWaist = sortByDateDesc(recentFourteen).find((log) => log.waistCm !== undefined)?.waistCm
  const sleepLowStreak = currentStreak(sorted, today, (log) => log.sleepHours !== undefined && log.sleepHours < settings.sleepFloorHours)
  const fatigueHighStreak = currentStreak(sorted, today, (log) => log.fatigueScore !== undefined && log.fatigueScore >= settings.fatigueThreshold)
  const stepsLowStreak = currentStreak(sorted, today, (log) => log.steps !== undefined && log.steps < targets[getDayKey(log.date)].stepTarget)
  const recentCompletion = recentTrainingCompletion(sorted, today, targets, 7)
  const previousCompletion = recentTrainingCompletion(sorted, addDays(today, -7), targets, 7)
  const weekendLogs = getRecentWindow(sorted, today, 7).filter((log) => [5, 6].includes(getDayKey(log.date)))
  const weekendAverageCalories = average(weekendLogs.map((log) => log.calories))
  const alerts: AdjustmentRecommendation[] = []

  if (latestWeight !== undefined && previousWeight !== undefined) {
    const weeklyRate = ((latestWeight - previousWeight) / previousWeight) * 100
    const waistChange = firstWaist !== undefined && lastWaist !== undefined ? round(lastWaist - firstWaist) : undefined
    if (weeklyRate < -0.75) {
      alerts.push({
        title: '体重下降偏快',
        message: '7 日均重下降超过 0.75%。训练日先加 100 kcal 碳水，不继续扩大赤字。',
        tone: 'warning',
      })
    } else if (Math.abs(weeklyRate) < 0.15 && waistChange !== undefined && waistChange < -0.3) {
      alerts.push({
        title: '可能正在身体重组',
        message: '体重基本不动，但腰围在下降。保持当前热量和训练，继续观察 1-2 周。',
        tone: 'positive',
      })
    }
  }

  if (sleepLowStreak >= 2) {
    alerts.push({
      title: '睡眠连续不足',
      message: `已连续 ${sleepLowStreak} 天睡眠低于 ${settings.sleepFloorHours}h。今天训练保守，优先把睡眠补回底线以上。`,
      tone: 'warning',
    })
  }
  if (fatigueHighStreak >= 2) {
    alerts.push({
      title: '疲劳连续偏高',
      message: `疲劳已连续 ${fatigueHighStreak} 天偏高。本周减少 2-4 组附件训练，主项保留余力。`,
      tone: 'danger',
    })
  }
  if (stepsLowStreak >= 3) {
    alerts.push({
      title: '步数连续低于目标',
      message: `已连续 ${stepsLowStreak} 天低于步数目标。每天加一次饭后 15-20 分钟步行，先补活动量底线。`,
      tone: 'warning',
    })
  }
  if ((weekendAverageCalories ?? 0) > settings.weekendCalorieUpperKcal) {
    alerts.push({
      title: '周末热量风险',
      message: `最近周五/周六平均热量超过 ${settings.weekendCalorieUpperKcal} kcal。先控周末自由饮食，不急着压低工作日。`,
      tone: 'danger',
    })
  }
  if (recentCompletion !== undefined && previousCompletion !== undefined && recentCompletion < previousCompletion - 15) {
    alerts.push({
      title: '训练完成度下降',
      message: `训练完成度从 ${previousCompletion}% 降到 ${recentCompletion}%。下周先保主项，附件少 2-4 组。`,
      tone: 'warning',
    })
  }

  if (alerts.length === 0) {
    alerts.push({
      title: '趋势暂时平稳',
      message: '最近没有明显风险信号。继续记录体重、腰围、睡眠、疲劳和训练完成度。',
      tone: 'positive',
    })
  }

  return alerts.slice(0, 4)
}

export function buildWeeklyActionRecommendations(
  summary: WeeklySummary,
  logs: DailyLog[],
  anchorDate: string,
  targets: DailyTargetMap,
  preference?: UserPreference,
): AdjustmentRecommendation[] {
  const settings = mergeUserPreference(preference)
  const weekLogs = logsForWeek(logs, anchorDate)
  const loggedCoreDays = weekLogs.filter(
    (log) => log.morningWeightKg !== undefined && log.calories !== undefined && log.protein !== undefined,
  ).length
  const averageFatigue = average(weekLogs.map((log) => log.fatigueScore))
  const averageSleep = average(weekLogs.map((log) => log.sleepHours))
  const averageSteps = average(weekLogs.map((log) => log.steps))
  const averageStepTarget = average(weekLogs.map((log) => targets[getDayKey(log.date)].stepTarget))
  const actions: AdjustmentRecommendation[] = []

  if (loggedCoreDays < 4 || summary.calorieStatus === 'unknown') {
    return [
      {
        title: '暂不调整，继续记录',
        message: '本周核心记录不足 4 天。下周先补齐体重、热量、蛋白、步数和训练完成度，再判断是否调整。',
        tone: 'neutral',
      },
    ]
  }

  if (summary.weekendOverLimit) {
    actions.push({
      title: '优先控制周末',
      message: `下周先把周五/周六拉回 ${Math.max(0, settings.weekendCalorieUpperKcal - 400)}-${settings.weekendCalorieUpperKcal} kcal，不急着压低工作日热量。`,
      tone: 'danger',
    })
  }

  if ((averageFatigue ?? 0) >= settings.fatigueThreshold || summary.trainingCompletionRate < 70 || (averageSleep !== undefined && averageSleep < settings.sleepFloorHours)) {
    actions.push({
      title: '本周减少 2-4 组训练量',
      message: '疲劳、睡眠或完成度已经影响执行。下周保主项质量，附件训练少做 2-4 组。',
      tone: 'warning',
    })
  }

  if (!summary.weekendOverLimit && summary.calorieStatus === 'high') {
    actions.push({
      title: '每日减少 100-150 kcal',
      message: '热量偏高但周末不是主因。下周从零食、油脂或饮料里每天扣 100-150 kcal。',
      tone: 'warning',
    })
  }

  if (summary.calorieStatus === 'low' || (summary.weightDelta !== undefined && summary.weightDelta < -0.7)) {
    actions.push({
      title: '训练日增加 100 kcal',
      message: '热量偏低或体重下降偏快。下周训练日前后增加 100 kcal 碳水，观察训练表现。',
      tone: 'warning',
    })
  }

  if (averageSteps !== undefined && averageStepTarget !== undefined && averageSteps < averageStepTarget * 0.85) {
    actions.push({
      title: '提高步数底线',
      message: `本周平均步数约 ${Math.round(averageSteps)}。下周先把日底线抬到 ${Math.round(averageStepTarget)} 步附近。`,
      tone: 'warning',
    })
  }

  if (actions.length === 0) {
    actions.push({
      title: '继续当前方案',
      message: '体重、热量、训练和恢复没有明显冲突。下周保持当前热量、训练量和记录节奏。',
      tone: 'positive',
    })
  }

  return actions.slice(0, 3)
}
