import type { WorkoutSummary } from '../../lib/workout'

export function WorkoutMetrics({ summary }: { summary: WorkoutSummary }) {
  const activityValue = summary.cardioCount > 0
    ? `${summary.exerciseCount} / ${summary.cardioCount}`
    : `${summary.exerciseCount}`

  return (
    <div className="mt-5 hidden grid-cols-2 gap-2 sm:grid sm:grid-cols-4">
      <WorkoutMetric label={summary.cardioCount > 0 ? '动作 / 有氧' : '动作数'} value={activityValue} />
      <WorkoutMetric label="已填组数" value={`${summary.filledSets}/${summary.totalSets}`} />
      <WorkoutMetric label="记录进度" value={`${summary.completionPercent}%`} />
      <WorkoutMetric
        label={summary.cardioDurationMin > 0 ? '训练量 / 有氧' : '本次训练量'}
        value={summary.cardioDurationMin > 0 ? `${Math.round(summary.totalVolume)} kg · ${summary.cardioDurationMin} min` : `${Math.round(summary.totalVolume)} kg`}
      />
    </div>
  )
}

function WorkoutMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">{value}</p>
    </div>
  )
}
