import { useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface DisclosurePanelProps {
  title: ReactNode
  children: ReactNode
  open?: boolean
  defaultOpen?: boolean
  className?: string
  summaryClassName?: string
  contentClassName?: string
  onOpenChange?: (open: boolean) => void
}

export function DisclosurePanel({
  title,
  children,
  open,
  defaultOpen = false,
  className = '',
  summaryClassName = '',
  contentClassName = '',
  onOpenChange,
}: DisclosurePanelProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isControlled = open !== undefined
  const actualOpen = isControlled ? open : internalOpen

  return (
    <details
      open={actualOpen}
      onToggle={(event) => {
        const next = event.currentTarget.open
        if (!isControlled) setInternalOpen(next)
        onOpenChange?.(next)
      }}
      className={cn('group rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] dark:border-slate-800 dark:bg-slate-900', className)}
    >
      <summary
        className={cn(
          'flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-cyan-500',
          summaryClassName,
        )}
      >
        <span className="min-w-0">{title}</span>
        <svg className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-[var(--motion-base)] ease-[var(--ease-out-smooth)] group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className={cn('motion-disclosure-content border-t border-[var(--surface-border)] px-3 py-3 dark:border-slate-700', contentClassName)}>
        {children}
      </div>
    </details>
  )
}
