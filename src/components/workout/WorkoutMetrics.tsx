import type { WorkoutSummary } from '../../lib/workout'

export function WorkoutMetrics({ summary }: { summary: WorkoutSummary }) {
  return (
    <div className="mt-5 hidden grid-cols-2 gap-2 sm:grid sm:grid-cols-4">
      <WorkoutMetric label="动作数" value={`${summary.exerciseCount}`} />
      <WorkoutMetric label="已填组数" value={`${summary.filledSets}/${summary.totalSets}`} />
      <WorkoutMetric label="记录进度" value={`${summary.completionPercent}%`} />
      <WorkoutMetric label="本次训练量" value={`${Math.round(summary.totalVolume)} kg`} />
    </div>
  )
}

function WorkoutMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">{value}</p>
    </div>
  )
}
