import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  children,
  variant = 'primary',
  loading = false,
  className = '',
  ...props
}, ref) {
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'border border-[var(--color-primary-700)] bg-[var(--color-primary-700)] text-white hover:border-[var(--color-primary-600)] hover:bg-[var(--color-primary-600)] active:border-teal-900 active:bg-teal-900 dark:border-cyan-600 dark:bg-cyan-600 dark:text-white dark:hover:border-cyan-500 dark:hover:bg-cyan-500',
    secondary: 'border border-[var(--surface-border-strong)] bg-white text-slate-800 hover:border-slate-400 hover:bg-[var(--surface-muted)] active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800',
    ghost: 'border border-transparent text-slate-600 hover:bg-[var(--surface-muted)] hover:text-slate-950 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50',
    danger: 'border border-rose-600 bg-rose-600 text-white hover:border-rose-700 hover:bg-rose-700 active:border-rose-800 active:bg-rose-800 dark:border-rose-500 dark:bg-rose-500 dark:text-white dark:hover:border-rose-400 dark:hover:bg-rose-400',
  }

  return (
    <button
      {...props}
      ref={ref}
      type={props.type ?? 'button'}
      disabled={props.disabled || loading}
      className={cn(
        'inline-flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-panel)] disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-cyan-500 dark:focus-visible:ring-offset-slate-950',
        variantClasses[variant],
        className,
      )}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  )
})
