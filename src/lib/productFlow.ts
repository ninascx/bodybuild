import type { DailyLog, DailyTarget, RecommendationTone, UserPreference, WorkoutLog } from '../types'
import type { DashboardStats } from './metrics'
import type { TodaySnapshot, WeeklySignal } from './statusInsights'
import { mergeUserPreference } from './userPreferences'
import { summarizeWorkout } from './workout'

export type DailyFocusKey = 'weight' | 'calories' | 'protein' | 'steps' | 'sleep' | 'fatigue' | 'training' | 'notes'

export type WorkoutEntryState = 'rest-day' | 'needs-plan' | 'ready' | 'in-progress' | 'ready-to-confirm' | 'complete'
export type TaskDestination = 'today' | 'daily' | 'workout' | 'analytics'
export type TaskPriority = 'primary' | 'secondary' | 'supporting'
export type TaskCompletionState = 'missing' | 'ready' | 'in-progress' | 'complete' | 'blocked'
export type ReviewReadiness = 'insufficient-data' | 'ready' | 'action-needed'

export type TodayTaskAction = {
  label: string
  helper: string
  kind: 'record' | 'workout' | 'review'
  destination: TaskDestination
  priority: TaskPriority
  completionState: TaskCompletionState
  focusKey?: DailyFocusKey
}

export type TodayTaskItem = {
  key: DailyFocusKey
  label: string
  done: boolean
  helper: string
  priority: number
  destination: TaskDestination
  completionState: TaskCompletionState
}

export type ReviewTaskSummary = {
  readiness: ReviewReadiness
  title: string
  message: string
  missingSignals: string[]
  primaryDestination: TaskDestination
}

export type TodayTaskPlan = {
  title: string
  message: string
  tone: RecommendationTone
  primaryAction: TodayTaskAction
  secondaryActions: TodayTaskAction[]
  missingItems: TodayTaskItem[]
  checklist: TodayTaskItem[]
  workoutState: WorkoutEntryState
  workoutTitle: string
  workoutMessage: string
  workoutActionLabel: string
  weeklySignals: WeeklySignal[]
  review: ReviewTaskSummary
}

function isFilled(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ''
}

function buildChecklist(log: Partial<DailyLog> | undefined, target: DailyTarget): TodayTaskItem[] {
  return ([
    {
      key: 'weight',
      label: '体重',
      done: isFilled(log?.morningWeightKg),
      helper: isFilled(log?.morningWeightKg) ? `${log?.morningWeightKg} kg` : '晨起体重未填',
      priority: 10,
    },
    {
      key: 'calories',
      label: '热量',
      done: isFilled(log?.calories),
      helper: isFilled(log?.calories) ? `${log?.calories} kcal` : '今天热量未填',
      priority: 20,
    },
    {
      key: 'protein',
      label: '蛋白',
      done: isFilled(log?.protein),
      helper: isFilled(log?.protein) ? `${log?.protein} g / ${target.protein} g` : `目标 ${target.protein} g`,
      priority: 30,
    },
    {
      key: 'steps',
      label: '步数',
      done: isFilled(log?.steps),
      helper: isFilled(log?.steps) ? `${log?.steps} / ${target.stepTarget}` : `目标 ${target.stepTarget} 步`,
      priority: 40,
    },
    {
      key: 'sleep',
      label: '睡眠',
      done: isFilled(log?.sleepHours),
      helper: isFilled(log?.sleepHours) ? `${log?.sleepHours} h` : '睡眠时长未填',
      priority: 50,
    },
    {
      key: 'fatigue',
      label: '疲劳',
      done: isFilled(log?.fatigueScore),
      helper: isFilled(log?.fatigueScore) ? `${log?.fatigueScore} / 10` : '疲劳评分未填',
      priority: 60,
    },
    {
      key: 'training',
      label: '训练',
      done: !target.isTrainingDay || log?.trained !== undefined || log?.workoutCompletion !== undefined,
      helper: target.isTrainingDay
        ? log?.trained === false
          ? '已标记未训练'
          : (log?.workoutCompletion ?? 0) >= 100
            ? '已完成'
            : log?.trained
              ? `${log?.workoutCompletion ?? 0}%`
              : '训练状态未填'
        : '休息日',
      priority: 70,
    },
  ] as Array<Omit<TodayTaskItem, 'destination' | 'completionState'>>).map((item) => ({
    ...item,
    destination: item.key === 'training' && target.isTrainingDay ? 'workout' : 'daily',
    completionState: item.done ? 'complete' : 'missing',
  }))
}

