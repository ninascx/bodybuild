import { useMemo, useState } from 'react'
import { mergeUserPreference } from '../../lib/userPreferences'
import type { DailyTarget, DayKey, UserPlanData, UserPreference, UserProfile, WorkoutPlan } from '../../types'

const profileDays: DayKey[] = [0, 1, 2, 3, 4, 5, 6]

type ProfileDraftState = {
  preference: UserPreference
  planData: UserPlanData
}

type UseProfileDraftParams = {
  preference: UserPreference
  planData: UserPlanData
  onDraftChange: () => void
}

function clonePlanData(data: UserPlanData): UserPlanData {
  return {
    dailyTargets: Object.fromEntries(
      profileDays.map((day) => {
        const target = data.dailyTargets[day]
        return [day, { ...target, notes: [...target.notes] }]
      }),
    ) as Record<DayKey, DailyTarget>,
    workoutPlans: Object.fromEntries(
      profileDays.map((day) => {
        const plan = data.workoutPlans[day]
        return [day, { ...plan, exercises: plan.exercises.map((exercise) => ({ ...exercise })) }]
      }),
    ) as Record<DayKey, WorkoutPlan>,
  }
}

function targetCalories(target: DailyTarget): number | undefined {
  if (target.calories !== undefined) return target.calories
  if (target.calorieRange) return Math.round((target.calorieRange[0] + target.calorieRange[1]) / 2)
  return undefined
}

function defaultWeeklyWeightChange(goalType: UserPreference['goalType']): number {
  if (goalType === 'muscle_gain') return 0.25
  if (goalType === 'maintenance') return 0
  return -0.4
}

function cloneWorkoutPlanForDay(plan: WorkoutPlan, day: DayKey): WorkoutPlan {
  return {
    ...plan,
    day,
    exercises: plan.exercises.map((exercise) => ({ ...exercise })),
  }
}

function restPlanForDay(day: DayKey): WorkoutPlan {
  return {
    day,
    name: '休息日',
    focus: '恢复',
    exercises: [],
  }
}

