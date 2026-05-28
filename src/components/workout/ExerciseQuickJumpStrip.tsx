import type { ExerciseLog } from '../../types'
import { isSetComplete } from '../../lib/workout'

function getStickyOffset(): number {
  const stickyNav = document.querySelector<HTMLElement>('nav.sticky')
  const jumpStrip = document.querySelector<HTMLElement>('[data-exercise-jump-strip]')
  const navHeight = stickyNav?.getBoundingClientRect().height ?? 0
  const stripHeight = jumpStrip?.getBoundingClientRect().height ?? 0
  return Math.ceil(navHeight + stripHeight + 12)
}

function scrollToExercise(index: number): void {
  const target = document.getElementById(`exercise-${index}`)
  if (!target) return
  const top = window.scrollY + target.getBoundingClientRect().top - getStickyOffset()
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

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
    <div
      data-exercise-jump-strip
      className="sticky top-14 z-[5] -mx-3 overflow-x-auto rounded-md border border-slate-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
    >
      <div className="flex min-w-max gap-1.5">
        {exercises.map((exercise, index) => {
          const isVisible = visible.has(index)
          const filled = exercise.sets.some(isSetComplete)
          const fullyFilled = exercise.sets.length > 0 && exercise.sets.every(isSetComplete)
          const tone = fullyFilled
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700/40'
            : filled
              ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-600/40'
              : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
          const dim = !isVisible ? 'cursor-not-allowed opacity-45' : ''
          return (
            <button
              key={`jump-${exercise.exerciseId}-${index}`}
              type="button"
              onClick={() => scrollToExercise(index)}
              disabled={!isVisible}
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
