import type { DailyTarget, DayKey, UserPreference, UserProfile } from '../../types'
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
    <FormSection title="基础资料">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
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
        <NumberField label="估算体脂 %" value={profile.estimatedBodyFatPercent} kind="decimal" range={{ min: 1, max: 80 }} onChange={(value) => onUpdateProfile({ estimatedBodyFatPercent: value })} />
      </div>
    </FormSection>
  )
}

export function BodyMeasurementsSection({
  profile,
  onUpdateProfile,
}: {
  profile: UserProfile
  onUpdateProfile: (patch: Partial<UserProfile>) => void
}) {
  return (
    <FormSection title="当前身体属性">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <NumberField label="当前体重 kg" value={profile.currentWeightKg} kind="decimal" range={{ min: 20, max: 300 }} onChange={(value) => onUpdateProfile({ currentWeightKg: value })} />
        <NumberField label="腰围 cm" value={profile.waistCm} kind="decimal" range={{ min: 30, max: 250 }} onChange={(value) => onUpdateProfile({ waistCm: value })} />
        <NumberField label="胸围 cm" value={profile.chestCm} kind="decimal" range={{ min: 30, max: 250 }} onChange={(value) => onUpdateProfile({ chestCm: value })} />
        <NumberField label="上臂围 cm" value={profile.upperArmCm} kind="decimal" range={{ min: 10, max: 100 }} onChange={(value) => onUpdateProfile({ upperArmCm: value })} />
        <NumberField label="大腿围 cm" value={profile.thighCm} kind="decimal" range={{ min: 20, max: 150 }} onChange={(value) => onUpdateProfile({ thighCm: value })} />
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
    <FormSection title="目标与习惯">
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
    <FormSection title="极简个性化配置" actions={<span className="text-xs font-medium text-slate-500 dark:text-slate-400">{trainingDayCount} 个训练日</span>}>
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
      <div className="mt-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">训练天数</p>
        <div className="mt-2 flex flex-wrap gap-2">
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
      </div>
    </FormSection>
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