function getWorkoutState(target: DailyTarget, workout: WorkoutLog | undefined, log: Partial<DailyLog> | undefined): WorkoutEntryState {
  if (!target.isTrainingDay) return 'rest-day'
  if ((log?.workoutCompletion ?? 0) >= 100) return 'complete'
  if (!workout) return 'needs-plan'
  const summary = summarizeWorkout(workout)
  if (summary.totalSets > 0 && summary.completionPercent >= 100) return 'ready-to-confirm'
  if (summary.filledSets > 0) return 'in-progress'
  return 'ready'
}

function getWorkoutCopy(state: WorkoutEntryState, target: DailyTarget, workout: WorkoutLog | undefined): Pick<TodayTaskPlan, 'workoutTitle' | 'workoutMessage' | 'workoutActionLabel'> {
  if (state === 'rest-day') {
    return {
      workoutTitle: '今天是休息日',
      workoutMessage: '训练入口会保留，但今天优先恢复、蛋白和步数。',
      workoutActionLabel: '查看训练',
    }
  }
  if (state === 'needs-plan') {
    return {
      workoutTitle: target.workoutName,
      workoutMessage: '还没有生成今日训练。先选择推荐计划，进入训练现场。',
      workoutActionLabel: '选择计划开始',
    }
  }
  if (state === 'ready-to-confirm') {
    return {
      workoutTitle: workout?.workoutName ?? target.workoutName,
      workoutMessage: '所有组已填完，确认后同步到今日记录。',
      workoutActionLabel: '确认完成训练',
    }
  }
  if (state === 'complete') {
    return {
      workoutTitle: workout?.workoutName ?? target.workoutName,
      workoutMessage: '今日训练已同步。现在可以补备注或查看复盘。',
      workoutActionLabel: '查看记录',
    }
  }
  if (state === 'in-progress') {
    return {
      workoutTitle: workout?.workoutName ?? target.workoutName,
      workoutMessage: '训练已经开始，继续从未完成动作记录。',
      workoutActionLabel: '继续训练',
    }
  }
  return {
    workoutTitle: workout?.workoutName ?? target.workoutName,
    workoutMessage: '今日训练已准备好，进入后只保留当前动作和当前组。',
    workoutActionLabel: '开始训练',
  }
}

function buildReviewSummary(checklist: TodayTaskItem[], workoutState: WorkoutEntryState, dashboardStats: DashboardStats): ReviewTaskSummary {
  const missingSignals = checklist
    .filter((item) => !item.done && item.key !== 'training')
    .slice(0, 4)
    .map((item) => item.label)
  const completedDailySignals = checklist.filter((item) => item.done && item.key !== 'training').length
  const hasEnoughDailySignals = completedDailySignals >= 4
  const hasClosedWorkoutSignal = workoutState === 'rest-day' || workoutState === 'complete' || workoutState === 'ready-to-confirm'
  const hasActionRisk = dashboardStats.calorieBudget.remaining < 0 || dashboardStats.trainingCompletionRate < 60

  if (!hasEnoughDailySignals) {
    return {
      readiness: 'insufficient-data',
      title: '先补齐记录，再看复盘',
      message: missingSignals.length > 0 ? `还缺 ${missingSignals.join('、')}，复盘结论会先保持保守。` : '记录点还不够，复盘结论会先保持保守。',
      missingSignals,
      primaryDestination: 'daily',
    }
  }

  if (!hasClosedWorkoutSignal) {
    return {
      readiness: 'insufficient-data',
      title: '训练状态还没闭环',
      message: '补完今天训练状态后，再看周节奏和调整建议。',
      missingSignals: ['训练'],
      primaryDestination: 'workout',
    }
  }

  if (hasActionRisk) {
    return {
      readiness: 'action-needed',
      title: '复盘里有需要处理的信号',
      message: '热量预算或训练完成度出现偏差，先看结论再决定下周调整。',
      missingSignals: [],
      primaryDestination: 'analytics',
    }
  }

  return {
    readiness: 'ready',
    title: '可以查看复盘结论',
    message: '今天的关键记录已经足够，复盘会优先给出是否调整的判断。',
    missingSignals: [],
    primaryDestination: 'analytics',
  }
}

