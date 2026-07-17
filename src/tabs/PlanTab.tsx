import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Card, EmptyState, LoadingBlock, SegmentedControl } from '../components/ui'
import { FormPanel, FormSection } from '../components/FormPanel'
import { PlanAssociationList } from '../components/plan/PlanAssociationList'
import type { DailyTarget, DayKey, UserPlanData, WorkoutPlan } from '../types'
import type { SettingsLeaveGuard } from '../lib/settingsLeaveGuard'
import type { WorkoutTemplateManagerProps } from '../components/workout/WorkoutTemplateManager'

const WorkoutTemplateManager = lazy(() =>
  import('../components/workout/WorkoutTemplateManager').then((module) => ({ default: module.WorkoutTemplateManager })),
)

export type PlanTemplateManagerProps = Omit<
  WorkoutTemplateManagerProps,
  'mode' | 'selectedWorkout' | 'onSaveCurrent' | 'onApplyTemplate'
>

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
        return [day, {
          ...plan,
          exercises: plan.exercises.map((exercise) => ({ ...exercise })),
          cardio: (plan.cardio ?? []).map((cardio) => ({ ...cardio })),
        }]
      }),
    ) as Record<DayKey, WorkoutPlan>,
  }
}

function cloneWorkoutPlanForDay(plan: WorkoutPlan, day: DayKey): WorkoutPlan {
  return {
    ...plan,
    day,
    exercises: plan.exercises.map((exercise) => ({ ...exercise })),
    cardio: (plan.cardio ?? []).map((cardio) => ({ ...cardio })),
  }
}

function restPlanForDay(day: DayKey): WorkoutPlan {
  return {
    day,
    name: '休息日',
    focus: '恢复',
    exercises: [],
    cardio: [],
  }
}

function buildPlanCatalog(data: UserPlanData): WorkoutPlan[] {
  return planDays
    .map((day) => data.workoutPlans[day])
    .filter((plan) => plan.exercises.length > 0 || (plan.cardio ?? []).length > 0)
    .map((plan) => cloneWorkoutPlanForDay(plan, plan.day))
}

type PlanTabProps = {
  planData: UserPlanData
  onSave: (planData: UserPlanData) => Promise<UserPlanData>
  onLeaveGuardChange?: (guard: SettingsLeaveGuard | null) => void
  templateManagerProps: PlanTemplateManagerProps
}

export function PlanTab({ planData, onSave, onLeaveGuardChange, templateManagerProps }: PlanTabProps) {
  const sourceDraft = useMemo(() => clonePlanData(planData), [planData])
  const [draftOverride, setDraftOverride] = useState<UserPlanData | null>(null)
  const [saving, setSaving] = useState(false)
  const [planView, setPlanView] = useState<'schedule' | 'templates'>('schedule')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const saveForLeaveRef = useRef<() => Promise<boolean>>(async () => false)
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
  const totalCardioCount = useMemo(
    () => Object.values(draft.workoutPlans).reduce((sum, plan) => sum + (plan.cardio ?? []).length, 0),
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

  async function handleSave(): Promise<boolean> {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await onSave(draft)
      setDraftOverride(null)
      setMessage('每日训练计划关联已保存到当前账号。')
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存训练计划关联失败')
      return false
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    saveForLeaveRef.current = handleSave
  })

  useEffect(() => {
    if (!dirty) {
      onLeaveGuardChange?.(null)
      return
    }
    const guard: SettingsLeaveGuard = {
      sectionLabel: '训练计划',
      save: () => saveForLeaveRef.current(),
    }
    onLeaveGuardChange?.(guard)
    return () => onLeaveGuardChange?.(null)
  }, [dirty, onLeaveGuardChange])

  return (
    <div className="grid gap-4">
      <FormPanel
        title="个人计划"
        description={planView === 'schedule' ? '设置每天关联哪一个训练计划。' : '创建、编辑或导入可重复使用的训练模板。'}
        badges={
          <>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{trainingDayCount} 个训练日</span>
            {dirty ? <Badge tone="warning">未保存</Badge> : null}
          </>
        }
        actions={planView === 'schedule' ? (
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saveLabel}
          </Button>
        ) : undefined}
        success={message}
        error={error}
        warning={dirty ? '训练计划关联有未保存修改。' : undefined}
      >
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
          <span><strong className="tabular-nums text-slate-950 dark:text-slate-50">{trainingDayCount}</strong> 个训练日</span>
          <span><strong className="tabular-nums text-slate-950 dark:text-slate-50">{totalExerciseCount}</strong> 个动作</span>
          <span><strong className="tabular-nums text-slate-950 dark:text-slate-50">{totalCardioCount}</strong> 个有氧项</span>
        </div>
      </FormPanel>

      <div className="flex justify-center">
        <SegmentedControl
          ariaLabel="训练计划管理视图"
          value={planView}
          options={[
            { value: 'schedule', label: '每周关联' },
            { value: 'templates', label: '模板库' },
          ]}
          onChange={setPlanView}
        />
      </div>

      {planView === 'schedule' ? (
        <Card>
          <FormSection title="每日训练关联" actions={<span className="text-xs font-medium text-slate-500 dark:text-slate-400">7 天</span>}>
            {planCatalog.length === 0 ? (
              <EmptyState title="还没有可关联的训练计划" message="先到“模板库”新建或导入模板，再设置每天的训练安排。" />
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
      ) : (
        <Suspense fallback={<LoadingBlock title="正在加载训练模板…" lines={3} />}>
          <WorkoutTemplateManager {...templateManagerProps} mode="settings" />
        </Suspense>
      )}
      {dirty ? (
        <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 rounded-lg border border-[var(--surface-border-strong)] bg-[var(--surface-panel)] p-3 dark:border-slate-700 dark:bg-slate-900 sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">计划关联尚未保存</p>
            <Button onClick={() => void handleSave()} disabled={saving}>{saveLabel}</Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
