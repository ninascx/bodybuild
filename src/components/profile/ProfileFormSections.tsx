import type { BodyRecord, DailyTarget, DayKey, UserPreference, UserProfile } from '../../types'
import { bodyMetricDefinition, latestBodyRecord } from '../../lib/bodyMetrics'
import { dayNames } from '../../data/plans'
import { NumberField } from '../NumberField'
import { Button, Field, Select, TextArea, TextInput } from '../ui'
import { FormSection } from '../FormPanel'

type GoalType = NonNullable<UserPreference['goalType']>

export function BasicProfileSection({
  profile,
  onUpdateProfile,
}: {
  profile: UserProfile
  onUpdateProfile: (patch: Partial<UserProfile>) => void
}) {
  return (
    <FormSection title="个人资料">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Field label="性别">
          <Select
            value={profile.sex ?? ''}
            onChange={(event) => onUpdateProfile({ sex: event.target.value === 'male' || event.target.value === 'female' || event.target.value === 'other' ? event.target.value : undefined })}
          >
            <option value="">未设置</option>
            <option value="male">男</option>
            <option value="female">女</option>
            <option value="other">其他</option>
          </Select>
        </Field>
        <Field label="出生日期">
          <TextInput type="date" value={profile.birthDate ?? ''} onChange={(event) => onUpdateProfile({ birthDate: event.target.value || undefined })} />
        </Field>
        <NumberField label="身高 cm" value={profile.heightCm} kind="decimal" range={{ min: 80, max: 260 }} onChange={(value) => onUpdateProfile({ heightCm: value })} />
      </div>
    </FormSection>
  )
}

