import { useMemo, useState } from 'react'
import { Badge, Button, Card, EmptyState, InsightCard, MetricGrid } from '../components/ui'
import { FormPanel, FormSection } from '../components/FormPanel'
import { PlanAssociationList } from '../components/plan/PlanAssociationList'
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
  onSave: (planData: UserPlanData) => Promise<UserPlanData>
}

export function PlanTab({ planData, onSave }: PlanTabProps) {
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
      <FormPanel
        title="个人计划"
        description="这里只设置每天关联哪一个训练计划；动作内容可在训练页的模板管理中编辑。"
        badges={
          <>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{trainingDayCount} 个训练日</span>
            {dirty ? <Badge tone="warning">未保存</Badge> : null}
          </>
        }
        actions={
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saveLabel}
          </Button>
        }
        success={message}
        error={error}
        warning={dirty ? '训练计划关联有未保存修改。' : undefined}
      >
        <MetricGrid className="lg:grid-cols-3">
          <InsightCard title="训练日" value={`${trainingDayCount} 天`} message="每周安排" tone={trainingDayCount > 0 ? 'positive' : 'neutral'} />
          <InsightCard title="动作总数" value={totalExerciseCount} message="来自已关联计划" tone="neutral" />
          <InsightCard title="可关联计划" value={planCatalog.length} message="从当前周训练计划生成" tone={planCatalog.length > 0 ? 'positive' : 'warning'} />
        </MetricGrid>
      </FormPanel>

      <Card>
        <FormSection title="每日训练关联" actions={<span className="text-xs font-medium text-slate-500 dark:text-slate-400">7 天</span>}>
          {planCatalog.length === 0 ? (
            <EmptyState title="还没有可关联的训练计划" message="先使用默认计划，或在训练页创建/导入模板后再关联。" />
          ) : (
            <PlanAssociationList
              days={planDays}
              draft={draft}
              planCatalog={planCatalog}
              restValue={restValue}
              onChangeDayAssociation={updateDayAssociation}
            />
          )}
        </FormSection>
      </Card>
    </div>
  )
}
