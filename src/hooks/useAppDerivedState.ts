import { useMemo } from 'react'
import { getDayKey } from '../lib/dates'
import {
  calculateDashboardStats,
  buildTrainingPerformanceData,
  buildTrendData,
  createWeeklySummary,
  findPreviousExerciseRecord,
} from '../lib/metrics'
import type { PreviousExerciseRecord, TrendPoint, TrainingPerformanceData } from '../lib/metrics'
import {
  bodyRecordsForDate,
  bodyValue,
  dailyLogsWithBodyMetrics,
} from '../lib/bodyMetrics'
import {
  buildTodaySnapshot,
  buildTrendAlerts,
  buildWeeklyActionRecommendations,
} from '../lib/statusInsights'
import type { TodaySnapshot } from '../lib/statusInsights'
import { buildTodayTaskPlan, type TodayTaskPlan } from '../lib/productFlow'
import {
  builtinTemplateOptions,
  builtinTemplatesFromPlans,
  customTemplateToOption,
  isExerciseFilled,
  summarizeWorkout,
  type WorkoutTemplateOption,
} from '../lib/workout'
import { getTwoWeekAdjustment, getWeekendRiskRecommendation } from '../lib/recommendations'
import type {
  AdjustmentRecommendation,
  BodyRecord,
  DailyLog,
  DayKey,
  UserPlanData,
  UserPreference,
  WeeklySummary,
  WorkoutLog,
  WorkoutPlan,
  WorkoutTemplate,
} from '../types'

type UseAppDerivedStateOptions = {
  today: string
  selectedDate: string
  contentTab: 'daily' | 'workout' | 'analytics' | 'settings' | 'admin'
  selectedTemplateId: string
  trendDays: 7 | 14 | 30 | 90
  weeklyAnchorDate: string
  showOnlyUnfinishedExercises: boolean
  dailyLogs: DailyLog[]
  bodyRecords: BodyRecord[]
  workoutLogs: WorkoutLog[]
  workoutTemplates: WorkoutTemplate[]
  dailyTargetsByDay: Record<DayKey, UserPlanData['dailyTargets'][DayKey]>
  workoutPlansByDay: Record<DayKey, WorkoutPlan>
  userPreference: UserPreference
  buildWeeklyConclusion: (summary: WeeklySummary, twoWeekTitle: string) => {
    title: string
    message: string
    tone: 'positive' | 'neutral' | 'warning' | 'danger'
  }
}

