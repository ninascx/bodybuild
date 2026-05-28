import { useMemo, useState } from 'react'
import { Badge, Button, Card, EmptyState, Field, InsightCard, MetricGrid, StatusMessage } from '../components/ui'
import { dayNames } from '../data/plans'
import type { DailyTarget, DayKey, UserPlanData, WorkoutPlan } from '../types'

const planDays: DayKey[] = [0, 1, 2, 3, 4, 5, 6]
const restValue = 'rest'

function clonePlanData(data: UserPlanData): UserPlanData {
  return {
    dailyTargets: Object.fromEntries(
      planDays.map((day) => {
        const target = data.dailyTargets[day]
        return [day, { ...target, notes: [...target.notes] }]
      }),
    ) as Record<DayKey, DailyTarget>,
    workoutPlans: Object.fromEntries(
      planDays.map((day) => {
        const plan = data.workoutPlans[day]
        return [day, { ...plan, exercises: plan.exercises.map((exercise) => ({ ...exercise })) }]
      }),
    ) as Record<DayKey, WorkoutPlan>,
  }
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

function buildPlanCatalog(data: UserPlanData): WorkoutPlan[] {
  return planDays
    .map((day) => data.workoutPlans[day])
    .filter((plan) => plan.exercises.length > 0)
    .map((plan) => cloneWorkoutPlanForDay(plan, plan.day))
}

type PlanTabProps = {
  planData: UserPlanData
  weeklyCalorieTarget: number
  onSave: (planData: UserPlanData) => Promise<UserPlanData>
}

export function PlanTab({ planData, weeklyCalorieTarget, onSave }: PlanTabProps) {
  const sourceDraft = useMemo(() => clonePlanData(planData), [planData])
  const [draftOverride, setDraftOverride] = useState<UserPlanData | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const draft = draftOverride ?? sourceDraft
  const planCatalog = useMemo(() => buildPlanCatalog(draft), [draft])
  const dirty = draftOverride !== null
  const saveLabel = saving ? '保存中...' : dirty ? '保存修改' : '保存关联'

  const trainingDayCount = useMemo(
    () => Object.values(draft.dailyTargets).filter((item) => item.isTrainingDay).length,
    [draft.dailyTargets],
  )
  const totalExerciseCount = useMemo(
    () => Object.values(draft.workoutPlans).reduce((sum, plan) => sum + plan.exercises.length, 0),
    [draft.workoutPlans],
  )

  function updateDayAssociation(day: DayKey, value: string) {
    setMessage('')
    setError('')
    setDraftOverride((currentDraft) => {
      const current = currentDraft ?? draft
      if (value === restValue) {
        return {
          dailyTargets: {
            ...current.dailyTargets,
            [day]: {
              ...current.dailyTargets[day],
              workoutName: '休息日',
              isTrainingDay: false,
            },
          },
          workoutPlans: {
            ...current.workoutPlans,
            [day]: restPlanForDay(day),
          },
        }
      }

      const sourceDay = Number(value) as DayKey
      const sourcePlan = planCatalog.find((plan) => plan.day === sourceDay)
      if (!sourcePlan) return current

      return {
        dailyTargets: {
          ...current.dailyTargets,
          [day]: {
            ...current.dailyTargets[day],
            workoutName: sourcePlan.name,
            isTrainingDay: true,
          },
        },
        workoutPlans: {
          ...current.workoutPlans,
          [day]: cloneWorkoutPlanForDay(sourcePlan, day),
        },
      }
    })
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await onSave(draft)
      setDraftOverride(null)
      setMessage('每日训练计划关联已保存到当前账号。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存训练计划关联失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">个人计划</h2>
              <Badge tone="neutral">周目标约 {weeklyCalorieTarget} kcal</Badge>
              <Badge tone="neutral">{trainingDayCount} 个训练日</Badge>
              {dirty ? <Badge tone="warning">未保存</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              这里只设置每天关联哪个训练计划；动作内容和饮食目标不在这里单独填写。
            </p>
          </div>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saveLabel}
          </Button>
        </div>

        {message ? <StatusMessage className="mt-4" tone="positive">{message}</StatusMessage> : null}
        {error ? <StatusMessage className="mt-4" tone="danger">{error}</StatusMessage> : null}
        {dirty && !message && !error ? (
          <StatusMessage className="mt-4" tone="warning">训练计划关联有未保存修改。</StatusMessage>
        ) : null}

        <MetricGrid className="mt-5 lg:grid-cols-3">
          <InsightCard title="训练日" value={`${trainingDayCount} 天`} message="每周安排" tone={trainingDayCount > 0 ? 'positive' : 'neutral'} />
          <InsightCard title="动作总数" value={totalExerciseCount} message="来自已关联计划" tone="neutral" />
          <InsightCard title="可关联计划" value={planCatalog.length} message="从当前周训练计划生成" tone={planCatalog.length > 0 ? 'positive' : 'warning'} />
        </MetricGrid>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">每日训练关联</h3>
          <Badge tone="neutral">7 天</Badge>
        </div>

        {planCatalog.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="还没有可关联的训练计划" message="先使用默认计划，或在训练页创建/导入模板后再关联。" />
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {planDays.map((day) => {
              const target = draft.dailyTargets[day]
              const plan = draft.workoutPlans[day]
              const matchedCatalogPlan = target.isTrainingDay
                ? planCatalog.find((item) => item.name === plan.name && item.focus === plan.focus)
                : undefined
              const selectedValue = target.isTrainingDay ? String(matchedCatalogPlan?.day ?? planCatalog[0]?.day ?? restValue) : restValue
              return (
                <div key={day} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[8rem_1fr_1.2fr] md:items-center">
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-slate-50">{dayNames[day]}</p>
                    <Badge tone={target.isTrainingDay ? 'positive' : 'neutral'}>{target.isTrainingDay ? '训练日' : '休息日'}</Badge>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{plan.name}</p>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      {target.isTrainingDay ? `${plan.focus} · ${plan.exercises.length} 个动作` : '不安排训练'}
                    </p>
                  </div>
                  <Field label="关联训练计划">
                    <select
                      className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
                      value={selectedValue}
                      onChange={(event) => updateDayAssociation(day, event.target.value)}
                    >
                      <option value={restValue}>休息日 / 不训练</option>
                      {planCatalog.map((option) => (
                        <option key={`${day}-${option.day}-${option.name}`} value={option.day}>
                          {dayNames[option.day]} · {option.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
