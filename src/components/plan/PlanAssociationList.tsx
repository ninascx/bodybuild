import { Badge, Field, Select } from '../ui'
import { dayNames } from '../../data/plans'
import type { DayKey, UserPlanData, WorkoutPlan } from '../../types'

type PlanAssociationListProps = {
  days: DayKey[]
  draft: UserPlanData
  planCatalog: WorkoutPlan[]
  restValue: string
  onChangeDayAssociation: (day: DayKey, value: string) => void
}

function selectedPlanValue({
  day,
  draft,
  planCatalog,
  restValue,
}: {
  day: DayKey
  draft: UserPlanData
  planCatalog: WorkoutPlan[]
  restValue: string
}): string {
  const target = draft.dailyTargets[day]
  const plan = draft.workoutPlans[day]
  if (!target.isTrainingDay) return restValue

  const matchedCatalogPlan = planCatalog.find((item) => item.name === plan.name && item.focus === plan.focus)
  return String(matchedCatalogPlan?.day ?? planCatalog[0]?.day ?? restValue)
}

export function PlanAssociationList({
  days,
  draft,
  planCatalog,
  restValue,
  onChangeDayAssociation,
}: PlanAssociationListProps) {
  return (
    <div className="grid gap-3">
      {days.map((day) => {
        const target = draft.dailyTargets[day]
        const plan = draft.workoutPlans[day]
        const selectedValue = selectedPlanValue({ day, draft, planCatalog, restValue })

        return (
          <div
            key={day}
            className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 md:grid-cols-[8rem_minmax(0,1fr)_minmax(15rem,1.2fr)] md:items-center"
          >
            <div className="min-w-0">
              <p className="font-semibold text-slate-950 dark:text-slate-50">{dayNames[day]}</p>
              <div className="mt-2">
                <Badge tone={target.isTrainingDay ? 'positive' : 'neutral'}>
                  {target.isTrainingDay ? '训练日' : '休息日'}
                </Badge>
              </div>
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{plan.name}</p>
              <p className="mt-1 truncate text-xs leading-5 text-slate-500 dark:text-slate-400">
                {target.isTrainingDay ? `${plan.focus} · ${plan.exercises.length} 个动作` : '不安排训练'}
              </p>
            </div>

            <Field label="关联训练计划" helper="切换后会复制对应训练日的动作到这一天，保存前不会同步到账户。">
              <Select value={selectedValue} onChange={(event) => onChangeDayAssociation(day, event.target.value)}>
                <option value={restValue}>休息日 / 不训练</option>
                {planCatalog.map((option) => (
                  <option key={`${day}-${option.day}-${option.name}`} value={option.day}>
                    {dayNames[option.day]} · {option.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )
      })}
    </div>
  )
}