export function LatestBodyMetricsSection({ records }: { records: BodyRecord[] }) {
  const types = ['weight', 'bodyfat', 'weist', 'chest'] as const
  return (
    <FormSection title="最新身体状态" description="身体指标统一在“记录”页维护，这里只显示最新值。">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {types.map((type) => {
          const record = latestBodyRecord(records, type)
          const definition = bodyMetricDefinition(type)
          return (
            <div key={type} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{definition.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950 dark:text-slate-50">
                {record ? `${record.value}${record.unit}` : '未记录'}
              </p>
              <p className="mt-1 font-mono text-[10px] text-slate-400">{record?.datestr ?? type}</p>
            </div>
          )
        })}
      </div>
    </FormSection>
  )
}

export function ProfileGoalsSection({
  profile,
  onUpdateProfile,
}: {
  profile: UserProfile
  onUpdateProfile: (patch: Partial<UserProfile>) => void
}) {
  return (
    <FormSection title="目标备注">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <NumberField label="初始体重 kg" value={profile.initialWeightKg} kind="decimal" range={{ min: 20, max: 300 }} onChange={(value) => onUpdateProfile({ initialWeightKg: value })} />
        <NumberField label="睡眠目标 h" value={profile.sleepHours} kind="decimal" range={{ min: 0, max: 24, allowZero: true }} onChange={(value) => onUpdateProfile({ sleepHours: value })} />
        <NumberField label="平均步数" value={profile.averageSteps} range={{ min: 0, max: 100000, allowZero: true }} onChange={(value) => onUpdateProfile({ averageSteps: value })} />
        <Field label="目标周期">
          <TextInput value={profile.targetWeeks ?? ''} onChange={(event) => onUpdateProfile({ targetWeeks: event.target.value })} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="目标">
          <TextArea value={profile.goal ?? ''} onChange={(event) => onUpdateProfile({ goal: event.target.value })} />
        </Field>
      </div>
    </FormSection>
  )
}

export function PersonalizationSection({
  profile,
  preference,
  trainingDayCount,
  averageCalories,
  averageProtein,
  averageSteps,
  profileDays,
  onUpdateGoalType,
  onUpdatePreference,
  onUpdateAllTargets,
  onUpdateAverageCalories,
  onUpdateWeekendUpper,
  onToggleTrainingDay,
}: {
  profile: UserProfile
  preference: UserPreference
  trainingDayCount: number
  averageCalories: number | undefined
  averageProtein: number
  averageSteps: number
  profileDays: DayKey[]
  onUpdateGoalType: (goalType: GoalType) => void
  onUpdatePreference: (patch: Partial<UserPreference>) => void
  onUpdateAllTargets: (patch: Partial<DailyTarget>) => void
  onUpdateAverageCalories: (value: number | undefined) => void
  onUpdateWeekendUpper: (value: number | undefined) => void
  onToggleTrainingDay: (day: DayKey) => void
}) {
  return (
    <>
      <FormSection title="目标规则">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Field label="当前目标">
            <Select
              value={preference.goalType ?? 'fat_loss'}
              onChange={(event) => onUpdateGoalType(event.target.value === 'muscle_gain' || event.target.value === 'maintenance' ? event.target.value : 'fat_loss')}
            >
              <option value="fat_loss">减脂</option>
              <option value="muscle_gain">增肌</option>
              <option value="maintenance">维持</option>
            </Select>
          </Field>
          <NumberField label="每周体重变化目标 kg" value={preference.weeklyWeightChangeGoalKg} kind="decimal" range={{ min: -2, max: 2, allowZero: true }} onChange={(value) => onUpdatePreference({ weeklyWeightChangeGoalKg: value })} />
          <NumberField label="日热量目标 kcal" value={averageCalories} range={{ min: 0, max: 10000, allowZero: true }} onChange={onUpdateAverageCalories} />
          <NumberField label="蛋白目标 g" value={averageProtein} range={{ min: 0, max: 500, allowZero: true }} onChange={(value) => onUpdateAllTargets({ protein: value ?? 0 })} />
          <NumberField label="步数底线" value={averageSteps} range={{ min: 0, max: 100000, allowZero: true }} onChange={(value) => onUpdateAllTargets({ stepTarget: value ?? 0 })} />
          <NumberField label="睡眠底线 h" value={preference.sleepFloorHours} kind="decimal" range={{ min: 0, max: 24, allowZero: true }} onChange={(value) => onUpdatePreference({ sleepFloorHours: value })} />
          <NumberField label="疲劳阈值" value={preference.fatigueThreshold} range={{ min: 0, max: 10, allowZero: true }} onChange={(value) => onUpdatePreference({ fatigueThreshold: value })} />
          <NumberField label="周末热量上限 kcal" value={preference.weekendCalorieUpperKcal} range={{ min: 0, max: 10000, allowZero: true }} onChange={onUpdateWeekendUpper} />
        </div>
      </FormSection>

      <FormSection title="训练日配置" description="选择每周默认训练日，Today 和训练入口会按这里判断当天任务。" actions={<span className="text-xs font-medium text-slate-500 dark:text-slate-400">{trainingDayCount} 个训练日</span>}>
        <div className="flex flex-wrap gap-2">
          {profileDays.map((day) => {
            const active = (profile.trainingDays ?? []).includes(day)
            return (
              <Button
                key={day}
                variant={active ? 'primary' : 'secondary'}
                aria-pressed={active}
                onClick={() => onToggleTrainingDay(day)}
                className="min-w-11 px-3 shadow-none"
              >
                {dayNames[day]}
              </Button>
            )
          })}
        </div>
      </FormSection>
    </>
  )
}

export function ProfileSaveFooter({
  dirty,
  saveDisabled,
  saveLabel,
  onSave,
}: {
  dirty: boolean
  saveDisabled: boolean
  saveLabel: string
  onSave: () => void
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {dirty
          ? '有未保存修改，保存后会同步个人资料、目标规则和每周训练天数。'
          : '当前资料已加载；保存后会同步个人资料、目标规则和每周训练天数。'}
      </p>
      <Button className="w-full sm:w-auto" onClick={onSave} disabled={saveDisabled}>
        {saveLabel}
      </Button>
    </div>
  )
}
