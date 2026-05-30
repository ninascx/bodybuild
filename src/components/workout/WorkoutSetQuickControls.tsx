import { cn } from '../../lib/cn'
import { Button } from '../ui'

const RIR_OPTIONS = [0, 1, 2, 3] as const

export function WeightStepControls({
  onDecrease,
  onIncrease,
  suffix = '',
}: {
  onDecrease: () => void
  onIncrease: () => void
  suffix?: string
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Button
        variant="secondary"
        onClick={onDecrease}
        className="px-2 text-xs text-slate-600 shadow-none dark:text-slate-400"
      >
        -2.5{suffix}
      </Button>
      <Button
        variant="secondary"
        onClick={onIncrease}
        className="px-2 text-xs text-slate-600 shadow-none dark:text-slate-400"
      >
        +2.5{suffix}
      </Button>
    </div>
  )
}

export function TargetRepButtons({
  options,
  selected,
  onSelect,
  suffix = '',
  className = '',
}: {
  options: number[]
  selected?: number
  onSelect: (reps: number) => void
  suffix?: string
  className?: string
}) {
  if (options.length === 0) return null

  return (
    <div
      className={cn(
        'grid gap-1.5',
        options.length === 1 ? 'grid-cols-1' : options.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
        className,
      )}
    >
      {options.map((reps) => (
        <Button
          key={reps}
          variant="secondary"
          onClick={() => onSelect(reps)}
          className={cn(
            'px-2 text-xs font-semibold shadow-none',
            selected === reps
              ? 'border-emerald-500 bg-emerald-100 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-100'
              : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
          )}
        >
          {reps}{suffix}
        </Button>
      ))}
    </div>
  )
}

export function RirSelector({
  value,
  compact = false,
  labelPrefix = '',
  onChange,
}: {
  value?: number
  compact?: boolean
  labelPrefix?: string
  onChange: (value: number | undefined) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-end">
      {RIR_OPTIONS.map((option) => (
        <Button
          key={option}
          variant="secondary"
          onClick={() => onChange(value === option ? undefined : option)}
          className={cn(
            'min-w-11 px-2 text-xs font-medium shadow-none',
            compact ? 'sm:min-h-12 sm:min-w-11' : '',
            value === option
              ? 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600/40 dark:bg-amber-900/40 dark:text-amber-100'
              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200',
          )}
        >
          {labelPrefix}{option}
        </Button>
      ))}
    </div>
  )
}
