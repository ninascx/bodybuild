import type { DailyLog, DayKey, ExerciseLog, ExercisePlan, ExerciseSetLog, WorkoutLog, WorkoutPlan, WorkoutTemplate } from '../types'
import { workoutPlans, getBuiltinTemplates } from '../data/plans'
import { getDayKey } from './dates'
import { createId } from './ids'

export function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export type WorkoutTemplateOption = {
  id: string
  name: string
  focus: string
  source: 'builtin' | 'custom'
  exercises: ExercisePlan[]
}

export type WorkoutSummary = {
  exerciseCount: number
  filledSets: number
  totalSets: number
  completionPercent: number
  totalVolume: number
}

export type TargetRepRange = {
  min: number
  max: number
}

export function upsertByDate<T extends { date: string }>(items: T[], date: string, patch: Partial<T>): T[] {
  const existing = items.find((item) => item.date === date)
  if (existing) {
    return items.map((item) => (item.date === date ? { ...item, ...patch } : item))
  }
  return [...items, { date, ...patch } as T]
}

export function parseTargetRepRange(target: string): TargetRepRange | null {
  if (typeof target !== 'string') return null

  const rangeMatch = target.match(/(\d+)\s*(?:-|–|—|~|～|至|到|to)\s*(\d+)\s*(?:次|reps?|$)/i)
  if (rangeMatch) {
    const min = Number(rangeMatch[1])
    const max = Number(rangeMatch[2])
    return min <= max ? { min, max } : { min: max, max: min }
  }

  const exactMatch = target.match(/(?:^|[^\d])(\d+)\s*(?:次|reps?)(?:[^\d]|$)/i)
  if (exactMatch) {
    const reps = Number(exactMatch[1])
    return { min: reps, max: reps }
  }

  return null
}

export function formatTargetRepRange(range: TargetRepRange): string {
  return range.min === range.max ? `${range.min}` : `${range.min}-${range.max}`
}

export function targetRepQuickOptions(range: TargetRepRange | null): number[] {
  if (!range) return []
  if (range.min === range.max) return [range.min]
  const middle = Math.round((range.min + range.max) / 2)
  return Array.from(new Set([range.min, middle, range.max])).sort((a, b) => a - b)
}

export function estimateSetCount(target: string): number {
  if (typeof target !== 'string') return 3
  const cnMatch = target.match(/(\d+)(?:-\d+)?\s*组/)
  if (cnMatch) return Number(cnMatch[1])
  const enMatch = target.match(/(\d+)\s*(?:sets?|×|x|\*)/i)
  if (enMatch) return Number(enMatch[1])
  return 3
}

export function createWorkoutFromTemplate(date: string, template: WorkoutTemplateOption): WorkoutLog {
  return {
    date,
    workoutName: template.name,
    exercises: template.exercises.map((exercise) => {
      const setCount = estimateSetCount(exercise.prescription)
      return {
        exerciseId: exercise.id,
        name: exercise.name,
        target: exercise.note ? `${exercise.prescription}，${exercise.note}` : exercise.prescription,
        sets: Array.from({ length: setCount }, () => ({})),
      }
    }),
  }
}

export function createWorkoutFromPlan(date: string, planOverride?: WorkoutPlan): WorkoutLog {
  const plan = planOverride ?? workoutPlans[getDayKey(date)]
  return createWorkoutFromTemplate(date, {
    id: `builtin-${plan.day}`,
    name: plan.name,
    focus: plan.focus,
    source: 'builtin',
    exercises: plan.exercises,
  })
}

export function builtinTemplateOptions(plans?: Record<DayKey, WorkoutPlan>): WorkoutTemplateOption[] {
  const templates = plans
    ? Object.values(plans).map((plan) => ({
        id: `builtin-${plan.day}`,
        name: plan.name,
        focus: plan.focus,
        category: '内置',
        exercises: plan.exercises,
        createdAt: '',
        updatedAt: '',
        isBuiltin: true,
      }))
    : getBuiltinTemplates()
  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    focus: template.focus,
    source: 'builtin',
    exercises: template.exercises,
  }))
}

export function customTemplateToOption(template: WorkoutTemplate): WorkoutTemplateOption {
  return {
    id: template.id,
    name: template.name,
    focus: template.focus,
    source: 'custom',
    exercises: template.exercises,
  }
}

export function hasWorkoutContent(workout: WorkoutLog | undefined): boolean {
  if (!workout) return false
  if (workout.notes?.trim()) return true
  return workout.exercises.some(
    (exercise) =>
      exercise.name.trim() ||
      exercise.target.trim() ||
      exercise.notes?.trim() ||
      exercise.sets.some((set) => set.weight !== undefined || set.reps !== undefined || set.rir !== undefined),
  )
}

export function createBlankExercise(): ExerciseLog {
  return {
    exerciseId: createId('custom-exercise'),
    name: '新动作',
    target: '3 组 × 8-12 次',
    sets: Array.from({ length: 3 }, () => ({})),
  }
}

