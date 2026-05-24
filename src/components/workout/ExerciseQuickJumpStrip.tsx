import type { ExerciseLog } from '../../types'

export function ExerciseQuickJumpStrip({
  exercises,
  visibleIndexes,
}: {
  exercises: ExerciseLog[]
  visibleIndexes: number[]
}) {
  if (exercises.length <= 1) return null
  const visible = new Set(visibleIndexes)
  return (
    <div className="sticky top-14 z-[5] -mx-3 overflow-x-auto rounded-md border border-slate-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="flex min-w-max gap-1.5">
        {exercises.map((exercise, index) => {
          const filled = exercise.sets.some(
            (set) => set.weight !== undefined || set.reps !== undefined || set.rir !== undefined,
          )
          const fullyFilled =
            exercise.sets.length > 0 &&
            exercise.sets.every(
              (set) => set.weight !== undefined || set.reps !== undefined || set.rir !== undefined,
            )
          const tone = fullyFilled
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700/40'
            : filled
              ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-600/40'
              : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
          const dim = !visible.has(index) ? 'opacity-50' : ''
          return (
            <button
              key={`jump-${exercise.exerciseId}-${index}`}
              type="button"
              onClick={() => {
                const target = document.getElementById(`exercise-${index}`)
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              title={exercise.name}
              aria-label={`跳转到 ${exercise.name}`}
              className={`min-h-8 shrink-0 rounded-full border px-2.5 text-xs font-medium transition ${tone} ${dim}`}
            >
              {index + 1}. {exercise.name.length > 10 ? exercise.name.slice(0, 10) + '…' : exercise.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