export function useProfileDraft({ preference, planData, onDraftChange }: UseProfileDraftParams) {
  const [profile, setProfile] = useState<UserProfile>({ trainingDays: [] })
  const sourcePreferenceDraft = useMemo(() => mergeUserPreference(preference), [preference])
  const sourcePlanDraft = useMemo(() => clonePlanData(planData), [planData])
  const [draftOverride, setDraftOverride] = useState<ProfileDraftState | null>(null)
  const [profileDirty, setProfileDirty] = useState(false)
  const preferenceDraft = draftOverride?.preference ?? sourcePreferenceDraft
  const planDraft = draftOverride?.planData ?? sourcePlanDraft
  const dirty = profileDirty || draftOverride !== null

  const trainingDayCount = useMemo(
    () => Object.values(planDraft.dailyTargets).filter((target) => target.isTrainingDay).length,
    [planDraft.dailyTargets],
  )
  const averageCalories = useMemo(() => {
    const values = Object.values(planDraft.dailyTargets)
      .map(targetCalories)
      .filter((value): value is number => value !== undefined)
    if (values.length === 0) return undefined
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  }, [planDraft.dailyTargets])
  const averageProtein = useMemo(() => {
    const values = Object.values(planDraft.dailyTargets).map((target) => target.protein)
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  }, [planDraft.dailyTargets])
  const averageSteps = useMemo(() => {
    const values = Object.values(planDraft.dailyTargets).map((target) => target.stepTarget)
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  }, [planDraft.dailyTargets])

  function updateProfile(patch: Partial<UserProfile>) {
    setProfileDirty(true)
    setProfile((current) => ({ ...current, ...patch }))
    onDraftChange()
  }

  function updatePreference(patch: Partial<UserPreference>) {
    setDraftOverride((current) => {
      const base = current ?? { preference: preferenceDraft, planData: planDraft }
      return {
        ...base,
        preference: mergeUserPreference({ ...base.preference, ...patch }),
      }
    })
    onDraftChange()
  }

  function updateGoalType(goalType: NonNullable<UserPreference['goalType']>) {
    updatePreference({
      goalType,
      weeklyWeightChangeGoalKg: defaultWeeklyWeightChange(goalType),
    })
  }

  function updateAllTargets(patch: Partial<DailyTarget>) {
    setDraftOverride((current) => {
      const base = current ?? { preference: preferenceDraft, planData: planDraft }
      return {
        ...base,
        planData: {
          ...base.planData,
          dailyTargets: Object.fromEntries(
            profileDays.map((day) => [day, { ...base.planData.dailyTargets[day], ...patch }]),
          ) as Record<DayKey, DailyTarget>,
        },
      }
    })
    onDraftChange()
  }

  function updateAverageCalories(value: number | undefined) {
    updateAllTargets({ calories: value, calorieRange: undefined })
  }

  function updateWeekendUpper(value: number | undefined) {
    setDraftOverride((current) => {
      const base = current ?? { preference: preferenceDraft, planData: planDraft }
      const nextPreference = mergeUserPreference({ ...base.preference, weekendCalorieUpperKcal: value })
      if (value === undefined) {
        return { ...base, preference: nextPreference }
      }
      return {
        preference: nextPreference,
        planData: {
          ...base.planData,
          dailyTargets: {
            ...base.planData.dailyTargets,
            5: {
              ...base.planData.dailyTargets[5],
              calories: undefined,
              calorieRange: [base.planData.dailyTargets[5].calorieRange?.[0] ?? Math.max(0, value - 400), value],
            },
            6: {
              ...base.planData.dailyTargets[6],
              calories: undefined,
              calorieRange: [base.planData.dailyTargets[6].calorieRange?.[0] ?? Math.max(0, value - 400), value],
            },
          },
        },
      }
    })
    onDraftChange()
  }

  function toggleTrainingDay(day: DayKey) {
    const currentDays = profile.trainingDays ?? []
    const willEnable = !currentDays.includes(day)
    const nextDays = willEnable
      ? [...currentDays, day].sort((a, b) => a - b)
      : currentDays.filter((value) => value !== day)

    setProfileDirty(true)
    setProfile((current) => ({ ...current, trainingDays: nextDays }))
    setDraftOverride((currentDraft) => {
      const base = currentDraft ?? { preference: preferenceDraft, planData: planDraft }
      const current = base.planData
      const sourcePlan =
        current.workoutPlans[day].exercises.length > 0
          ? current.workoutPlans[day]
          : Object.values(current.workoutPlans).find((plan) => plan.exercises.length > 0) ??
            Object.values(planData.workoutPlans).find((plan) => plan.exercises.length > 0)
      const nextPlan = willEnable && sourcePlan
        ? cloneWorkoutPlanForDay(sourcePlan, day)
        : restPlanForDay(day)
      return {
        ...base,
        planData: {
          ...current,
          dailyTargets: {
            ...current.dailyTargets,
            [day]: {
              ...current.dailyTargets[day],
              isTrainingDay: willEnable,
              workoutName: willEnable ? nextPlan.name : '休息日',
            },
          },
          workoutPlans: {
            ...current.workoutPlans,
            [day]: nextPlan,
          },
        },
      }
    })
    onDraftChange()
  }

  function resetAfterSave(savedProfile: UserProfile) {
    setProfile({ ...savedProfile, trainingDays: savedProfile.trainingDays ?? [] })
    setDraftOverride(null)
    setProfileDirty(false)
  }

  return {
    profile,
    setProfile,
    preferenceDraft,
    planDraft,
    dirty,
    profileDays,
    trainingDayCount,
    averageCalories,
    averageProtein,
    averageSteps,
    updateProfile,
    updateGoalType,
    updatePreference,
    updateAllTargets,
    updateAverageCalories,
    updateWeekendUpper,
    toggleTrainingDay,
    resetAfterSave,
  }
}
