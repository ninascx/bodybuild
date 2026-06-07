import { dailyTargets } from '../data/plans'
import type { AdjustmentRecommendation, DailyLog, DailyTarget, DayKey, UserPreference } from '../types'
import { addDays, getDayKey, getRecentWindow, sortByDateAsc } from './dates'
import { mergeUserPreference } from './userPreferences'

function average(values: Array<number | undefined>): number | undefined {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (valid.length === 0) return undefined
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function averageWeightForRange(logs: DailyLog[], endDate: string, days: number): number | undefined {
  return average(getRecentWindow(logs, endDate, days).map((log) => log.morningWeightKg))
}

type DailyTargetMap = Record<DayKey, DailyTarget>

export function getDailyRecommendations(
  log: DailyLog | undefined,
  logs: DailyLog[],
  dateValue: string,
  targets: DailyTargetMap = dailyTargets,
  preference?: UserPreference,
): AdjustmentRecommendation[] {
  const day = getDayKey(dateValue)
  const settings = mergeUserPreference(preference)
  const target = targets[day]
  const recommendations: AdjustmentRecommendation[] = []

  if (log?.sleepHours !== undefined && log.sleepHours < settings.sleepFloorHours) {
    recommendations.push({
      title: '睡眠偏少',
      message: '今天训练先保主项质量，避免力竭，附件动作少做一点。',
      tone: 'warning',
    })
  }

  const recentThree = getRecentWindow(logs, dateValue, 3)
  if (recentThree.length >= 3 && recentThree.every((item) => (item.steps ?? target.stepTarget) < target.stepTarget)) {
    recommendations.push({
      title: '活动量偏低',
      message: `连续 3 天步数低于 ${target.stepTarget}。今天加一次饭后 10-20 分钟步行，先把活动量拉回底线。`,
      tone: 'warning',
    })
  }

  if ([5, 6].includes(day)) {
    if ((log?.calories ?? 0) > settings.weekendCalorieUpperKcal) {
      recommendations.push({
        title: '自由饮食偏高',
        message: `周五或周六热量超过 ${settings.weekendCalorieUpperKcal} kcal，可能抵消周内赤字。先把周末结构收紧，不用压低工作日来补偿。`,
        tone: 'danger',
      })
    }
    if (log?.protein !== undefined && log.protein < target.protein) {
      recommendations.push({
        title: '蛋白质未达底线',
        message: `休息日也先守住 ${target.protein} g 蛋白质，避免热量够了但恢复材料不足。`,
        tone: 'warning',
      })
    }
    if (log?.steps !== undefined && log.steps < target.stepTarget) {
      recommendations.push({
        title: '步数未达底线',
        message: '今天先安排一次饭后 20-30 分钟步行，把活动量补回底线。',
        tone: 'warning',
      })
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: '今日节奏',
      message: target.isTrainingDay ? '按计划完成主项，重量和次数保持可控；如果有明显不适，附件动作直接收掉。' : '休息日先守住蛋白质、步数和周末热量上限。',
      tone: 'positive',
    })
  }

  return recommendations
}

export function getWeekendRiskRecommendation(logs: DailyLog[], today: string, preference?: UserPreference): AdjustmentRecommendation {
  const settings = mergeUserPreference(preference)
  const weekLogs = getRecentWindow(logs, today, 7).filter((log) => [5, 6].includes(getDayKey(log.date)))
  const riskyDays = weekLogs.filter((log) => (log.calories ?? 0) > settings.weekendCalorieUpperKcal)
  const averageWeekendCalories =
    weekLogs.length > 0
      ? weekLogs.reduce((sum, log) => sum + (log.calories ?? 0), 0) / weekLogs.length
      : undefined

  if (riskyDays.length > 0 || (averageWeekendCalories ?? 0) > settings.weekendCalorieUpperKcal) {
    return {
      title: '周末风险预警',
      message: '周五/周六热量已经偏高。先控制自由饮食结构和步数，不用压低工作日热量来补偿。',
      tone: 'danger',
    }
  }

  return {
    title: '周末节奏',
    message: `目前没有明显周末超标记录。继续守住 ${settings.weekendCalorieUpperKcal} kcal 上限，同时保住蛋白质和步数底线。`,
    tone: 'positive',
  }
}