export function newTemplateFromWorkout(workout: WorkoutLog): WorkoutTemplate {
  const now = new Date().toISOString()
  return {
    id: createId('template'),
    name: `${workout.workoutName || '自定义训练'} 模板`,
    focus: '自定义',
    category: '自定义',
    exercises: workout.exercises.length
      ? workout.exercises.map((exercise, index) => ({
          id: exercise.exerciseId || createId('template-exercise'),
          name: exercise.name || `动作 ${index + 1}`,
          prescription: exercise.target || '3 组 × 8-12 次',
          note: exercise.notes,
        }))
      : [{ id: createId('template-exercise'), name: '新动作', prescription: '3 组 × 8-12 次' }],
    createdAt: now,
    updatedAt: now,
  }
}

export function summarizeWorkout(workout: WorkoutLog | undefined): WorkoutSummary {
  if (!workout) {
    return {
      exerciseCount: 0,
      filledSets: 0,
      totalSets: 0,
      completionPercent: 0,
      totalVolume: 0,
    }
  }

  const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
  const filledSets = workout.exercises.reduce(
    (sum, exercise) =>
      sum + exercise.sets.filter(isSetComplete).length,
    0,
  )
  const totalVolume = workout.exercises.reduce((sum, exercise) => {
    return sum + exercise.sets.reduce((setSum, set) => {
      if (set.weight !== undefined && set.reps !== undefined) {
        return setSum + set.weight * set.reps
      }
      return setSum
    }, 0)
  }, 0)

  return {
    exerciseCount: workout.exercises.length,
    filledSets,
    totalSets,
    completionPercent: totalSets ? Math.round((filledSets / totalSets) * 100) : 0,
    totalVolume,
  }
}

export function isSetComplete(set: ExerciseSetLog): boolean {
  return set.weight !== undefined && set.reps !== undefined
}

export function isSetEmpty(set: ExerciseSetLog): boolean {
  return set.weight === undefined && set.reps === undefined && set.rir === undefined
}

export function isExerciseFilled(exercise: ExerciseLog): boolean {
  return exercise.sets.length > 0 && exercise.sets.every(isSetComplete)
}

export function hasChartData<T extends object>(data: T[], keys: Array<keyof T>, minPoints = 2): boolean {
  return data.filter((point) => keys.some((key) => typeof point[key] === 'number')).length >= minPoints
}

export function buildDailyCopyText({
  date,
  dayName,
  log,
  workout,
}: {
  date: string
  dayName: string
  log: DailyLog | undefined
  workout: WorkoutLog | undefined
}): string {
  const recordPairs: Array<[string, number | string | undefined, string]> = [
    ['体重', log?.morningWeightKg, ' kg'],
    ['腰围', log?.waistCm, ' cm'],
    ['胸围', log?.chestCm, ' cm'],
    ['上臂围', log?.upperArmCm, ' cm'],
    ['大腿围', log?.thighCm, ' cm'],
    ['热量', log?.calories, ' kcal'],
    ['蛋白质', log?.protein, ' g'],
    ['碳水', log?.carbs, ' g'],
    ['脂肪', log?.fat, ' g'],
    ['步数', log?.steps, ' 步'],
    ['睡眠', log?.sleepHours, ' h'],
    ['训练完成度', log?.workoutCompletion, '%'],
    ['疲劳评分', log?.fatigueScore, '/10'],
  ]
  const recordLines = recordPairs
    .filter(([, value]) => value !== undefined)
    .map(([label, value, unit]) => `${label}：${value}${unit}`)
  if (log?.trained !== undefined) recordLines.push(`是否训练：${log.trained ? '是' : '否'}`)
  if (log?.notes?.trim()) recordLines.push(`备注：${log.notes.trim()}`)

  const workoutLines = workout?.exercises.length
    ? workout.exercises
        .map((exercise, index) => {
          const filledSets = exercise.sets
            .map((set, setIndex) => {
              const hasAny = set.weight !== undefined || set.reps !== undefined || set.rir !== undefined
              if (!hasAny) return null
              const parts: string[] = []
              if (set.weight !== undefined) parts.push(`${set.weight}kg`)
              if (set.reps !== undefined) parts.push(`${set.reps}次`)
              if (set.rir !== undefined) parts.push(`RIR${set.rir}`)
              return `第${setIndex + 1}组 ${parts.join(' × ')}`
            })
            .filter((value): value is string => value !== null)
          if (filledSets.length === 0) return null
          return `${index + 1}. ${exercise.name}：${filledSets.join('；')}`
        })
        .filter((value): value is string => value !== null)
    : []

  const sections: string[] = []
  sections.push(`【${date} ${dayName} 健身记录】`)
  if (recordLines.length > 0) {
    sections.push('', '实际记录', ...recordLines)
  }
  if (workout?.workoutName?.trim() || workoutLines.length > 0) {
    sections.push('', '训练记录')
    if (workout?.workoutName?.trim()) sections.push(`训练名称：${workout.workoutName.trim()}`)
    if (workoutLines.length > 0) sections.push(...workoutLines)
  }

  return sections.join('\n')
}
