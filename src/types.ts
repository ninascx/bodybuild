export type DayKey = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface UserProfile {
  sex: 'male'
  birthDate: string
  heightCm: number
  initialWeightKg: number
  estimatedBodyFatPercent: number
  targetWeeks: string
  goal: string
  sleepHours: number
  averageSteps: number
  trainingDays: DayKey[]
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

export interface WorkoutPlan {
  day: DayKey
  name: string
  focus: string
  exercises: ExercisePlan[]
}

export interface WorkoutTemplate {
  id: string
  name: string
  focus: string
  category: string
  exercises: ExercisePlan[]
  createdAt: string
  updatedAt: string
  isBuiltin?: boolean
}

export interface DailyLog {
  date: string
  morningWeightKg?: number
  waistCm?: number
  chestCm?: number
  upperArmCm?: number
  thighCm?: number
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  steps?: number
  sleepHours?: number
  trained?: boolean
  workoutCompletion?: number
  shoulderPainScore?: number
  fatigueScore?: number
  notes?: string
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

export interface WorkoutLog {
  date: string
  workoutName: string
  exercises: ExerciseLog[]
  notes?: string
}

export interface TaskChecks {
  diet: boolean
  workout: boolean
  steps: boolean
  sleep: boolean
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
  version: 1
  exportedAt: string
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  taskChecks: Record<string, TaskChecks>
  workoutTemplates?: WorkoutTemplate[]
}

export interface ServerData {
  version: 1
  updatedAt: string
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  taskChecks: Record<string, TaskChecks>
  workoutTemplates: WorkoutTemplate[]
}