export function useAppDerivedState({
  today,
  selectedDate,
  contentTab,
  selectedTemplateId,
  trendDays,
  weeklyAnchorDate,
  showOnlyUnfinishedExercises,
  dailyLogs,
  bodyRecords,
  workoutLogs,
  workoutTemplates,
  dailyTargetsByDay,
  workoutPlansByDay,
  userPreference,
  buildWeeklyConclusion,
}: UseAppDerivedStateOptions) {
  const userWeeklyCalorieTarget = useMemo(
    () =>
      Object.values(dailyTargetsByDay).reduce((sum, target) => {
        if (typeof target.calories === 'number') return sum + target.calories
        if (target.calorieRange) return sum + Math.round((target.calorieRange[0] + target.calorieRange[1]) / 2)
        return sum
      }, 0),
    [dailyTargetsByDay],
  )
  const currentPlanData = useMemo<UserPlanData>(
    () => ({ dailyTargets: dailyTargetsByDay, workoutPlans: workoutPlansByDay }),
    [dailyTargetsByDay, workoutPlansByDay],
  )
  const builtinTemplates = useMemo(() => builtinTemplatesFromPlans(workoutPlansByDay), [workoutPlansByDay])

  const todayKey = getDayKey(today)
  const target = dailyTargetsByDay[todayKey]
  const dailyLogsForAnalysis = useMemo(
    () => dailyLogsWithBodyMetrics(dailyLogs, bodyRecords),
    [dailyLogs, bodyRecords],
  )
  const todayLog = useMemo(() => dailyLogsForAnalysis.find((log) => log.date === today), [dailyLogsForAnalysis, today])
  const todayWorkout = useMemo(() => workoutLogs.find((log) => log.date === today), [workoutLogs, today])
  const selectedLog = useMemo(
    () => dailyLogs.find((log) => log.date === selectedDate) ?? { date: selectedDate },
    [dailyLogs, selectedDate],
  )
  const selectedAnalysisLog = useMemo(
    () => dailyLogsForAnalysis.find((log) => log.date === selectedDate),
    [dailyLogsForAnalysis, selectedDate],
  )
  const selectedBodyRecords = useMemo(
    () => bodyRecordsForDate(bodyRecords, selectedDate),
    [bodyRecords, selectedDate],
  )
  const selectedTarget = dailyTargetsByDay[getDayKey(selectedDate)]
  const selectedWorkout = useMemo(
    () => workoutLogs.find((log) => log.date === selectedDate),
    [workoutLogs, selectedDate],
  )
  const restDay = selectedLog.trained === false
  const workoutSummary = useMemo(() => summarizeWorkout(selectedWorkout), [selectedWorkout])
  const templateOptions = useMemo(
    () => [
      ...builtinTemplateOptions(workoutPlansByDay),
      ...workoutTemplates.filter((template) => !template.isBuiltin).map(customTemplateToOption),
    ],
    [workoutPlansByDay, workoutTemplates],
  )
  const selectedTemplate = useMemo(
    () => templateOptions.find((template) => template.id === selectedTemplateId) ?? templateOptions[0],
    [templateOptions, selectedTemplateId],
  )
  const dashboardStats = useMemo(
    () => calculateDashboardStats(dailyLogsForAnalysis, today, dailyTargetsByDay, userWeeklyCalorieTarget),
    [dailyLogsForAnalysis, today, dailyTargetsByDay, userWeeklyCalorieTarget],
  )
  const trendData = useMemo(
    () => (contentTab === 'analytics'
      ? buildTrendData(dailyLogsForAnalysis, today, trendDays, dailyTargetsByDay).map((point) => ({
          ...point,
          bodyfat: bodyValue(bodyRecords, point.fullDate, 'bodyfat'),
        }))
      : [] as TrendPoint[]),
    [dailyLogsForAnalysis, bodyRecords, today, trendDays, dailyTargetsByDay, contentTab],
  )
  const trainingPerformanceData = useMemo(
    () => (contentTab === 'analytics'
      ? buildTrainingPerformanceData(workoutLogs, today, Math.max(60, trendDays))
      : { points: [], series: [], totalLoggedExercises: 0, totalScoredExercises: 0 } as TrainingPerformanceData),
    [workoutLogs, today, trendDays, contentTab],
  )
  const weeklySummary = useMemo(
    () => (contentTab === 'analytics'
      ? createWeeklySummary(dailyLogsForAnalysis, weeklyAnchorDate, dailyTargetsByDay, userWeeklyCalorieTarget, userPreference)
      : {} as WeeklySummary),
    [dailyLogsForAnalysis, weeklyAnchorDate, dailyTargetsByDay, userWeeklyCalorieTarget, userPreference, contentTab],
  )
  const twoWeekAdjustment = useMemo(
    () => getTwoWeekAdjustment(dailyLogsForAnalysis, today, userPreference),
    [dailyLogsForAnalysis, today, userPreference],
  )
  const weekendRisk = useMemo(
    () => getWeekendRiskRecommendation(dailyLogs, today, userPreference),
    [dailyLogs, today, userPreference],
  )
  const todaySnapshot = useMemo(
    () => (contentTab === 'daily' || contentTab === 'workout' || contentTab === 'analytics'
      ? buildTodaySnapshot({
          today,
          log: todayLog,
          workout: todayWorkout,
          target,
          logs: dailyLogsForAnalysis,
          dashboardStats,
          targets: dailyTargetsByDay,
          preference: userPreference,
        })
      : {} as TodaySnapshot),
    [contentTab, today, todayLog, todayWorkout, target, dailyLogsForAnalysis, dashboardStats, dailyTargetsByDay, userPreference],
  )
  const todayTaskPlan = useMemo(
    () => (contentTab === 'daily' || contentTab === 'workout' || contentTab === 'analytics'
      ? buildTodayTaskPlan({
          log: todayLog,
          weight: bodyValue(bodyRecords, today, 'weight'),
          target,
          workout: todayWorkout,
          todaySnapshot,
          dashboardStats,
          preference: userPreference,
        })
      : {} as TodayTaskPlan),
    [contentTab, todayLog, bodyRecords, today, target, todayWorkout, todaySnapshot, dashboardStats, userPreference],
  )
  const selectedWorkoutTaskPlan = useMemo(() => {
    if (contentTab !== 'workout') return {} as TodayTaskPlan
    const selectedSnapshot = buildTodaySnapshot({
      today: selectedDate,
      log: selectedAnalysisLog,
      workout: selectedWorkout,
      target: selectedTarget,
      logs: dailyLogsForAnalysis,
      dashboardStats,
      targets: dailyTargetsByDay,
      preference: userPreference,
    })
    return buildTodayTaskPlan({
      log: selectedAnalysisLog,
      weight: bodyValue(bodyRecords, selectedDate, 'weight'),
      target: selectedTarget,
      workout: selectedWorkout,
      todaySnapshot: selectedSnapshot,
      dashboardStats,
      preference: userPreference,
    })
  }, [
    bodyRecords,
    contentTab,
    dailyLogsForAnalysis,
    dailyTargetsByDay,
    dashboardStats,
    selectedAnalysisLog,
    selectedDate,
    selectedTarget,
    selectedWorkout,
    userPreference,
  ])
  const trendAlerts = useMemo(
    () => (contentTab === 'analytics'
      ? buildTrendAlerts(dailyLogsForAnalysis, today, dailyTargetsByDay, userPreference)
      : [] as AdjustmentRecommendation[]),
    [contentTab, dailyLogsForAnalysis, today, dailyTargetsByDay, userPreference],
  )
  const weeklyConclusionCard = useMemo(
    () => buildWeeklyConclusion(weeklySummary, twoWeekAdjustment.title),
    [buildWeeklyConclusion, weeklySummary, twoWeekAdjustment.title],
  )
  const weeklyActionRecommendations = useMemo(
    () => (contentTab === 'analytics'
      ? buildWeeklyActionRecommendations(weeklySummary, dailyLogsForAnalysis, weeklyAnchorDate, dailyTargetsByDay, userPreference)
      : [] as AdjustmentRecommendation[]),
    [contentTab, weeklySummary, dailyLogsForAnalysis, weeklyAnchorDate, dailyTargetsByDay, userPreference],
  )
  const visibleWorkoutExercises = useMemo(
    () => selectedWorkout?.exercises
      .map((exercise, exerciseIndex) => ({ exercise, exerciseIndex }))
      .filter(({ exercise }) => !showOnlyUnfinishedExercises || !isExerciseFilled(exercise)) ?? [],
    [selectedWorkout, showOnlyUnfinishedExercises],
  )
  const previousRecordsByExerciseKey = useMemo(() => {
    const map = new Map<string, PreviousExerciseRecord | undefined>()
    if (!selectedWorkout) return map
    selectedWorkout.exercises.forEach((exercise) => {
      const key = `${exercise.exerciseId}::${exercise.name.trim()}`
      if (!map.has(key)) map.set(key, findPreviousExerciseRecord(workoutLogs, exercise.exerciseId, exercise.name, selectedDate))
    })
    return map
  }, [selectedWorkout, workoutLogs, selectedDate])

  return {
    userWeeklyCalorieTarget,
    currentPlanData,
    builtinTemplates,
    target,
    dailyLogsForAnalysis,
    todayLog,
    todayWorkout,
    selectedLog,
    selectedAnalysisLog,
    selectedBodyRecords,
    selectedTarget,
    selectedWorkout,
    restDay,
    workoutSummary,
    templateOptions: templateOptions as WorkoutTemplateOption[],
    selectedTemplate,
    dashboardStats,
    trendData,
    trainingPerformanceData,
    weeklySummary,
    twoWeekAdjustment,
    weekendRisk,
    todaySnapshot,
    todayTaskPlan,
    selectedWorkoutTaskPlan,
    trendAlerts,
    weeklyConclusionCard,
    weeklyActionRecommendations,
    visibleWorkoutExercises,
    previousRecordsByExerciseKey,
  }
}
