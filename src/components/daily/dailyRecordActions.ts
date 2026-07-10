import type { DailyLog } from '../../types'

const copyableDailyFields = [
  'calories',
  'protein',
  'steps',
  'sleepHours',
  'fatigueScore',
] as const

export function buildCopyYesterdayPatch(
  current: Partial<DailyLog>,
  yesterday: Partial<DailyLog> | undefined,
): {
  patch: Partial<DailyLog>
  filledCount: number
  preservedCount: number
} {
  if (!yesterday) return { patch: {}, filledCount: 0, preservedCount: 0 }

  const patch: Partial<DailyLog> = {}
  let filledCount = 0
  let preservedCount = 0

  copyableDailyFields.forEach((field) => {
    const previousValue = yesterday[field]
    if (previousValue === undefined) return
    if (current[field] !== undefined) {
      preservedCount += 1
      return
    }
    Object.assign(patch, { [field]: previousValue })
    filledCount += 1
  })

  return { patch, filledCount, preservedCount }
}

export function keyRecordCompletion({
  weight,
  calories,
  protein,
}: {
  weight?: number
  calories?: number
  protein?: number
}): { completed: number; total: 3 } {
  return {
    completed: [weight, calories, protein].filter((value) => value !== undefined).length,
    total: 3,
  }
}
