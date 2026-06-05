import { cn } from '../../lib/cn'
import { Button } from '../ui'

const RIR_OPTIONS = [0, 1, 2, 3] as const
export const WEIGHT_STEP_KG = 2.5

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
        -{WEIGHT_STEP_KG}{suffix}
      </Button>
      <Button
        variant="secondary"
        onClick={onIncrease}
        className="px-2 text-xs text-slate-600 shadow-none dark:text-slate-400"
      >
        +{WEIGHT_STEP_KG}{suffix}
      </Button>
    </div>
  )
}

function buildWeightOptions(value: number | undefined): number[] {
  const anchor = value === undefined ? 40 : Math.round(value / 5) * 5
  const start = Math.max(0, anchor - 10)
  return Array.from(new Set([start, start + 5, start + 10, start + 15, start + 20].filter((option) => option >= 0 && option <= 500)))
}

export function WeightQuickSelect({
  value,
  onSelect,
  className = '',
}: {
  value?: number
  onSelect: (value: number) => void
  className?: string
}) {
  const options = buildWeightOptions(value)

  return (
    <div className={cn('grid grid-cols-5 gap-1.5', className)}>
      {options.map((weight) => {
        const selected = value !== undefined && Math.abs(value - weight) < 0.001
        return (
          <Button
            key={weight}
            variant="secondary"
            className={cn(
              'min-h-9 px-1 text-xs font-semibold shadow-none',
              selected
                ? 'border-[var(--color-primary-600)] bg-[var(--surface-selected)] text-[var(--color-primary-700)] dark:border-cyan-500 dark:bg-cyan-950/50 dark:text-cyan-50'
                : 'border-[var(--surface-border)] bg-[var(--surface-panel)] text-slate-600 hover:border-[var(--color-primary-100)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
            )}
            onClick={() => onSelect(weight)}
          >
            {weight}
          </Button>
        )
      })}
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
              : 'border-[var(--surface-border)] bg-[var(--surface-panel)] text-slate-600 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
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
              : 'border-[var(--surface-border)] bg-[var(--surface-panel)] text-slate-500 hover:border-[var(--surface-border-strong)] hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200',
          )}
        >
          {labelPrefix}{option}
        </Button>
      ))}
    </div>
  )
}
