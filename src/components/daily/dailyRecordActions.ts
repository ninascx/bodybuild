import type { DailyLog } from '../../types'

export type KeyRecordKey = 'weight' | 'calories' | 'protein'

export type KeyRecordItem = {
  key: KeyRecordKey
  label: string
  value?: number
}

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

export function keyRecordState({
  weight,
  calories,
  protein,
}: {
  weight?: number
  calories?: number
  protein?: number
}): {
  items: KeyRecordItem[]
  missing: KeyRecordItem[]
  firstMissing?: KeyRecordItem
  completed: number
  total: 3
  title: string
} {
  const items: KeyRecordItem[] = [
    { key: 'weight', label: '体重', value: weight },
    { key: 'calories', label: '热量', value: calories },
    { key: 'protein', label: '蛋白质', value: protein },
  ]
  const missing = items.filter((item) => item.value === undefined)
  return {
    items,
    missing,
    firstMissing: missing[0],
    completed: items.length - missing.length,
    total: 3,
    title: missing.length > 0
      ? `还差：${missing.map((item) => item.label).join('、')}`
      : '当日关键记录已完成',
  }
}
