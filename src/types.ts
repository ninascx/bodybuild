export type DayKey = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface UserProfile {
  sex?: 'male' | 'female' | 'other'
  birthDate?: string
  heightCm?: number
  initialWeightKg?: number
  targetWeeks?: string
  goal?: string
  sleepHours?: number
  averageSteps?: number
  trainingDays?: DayKey[]
}

export interface DailyTarget {
  day: DayKey
  dayName: string
  workoutName: string
  calories?: number
  calorieRange?: [number, number]
  protein: number
  carbs?: number
  fat?: number
  stepTarget: number
  notes: string[]
  isTrainingDay: boolean
}

export interface ExercisePlan {
  id: string
  name: string
  prescription: string
  note?: string
}

export interface CardioPlan {
  id: string
  mode: string
  durationMin?: number
  note?: string
}

export interface WorkoutPlan {
  day: DayKey
  name: string
  focus: string
  exercises: ExercisePlan[]
  cardio?: CardioPlan[]
}

export interface UserPlanData {
  dailyTargets: Record<DayKey, DailyTarget>
  workoutPlans: Record<DayKey, WorkoutPlan>
}

export type GoalType = 'fat_loss' | 'muscle_gain' | 'maintenance'

export interface UserPreference {
  theme?: string
  restDurationSec?: number
  autoStartRest?: boolean
  activeTab?: string
  goalType?: GoalType
  weeklyWeightChangeGoalKg?: number
  sleepFloorHours?: number
  fatigueThreshold?: number
  weekendCalorieUpperKcal?: number
}

export interface WorkoutTemplate {
  id: string
  name: string
  focus: string
  category: string
  exercises: ExercisePlan[]
  cardio?: CardioPlan[]
  createdAt: string
  updatedAt: string
  isBuiltin?: boolean
}

export interface DailyLog {
  date: string
  /** @deprecated Computed compatibility view; persisted body data lives in BodyRecord. */
  morningWeightKg?: number
  /** @deprecated Computed compatibility view; persisted body data lives in BodyRecord. */
  waistCm?: number
  /** @deprecated Computed compatibility view; persisted body data lives in BodyRecord. */
  chestCm?: number
  /** @deprecated Computed compatibility view; persisted body data lives in BodyRecord. */
  upperArmCm?: number
  /** @deprecated Computed compatibility view; persisted body data lives in BodyRecord. */
  thighCm?: number
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  steps?: number
  sleepHours?: number
  trained?: boolean
  workoutCompletion?: number
  fatigueScore?: number
  notes?: string
}

export type BodyMetricType =
  | 'weight'
  | 'bodyfat'
  | 'neck'
  | 'chest'
  | 'weist'
  | 'shoulder'
  | 'bot'
  | 'arm_left'
  | 'arm_right'
  | 'forearm_left'
  | 'forearm_right'
  | 'leg_left'
  | 'leg_right'
  | 'cav_left'
  | 'cav_right'

export type BodyRecordOrigin = 'local' | 'xunji' | 'legacy_daily' | 'legacy_profile'

export interface BodyRecord {
  datestr: string
  type: BodyMetricType
  value: number
  unit: 'kg' | '%' | 'cm'
  label: string
  label_en: string
  origin?: BodyRecordOrigin
  synced_at?: string
}

export interface ExerciseSetLog {
  weight?: number
  reps?: number
  rir?: number
}

export interface ExerciseLog {
  exerciseId: string
  name: string
  target: string
  sets: ExerciseSetLog[]
  notes?: string
}

export interface CardioLog {
  id: string
  mode: string
  durationMin?: number
  intensity?: string
  notes?: string
}

export interface WorkoutLog {
  date: string
  workoutName: string
  exercises: ExerciseLog[]
  cardio?: CardioLog[]
  notes?: string
}

export interface WeeklySummary {
  weekStart: string
  weekEnd: string
  averageWeight?: number
  previousAverageWeight?: number
  weightDelta?: number
  waistDelta?: number
  trainingCompletionRate: number
  totalCalories: number
  calorieStatus: 'low' | 'on-track' | 'high' | 'unknown'
  weekendAverageCalories?: number
  weekendOverLimit: boolean
  suggestions: string[]
}

export type RecommendationTone = 'positive' | 'warning' | 'danger' | 'neutral'

export interface AdjustmentRecommendation {
  title: string
  message: string
  tone: RecommendationTone
}

export interface BackupPayload {
  version: 2
  exportedAt: string
  dailyLogs: DailyLog[]
  bodyRecords: BodyRecord[]
  workoutLogs: WorkoutLog[]
  workoutTemplates?: WorkoutTemplate[]
}

export interface ServerData {
  version: 2
  updatedAt: string
  dailyLogs: DailyLog[]
  bodyRecords: BodyRecord[]
  workoutLogs: WorkoutLog[]
  workoutTemplates: WorkoutTemplate[]
}
