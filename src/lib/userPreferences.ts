import type { UserPreference } from '../types'

type RulePreferenceDefaults = Required<
  Pick<
    UserPreference,
    | 'restDurationSec'
    | 'autoStartRest'
    | 'goalType'
    | 'weeklyWeightChangeGoalKg'
    | 'sleepFloorHours'
    | 'fatigueThreshold'
    | 'weekendCalorieUpperKcal'
  >
>

export type MergedUserPreference = UserPreference & RulePreferenceDefaults

export const defaultUserPreference: RulePreferenceDefaults = {
  restDurationSec: 90,
  autoStartRest: false,
  goalType: 'fat_loss',
  weeklyWeightChangeGoalKg: -0.4,
  sleepFloorHours: 6.5,
  fatigueThreshold: 7,
  weekendCalorieUpperKcal: 3000,
}

export function mergeUserPreference(preference: UserPreference | undefined): MergedUserPreference {
  return {
    ...defaultUserPreference,
    ...preference,
  }
}