export function getTwoWeekAdjustment(logs: DailyLog[], today: string, preference?: UserPreference): AdjustmentRecommendation {
  const settings = mergeUserPreference(preference)
  const sorted = sortByDateAsc(logs)
  const recentFourteen = getRecentWindow(sorted, today, 14)
  const previousEnd = addDays(today, -14)
  const previousFourteen = getRecentWindow(sorted, previousEnd, 14)

  if (recentFourteen.length < 10 || previousFourteen.length < 7) {
    return {
      title: '两周调整',
      message: '连续记录还不够完整。先积累 2-4 周体重、腰围、热量和训练完成度，再判断是否调整热量。',
      tone: 'neutral',
    }
  }

  const latestWeight = averageWeightForRange(sorted, today, 7)
  const previousWeight = averageWeightForRange(sorted, addDays(today, -7), 7)
  const firstWaist = recentFourteen.find((log) => log.waistCm !== undefined)?.waistCm
  const lastWaist = [...recentFourteen].reverse().find((log) => log.waistCm !== undefined)?.waistCm
  const recentCompletion = average(recentFourteen.map((log) => log.workoutCompletion))
  const previousCompletion = average(previousFourteen.map((log) => log.workoutCompletion))
  const recentFatigue = average(recentFourteen.map((log) => log.fatigueScore))

  if (latestWeight === undefined || previousWeight === undefined) {
    return {
      title: '两周调整',
      message: '体重数据不足，暂不调整热量。先把晨起体重连续记录补起来。',
      tone: 'neutral',
    }
  }

  const weeklyWeightDeltaKg = latestWeight - previousWeight
  const goalDeltaKg = settings.weeklyWeightChangeGoalKg
  const goalToleranceKg = Math.max(0.15, Math.abs(goalDeltaKg) * 0.35)
  const waistChange = firstWaist !== undefined && lastWaist !== undefined ? lastWaist - firstWaist : undefined
  const performanceStable = previousCompletion === undefined || recentCompletion === undefined || recentCompletion >= previousCompletion - 8
  const performanceRising = previousCompletion !== undefined && recentCompletion !== undefined && recentCompletion > previousCompletion + 5
  const weightOnTarget = weeklyWeightDeltaKg >= goalDeltaKg - goalToleranceKg && weeklyWeightDeltaKg <= goalDeltaKg + goalToleranceKg
  const weightFlat = Math.abs(weeklyWeightDeltaKg) < 0.15
  const waistFlat = waistChange === undefined || Math.abs(waistChange) < 0.3

  if (weightOnTarget && performanceStable) {
    return {
      title: '继续当前方案',
      message: `7 日均重变化接近每周 ${goalDeltaKg} kg 目标，训练表现稳定。先保持当前热量和训练安排。`,
      tone: 'positive',
    }
  }

  if (weightFlat && !waistFlat && waistChange !== undefined && waistChange < 0 && performanceRising) {
    return {
      title: '可能正在身体重组',
      message: '体重变化不大，但腰围下降且训练表现上升。先保持当前方案，继续观察 1-2 周。',
      tone: 'positive',
    }
  }

  if (weightFlat && waistFlat) {
    return {
      title: '优先检查周末',
      message: `连续两周体重和腰围几乎不变。先检查周五/周六是否超过 ${settings.weekendCalorieUpperKcal} kcal；周末已控制后，再小幅调整工作日热量。`,
      tone: 'warning',
    }
  }

  if (weeklyWeightDeltaKg < goalDeltaKg - goalToleranceKg || (recentFatigue ?? 0) >= settings.fatigueThreshold || !performanceStable) {
    return {
      title: '赤字可能过大',
      message: '体重下降偏快、疲劳偏高或训练完成度下降。训练日先增加 100-150 kcal 碳水，本周附件训练少 2-4 组。',
      tone: 'warning',
    }
  }

  return {
    title: '保持观察',
    message: '当前变化不极端。继续记录 1 周，重点看 7 日均重、腰围和训练完成度是否同向改善。',
    tone: 'neutral',
  }
}
