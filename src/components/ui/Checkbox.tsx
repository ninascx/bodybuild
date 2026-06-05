import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: ReactNode
}

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  const input = (
    <input
      {...props}
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-[var(--surface-border-strong)] text-[var(--color-primary-700)] focus:ring-2 focus:ring-[var(--color-primary-500)] dark:border-slate-600 dark:bg-slate-800 dark:text-cyan-500 dark:focus:ring-cyan-500',
        className,
      )}
    />
  )

  if (!label) return input

  return (
    <label className="flex min-h-11 items-center gap-2 rounded-md border border-[var(--surface-border)] bg-[var(--surface-panel)] px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      {input}
      {label}
    </label>
  )
}