export function buildTodayTaskPlan({
  log,
  target,
  workout,
  todaySnapshot,
  dashboardStats,
  preference,
}: {
  log: Partial<DailyLog> | undefined
  target: DailyTarget
  workout: WorkoutLog | undefined
  todaySnapshot: TodaySnapshot
  dashboardStats: DashboardStats
  preference?: UserPreference
}): TodayTaskPlan {
  const settings = mergeUserPreference(preference)
  const checklist = buildChecklist(log, target)
  const missingItems = checklist.filter((item) => !item.done).sort((a, b) => a.priority - b.priority)
  const workoutState = getWorkoutState(target, workout, log)
  const workoutCopy = getWorkoutCopy(workoutState, target, workout)
  const review = buildReviewSummary(checklist, workoutState, dashboardStats)
  const fatigueRisk = (log?.fatigueScore ?? 0) >= settings.fatigueThreshold
  const sleepRisk = log?.sleepHours !== undefined && log.sleepHours < settings.sleepFloorHours

  const secondaryActions: TodayTaskAction[] = []
  let primaryAction: TodayTaskAction
  let title: string
  let message: string
  let tone: RecommendationTone

  if (missingItems.length > 0) {
    const item = missingItems[0]
    primaryAction = {
      label: `补${item.label}`,
      helper: item.helper,
      kind: 'record',
      destination: 'daily',
      priority: 'primary',
      completionState: 'missing',
      focusKey: item.key,
    }
    title = '先补今日缺口'
    message = `还差 ${missingItems.length} 项，先补 ${item.label}，再判断训练节奏。`
    tone = 'neutral'
  } else if (workoutState === 'ready' || workoutState === 'in-progress' || workoutState === 'needs-plan' || workoutState === 'ready-to-confirm') {
    primaryAction = {
      label: workoutCopy.workoutActionLabel,
      helper: workoutCopy.workoutMessage,
      kind: 'workout',
      destination: 'workout',
      priority: 'primary',
      completionState: workoutState === 'in-progress' ? 'in-progress' : 'ready',
    }
    title = workoutState === 'ready-to-confirm' ? '训练待确认' : fatigueRisk || sleepRisk ? '保守训练' : '可以训练'
    message = workoutCopy.workoutMessage
    tone = workoutState === 'ready-to-confirm' ? 'positive' : fatigueRisk || sleepRisk ? 'warning' : todaySnapshot.tone
  } else {
    primaryAction = {
      label: '查看复盘',
      helper: '今日主路径已完成，看看趋势是否需要调整。',
      kind: 'review',
      destination: review.primaryDestination,
      priority: 'primary',
      completionState: review.readiness === 'insufficient-data' ? 'blocked' : 'ready',
    }
    title = workoutState === 'complete' ? '今日已收尾' : '守住恢复节奏'
    message = workoutState === 'complete' ? '记录和训练已经闭环，可以补备注或查看复盘。' : todaySnapshot.headline
    tone = todaySnapshot.tone
  }

  missingItems.slice(1, 4).forEach((item) => {
    secondaryActions.push({
      label: `补${item.label}`,
      helper: item.helper,
      kind: 'record',
      destination: 'daily',
      priority: 'secondary',
      completionState: 'missing',
      focusKey: item.key,
    })
  })
  if (primaryAction.kind !== 'workout' && workoutState !== 'complete' && workoutState !== 'rest-day') {
    secondaryActions.push({
      label: workoutCopy.workoutActionLabel,
      helper: workoutCopy.workoutMessage,
      kind: 'workout',
      destination: 'workout',
      priority: 'secondary',
      completionState: workoutState === 'in-progress' ? 'in-progress' : 'ready',
    })
  }
  if (primaryAction.kind !== 'review' && review.readiness !== 'insufficient-data') {
    secondaryActions.push({
      label: review.readiness === 'action-needed' ? '查看风险' : '查看复盘',
      helper: review.message,
      kind: 'review',
      destination: 'analytics',
      priority: 'supporting',
      completionState: 'ready',
    })
  }

  return {
    title,
    message,
    tone,
    primaryAction,
    secondaryActions,
    missingItems,
    checklist,
    workoutState,
    weeklySignals: todaySnapshot.weeklySignals.length > 0
      ? todaySnapshot.weeklySignals
      : [
          { label: '本周热量', value: `${dashboardStats.calorieBudget.remaining} kcal`, tone: dashboardStats.calorieBudget.remaining < 0 ? 'warning' : 'positive' },
          { label: '平均步数', value: dashboardStats.averageSteps === undefined ? '暂无' : `${dashboardStats.averageSteps} 步`, tone: 'neutral' },
          { label: '训练完成', value: `${dashboardStats.trainingCompletionRate}%`, tone: dashboardStats.trainingCompletionRate >= 80 ? 'positive' : 'warning' },
        ],
    review,
    ...workoutCopy,
  }
}
