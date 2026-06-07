import type { AdjustmentRecommendation, DailyLog, DailyTarget, GoalType, RecommendationTone, UserPreference, WorkoutLog } from '../types'
import type { WeeklySummary } from '../types'
import { mergeUserPreference } from './userPreferences'
import { summarizeWorkout } from './workout'

export type AiCoachReviewType = 'daily' | 'weekly' | 'two-week'

export type AiCoachOutput = {
  status: RecommendationTone
  headline: string
  summary: string
  primaryAction: string
  supportingActions: string[]
  reasoningSignals: string[]
  avoidActions: string[]
  dataGaps: string[]
}

export type AiCoachPromptInput = {
  reviewType: AiCoachReviewType
  date: string
  target: DailyTarget
  todayLog?: DailyLog
  workoutLog?: WorkoutLog
  weeklySummary?: WeeklySummary
  trendAlerts?: AdjustmentRecommendation[]
  ruleRecommendations: AdjustmentRecommendation[]
  preference?: UserPreference
}

export type AiCoachPrompt = {
  system: string
  user: string
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export const AI_COACH_SYSTEM_PROMPT = `你是 LiftLog 的 AI 训练教练，负责把用户的记录信号整理成保守、可执行的训练与饮食建议。

产品定位：
- LiftLog 是训练、饮食、体重、围度和习惯记录工具。
- 用户需要快速知道今天或本周下一步该做什么。
- 你的语气要冷静、精确、鼓励，像可靠的训练笔记，不像健身营销文案。

工作原则：
1. 只根据输入数据和已计算信号判断，不编造缺失记录。
2. 数据不足时先要求继续记录，不做热量或训练量的大调整。
3. 睡眠不足、疲劳偏高、训练完成度下降时，优先保护恢复和主项质量。
4. 周末热量偏高时，优先控制周五/周六自由饮食，不建议用极端压低工作日热量补偿。
5. 体重下降过快、疲劳升高或训练表现下降时，建议小幅增加训练日碳水或减少附件训练量。
6. 体重不变但腰围下降、训练表现稳定或上升时，允许判断为可能身体重组，但必须说明继续观察。
7. 不提供医疗诊断，不承诺结果，不使用羞辱、恐吓或夸张激励。
8. 输出必须是合法 JSON，不要输出 Markdown。

输出字段：
- status: "positive" | "warning" | "danger" | "neutral"
- headline: 12-24 个中文字符，说明当前状态
- summary: 1-2 句，说明最重要的判断
- primaryAction: 一个具体动作，用户今天或下周可以执行
- supportingActions: 0-3 个补充动作
- reasoningSignals: 2-5 个用于支撑判断的信号
- avoidActions: 1-3 个不建议做的事
- dataGaps: 0-5 个仍缺失或不足的数据

只输出 JSON。`

function compactObject<T extends Record<string, unknown>>(value: T): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, toJsonValue(entry)]),
  )
}

function toJsonValue(value: unknown): JsonValue {
  if (value === undefined) return null
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map(toJsonValue)
  if (typeof value === 'object') return compactObject(value as Record<string, unknown>)
  return String(value)
}

function stringifyJson(value: JsonValue): string {
  return JSON.stringify(value, null, 2)
}

function formatGoalType(goalType: GoalType): string {
  if (goalType === 'fat_loss') return 'cut'
  if (goalType === 'muscle_gain') return 'bulk'
  return 'maintain'
}

function buildRecentSummary({
  weeklySummary,
  trendAlerts,
}: {
  weeklySummary?: WeeklySummary
  trendAlerts?: AdjustmentRecommendation[]
}): Record<string, JsonValue> {
  return compactObject({
    averageWeight7: weeklySummary?.averageWeight,
    previousAverageWeight7: weeklySummary?.previousAverageWeight,
    weightDelta: weeklySummary?.weightDelta,
    waistDelta: weeklySummary?.waistDelta,
    calorieStatus: weeklySummary?.calorieStatus,
    weekendAverageCalories: weeklySummary?.weekendAverageCalories,
    weekendOverLimit: weeklySummary?.weekendOverLimit,
    trainingCompletionRate: weeklySummary?.trainingCompletionRate,
    weeklySuggestions: weeklySummary?.suggestions,
    trendAlerts: trendAlerts?.map((item) => `${item.title}：${item.message}`) ?? [],
  })
}

export function buildAiCoachPrompt({
  reviewType,
  date,
  target,
  todayLog,
  workoutLog,
  weeklySummary,
  trendAlerts = [],
  ruleRecommendations,
  preference,
}: AiCoachPromptInput): AiCoachPrompt {
  const settings = mergeUserPreference(preference)
  const workoutSummary = summarizeWorkout(workoutLog)
  const dailyTarget = compactObject({
    calories: target.calories,
    calorieRange: target.calorieRange,
    protein: target.protein,
    carbs: target.carbs,
    fat: target.fat,
    stepTarget: target.stepTarget,
    isTrainingDay: target.isTrainingDay,
    workoutName: target.workoutName,
    notes: target.notes,
  })
  const todayRecord = todayLog
    ? compactObject({
        morningWeightKg: todayLog.morningWeightKg,
        waistCm: todayLog.waistCm,
        calories: todayLog.calories,
        protein: todayLog.protein,
        carbs: todayLog.carbs,
        fat: todayLog.fat,
        steps: todayLog.steps,
        sleepHours: todayLog.sleepHours,
        fatigueScore: todayLog.fatigueScore,
        trained: todayLog.trained,
        workoutCompletion: todayLog.workoutCompletion,
        notes: todayLog.notes,
      })
    : {}
  const workoutRecord = workoutLog
    ? compactObject({
        workoutName: workoutLog.workoutName,
        exerciseCount: workoutSummary.exerciseCount,
        completedSets: workoutSummary.filledSets,
        totalSets: workoutSummary.totalSets,
        completionPercent: workoutSummary.completionPercent,
        cardioCount: workoutSummary.cardioCount,
        cardioDurationMin: workoutSummary.cardioDurationMin,
        notes: workoutLog.notes,
      })
    : {}
  const rules = ruleRecommendations.map((item) => compactObject({ title: item.title, message: item.message, tone: item.tone }))

  const userPayload = compactObject({
    reviewType,
    date,
    goalType: formatGoalType(settings.goalType),
    weeklyWeightChangeGoalKg: settings.weeklyWeightChangeGoalKg,
    sleepFloorHours: settings.sleepFloorHours,
    fatigueThreshold: settings.fatigueThreshold,
    weekendCalorieUpperKcal: settings.weekendCalorieUpperKcal,
    dailyTarget,
    todayLog: todayRecord,
    workoutLog: workoutRecord,
    recentSummary: buildRecentSummary({ weeklySummary, trendAlerts }),
    ruleRecommendations: rules,
  })

  return {
    system: AI_COACH_SYSTEM_PROMPT,
    user: `请根据以下 LiftLog 数据生成一次 ${reviewType} 教练建议。\n\n${stringifyJson(userPayload)}\n\n请遵守系统提示词的输出字段，只输出 JSON。`,
  }
}
