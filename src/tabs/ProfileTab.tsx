import { useEffect, useMemo, useState } from 'react'
import type { CurrentUser } from '../lib/storage'
import { fetchUserProfile, saveUserProfile } from '../lib/storage'
import { mergeUserPreference } from '../lib/userPreferences'
import type { DailyTarget, DayKey, UserPlanData, UserPreference, UserProfile, WorkoutPlan } from '../types'
import { dayNames } from '../data/plans'
import { Badge, Button, Card, Field, LoadingBlock, StatusMessage, TextArea, TextInput } from '../components/ui'
import { NumberField } from '../components/NumberField'

type ProfileTabProps = {
  currentUser: CurrentUser
  preference: UserPreference
  planData: UserPlanData
  onSavePreference: (preference: UserPreference) => Promise<UserPreference>
  onSavePlan: (planData: UserPlanData) => Promise<UserPlanData>
}

const profileDays: DayKey[] = [0, 1, 2, 3, 4, 5, 6]

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

export function ProfileTab({ currentUser, preference, planData, onSavePreference, onSavePlan }: ProfileTabProps) {
  const [profile, setProfile] = useState<UserProfile>({ trainingDays: [] })
  const sourcePreferenceDraft = useMemo(() => mergeUserPreference(preference), [preference])
  const sourcePlanDraft = useMemo(() => clonePlanData(planData), [planData])
  const [draftOverride, setDraftOverride] = useState<{ preference: UserPreference; planData: UserPlanData } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileDirty, setProfileDirty] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const preferenceDraft = draftOverride?.preference ?? sourcePreferenceDraft
  const planDraft = draftOverride?.planData ?? sourcePlanDraft
  const dirty = profileDirty || draftOverride !== null
  const saveDisabled = saving || loading
  const saveLabel = saving ? '保存中...' : dirty ? '保存修改' : '保存资料'

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

  useEffect(() => {
    if (dirty) return
    let canceled = false
    void Promise.resolve().then(async () => {
      setLoading(true)
      setError('')
      try {
        const nextProfile = await fetchUserProfile()
        if (!canceled) {
          const fallbackTrainingDays = Object.values(planData.dailyTargets)
            .filter((target) => target.isTrainingDay)
            .map((target) => target.day)
          setProfile({
            ...nextProfile,
            trainingDays: nextProfile.trainingDays && nextProfile.trainingDays.length > 0
              ? nextProfile.trainingDays
              : fallbackTrainingDays,
          })
        }
      } catch (err) {
        if (!canceled) setError(err instanceof Error ? err.message : '读取个人资料失败')
      } finally {
        if (!canceled) setLoading(false)
      }
    })
    return () => {
      canceled = true
    }
  }, [currentUser.id, dirty, planData.dailyTargets])

  function updateProfile(patch: Partial<UserProfile>) {
    setProfileDirty(true)
    setProfile((current) => ({ ...current, ...patch }))
    setMessage('')
    setError('')
  }

  function updatePreference(patch: Partial<UserPreference>) {
    setDraftOverride((current) => {
      const base = current ?? { preference: preferenceDraft, planData: planDraft }
      return {
        ...base,
        preference: mergeUserPreference({ ...base.preference, ...patch }),
      }
    })
    setMessage('')
    setError('')
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
    setMessage('')
    setError('')
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
    setMessage('')
    setError('')
  }

  function toggleTrainingDay(day: DayKey) {
    const currentDays = profile.trainingDays ?? []
    const willEnable = !currentDays.includes(day)
    const nextDays = willEnable
      ? [...currentDays, day].sort((a, b) => a - b)
      : currentDays.filter((value) => value !== day)
    updateProfile({ trainingDays: nextDays })
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
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const [savedProfile] = await Promise.all([
        saveUserProfile(profile),
        onSavePreference(preferenceDraft),
        onSavePlan(planDraft),
      ])
      setProfile({ ...savedProfile, trainingDays: savedProfile.trainingDays ?? [] })
      setDraftOverride(null)
      setProfileDirty(false)
      setMessage('个人资料和配置已保存。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存个人资料失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">个人主页</h2>
              <Badge tone="neutral">@{currentUser.username}</Badge>
              {dirty ? <Badge tone="warning">未保存</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{currentUser.displayName}</p>
          </div>
          <Button onClick={() => void handleSave()} disabled={saveDisabled}>
            {saveLabel}
          </Button>
        </div>

        {message ? <StatusMessage className="mt-4" tone="positive">{message}</StatusMessage> : null}
        {error ? <StatusMessage className="mt-4" tone="danger">{error}</StatusMessage> : null}
        {dirty && !message && !error ? (
          <StatusMessage className="mt-4" tone="warning">有未保存修改，离开前记得保存。</StatusMessage>
        ) : null}

        {loading ? (
          <LoadingBlock className="mt-5" title="正在加载个人资料..." />
        ) : (
          <div className="mt-5 grid gap-6">
            <section>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">基础资料</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Field label="性别">
                  <select
                    className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
                    value={profile.sex ?? ''}
                    onChange={(event) => updateProfile({ sex: event.target.value === 'male' || event.target.value === 'female' || event.target.value === 'other' ? event.target.value : undefined })}
                  >
                    <option value="">未设置</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                </Field>
                <Field label="出生日期">
                  <TextInput type="date" value={profile.birthDate ?? ''} onChange={(event) => updateProfile({ birthDate: event.target.value || undefined })} />
                </Field>
                <NumberField label="身高 cm" value={profile.heightCm} kind="decimal" range={{ min: 80, max: 260 }} onChange={(value) => updateProfile({ heightCm: value })} />
                <NumberField label="估算体脂 %" value={profile.estimatedBodyFatPercent} kind="decimal" range={{ min: 1, max: 80 }} onChange={(value) => updateProfile({ estimatedBodyFatPercent: value })} />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">当前身体属性</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                <NumberField label="当前体重 kg" value={profile.currentWeightKg} kind="decimal" range={{ min: 20, max: 300 }} onChange={(value) => updateProfile({ currentWeightKg: value })} />
                <NumberField label="腰围 cm" value={profile.waistCm} kind="decimal" range={{ min: 30, max: 250 }} onChange={(value) => updateProfile({ waistCm: value })} />
                <NumberField label="胸围 cm" value={profile.chestCm} kind="decimal" range={{ min: 30, max: 250 }} onChange={(value) => updateProfile({ chestCm: value })} />
                <NumberField label="上臂围 cm" value={profile.upperArmCm} kind="decimal" range={{ min: 10, max: 100 }} onChange={(value) => updateProfile({ upperArmCm: value })} />
                <NumberField label="大腿围 cm" value={profile.thighCm} kind="decimal" range={{ min: 20, max: 150 }} onChange={(value) => updateProfile({ thighCm: value })} />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">目标与习惯</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <NumberField label="初始体重 kg" value={profile.initialWeightKg} kind="decimal" range={{ min: 20, max: 300 }} onChange={(value) => updateProfile({ initialWeightKg: value })} />
                <NumberField label="睡眠目标 h" value={profile.sleepHours} kind="decimal" range={{ min: 0, max: 24, allowZero: true }} onChange={(value) => updateProfile({ sleepHours: value })} />
                <NumberField label="平均步数" value={profile.averageSteps} range={{ min: 0, max: 100000, allowZero: true }} onChange={(value) => updateProfile({ averageSteps: value })} />
                <Field label="目标周期">
                  <TextInput value={profile.targetWeeks ?? ''} onChange={(event) => updateProfile({ targetWeeks: event.target.value })} />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="目标">
                  <TextArea value={profile.goal ?? ''} onChange={(event) => updateProfile({ goal: event.target.value })} />
                </Field>
              </div>
            </section>

            <section>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">极简个人化配置</h3>
                <Badge tone="neutral">{trainingDayCount} 个训练日</Badge>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Field label="当前目标">
                  <select
                    className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
                    value={preferenceDraft.goalType ?? 'fat_loss'}
                    onChange={(event) => updateGoalType(event.target.value === 'muscle_gain' || event.target.value === 'maintenance' ? event.target.value : 'fat_loss')}
                  >
                    <option value="fat_loss">减脂</option>
                    <option value="muscle_gain">增肌</option>
                    <option value="maintenance">维持</option>
                  </select>
                </Field>
                <NumberField label="每周体重变化目标 kg" value={preferenceDraft.weeklyWeightChangeGoalKg} kind="decimal" range={{ min: -2, max: 2, allowZero: true }} onChange={(value) => updatePreference({ weeklyWeightChangeGoalKg: value })} />
                <NumberField label="日热量目标 kcal" value={averageCalories} range={{ min: 0, max: 10000, allowZero: true }} onChange={updateAverageCalories} />
                <NumberField label="蛋白目标 g" value={averageProtein} range={{ min: 0, max: 500, allowZero: true }} onChange={(value) => updateAllTargets({ protein: value ?? 0 })} />
                <NumberField label="步数底线" value={averageSteps} range={{ min: 0, max: 100000, allowZero: true }} onChange={(value) => updateAllTargets({ stepTarget: value ?? 0 })} />
                <NumberField label="睡眠底线 h" value={preferenceDraft.sleepFloorHours} kind="decimal" range={{ min: 0, max: 24, allowZero: true }} onChange={(value) => updatePreference({ sleepFloorHours: value })} />
                <NumberField label="疲劳阈值" value={preferenceDraft.fatigueThreshold} range={{ min: 0, max: 10, allowZero: true }} onChange={(value) => updatePreference({ fatigueThreshold: value })} />
                <NumberField label="周末热量上限 kcal" value={preferenceDraft.weekendCalorieUpperKcal} range={{ min: 0, max: 10000, allowZero: true }} onChange={updateWeekendUpper} />
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">训练天数</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profileDays.map((day) => {
                    const active = (profile.trainingDays ?? []).includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleTrainingDay(day)}
                        className={`h-10 rounded-md px-3 text-sm font-medium transition ${
                          active
                            ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        {dayNames[day]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {dirty ? '有未保存修改，保存后会同步个人资料、目标规则和每周训练天数。' : '当前资料已加载；保存后会同步个人资料、目标规则和每周训练天数。'}
              </p>
              <Button className="w-full sm:w-auto" onClick={() => void handleSave()} disabled={saveDisabled}>
                {saveLabel}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
