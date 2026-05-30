import type { PreviousExerciseRecord } from '../../lib/metrics'
import type { ExerciseSetLog } from '../../types'

export function formatPreviousSummary(previousRecord: PreviousExerciseRecord): string {
  const parts = [`上次 ${previousRecord.date.slice(5)}`, `${previousRecord.bestWeight} kg`]
  if (previousRecord.reps !== undefined) parts.push(`${previousRecord.reps} 次`)
  if (previousRecord.rir !== undefined) parts.push(`RIR ${previousRecord.rir}`)
  return parts.join(' · ')
}

export function formatSetSummary(set: Partial<ExerciseSetLog>): string | null {
  const parts: string[] = []
  if (set.weight !== undefined) parts.push(`${set.weight}kg`)
  if (set.reps !== undefined) parts.push(`${set.reps}次`)
  if (set.rir !== undefined) parts.push(`RIR ${set.rir}`)
  return parts.length ? parts.join(' × ') : null
}
