import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface DisclosurePanelProps {
  title: ReactNode
  children: ReactNode
  open?: boolean
  className?: string
  summaryClassName?: string
  contentClassName?: string
  onOpenChange?: (open: boolean) => void
}

export function DisclosurePanel({
  title,
  children,
  open,
  className = '',
  summaryClassName = '',
  contentClassName = '',
  onOpenChange,
}: DisclosurePanelProps) {
  return (
    <details
      open={open}
      onToggle={(event) => onOpenChange?.(event.currentTarget.open)}
      className={cn('group rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800', className)}
    >
      <summary
        className={cn(
          'flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:text-slate-200 dark:hover:bg-slate-900 dark:focus-visible:ring-cyan-500',
          summaryClassName,
        )}
      >
        <span className="min-w-0">{title}</span>
        <svg className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className={cn('border-t border-slate-200 px-3 py-3 dark:border-slate-700', contentClassName)}>
        {children}
      </div>
    </details>
  )
}
