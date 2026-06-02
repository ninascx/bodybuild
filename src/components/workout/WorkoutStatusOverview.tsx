import type { WorkoutLog } from '../../types'
import type { WorkoutSummary } from '../../lib/workout'
import type { WorkoutStatusView } from './workoutStatusModel'
import { Button, InsightCard, MetricGrid, StatusHero } from '../ui'

export function WorkoutStatusOverview({
  restDay,
  selectedWorkout,
  workoutStatus,
  workoutSummary,
  hasIncompleteExercise,
  statusPrimaryLabel,
  onPrimaryAction,
  onJumpToIncomplete,
  onAddBlankWorkout,
}: {
  restDay: boolean
  selectedWorkout: WorkoutLog | undefined
  workoutStatus: WorkoutStatusView
  workoutSummary: WorkoutSummary
  hasIncompleteExercise: boolean
  statusPrimaryLabel: string | null
  onPrimaryAction: () => void
  onJumpToIncomplete: () => void
  onAddBlankWorkout: () => void
}) {
  return (
    <StatusHero
      eyebrow="训练状态"
      title={workoutStatus.title}
      message={restDay ? '已在「记录」页标记为不训练。专注吃好、睡好、走走。' : workoutStatus.message}
      tone={workoutStatus.tone}
      actions={
        restDay ? null : (
          <div className="flex flex-wrap gap-2">
            {statusPrimaryLabel ? (
              <Button className="min-h-12 px-6 text-base font-semibold" onClick={onPrimaryAction}>
                {statusPrimaryLabel}
              </Button>
            ) : null}
            {selectedWorkout && hasIncompleteExercise ? (
              <Button variant="secondary" onClick={onJumpToIncomplete}>
                跳到未完成
              </Button>
            ) : !selectedWorkout ? (
              <Button variant="secondary" onClick={onAddBlankWorkout}>
                空白训练
              </Button>
            ) : null}
          </div>
        )
      }
      meta={
        !restDay && selectedWorkout ? (
          <MetricGrid className="lg:grid-cols-4">
            <InsightCard
              title={workoutSummary.cardioCount > 0 ? '动作 / 有氧' : '动作'}
              value={workoutSummary.cardioCount > 0 ? `${workoutSummary.exerciseCount} / ${workoutSummary.cardioCount}` : workoutSummary.exerciseCount}
              message={workoutSummary.cardioDurationMin > 0 ? `${workoutSummary.cardioDurationMin} min` : '个'}
              tone="neutral"
            />
            <InsightCard title="完成组" value={`${workoutSummary.filledSets}/${workoutSummary.totalSets}`} tone={workoutSummary.filledSets > 0 ? 'positive' : 'neutral'} />
            <InsightCard title="完成率" value={`${workoutSummary.completionPercent}%`} tone={workoutSummary.completionPercent === 100 ? 'positive' : 'warning'} />
            <InsightCard title="训练量" value={`${Math.round(workoutSummary.totalVolume)} kg`} tone="neutral" />
          </MetricGrid>
        ) : null
      }
    />
  )
}
