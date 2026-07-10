import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface GradientCardProps {
  children: ReactNode
  className?: string
  variant?: 'primary' | 'success' | 'warning' | 'neutral'
}

export function GradientCard({ children, className = '', variant = 'primary' }: GradientCardProps) {
  const surfaces = {
    primary: 'bg-[var(--surface-selected)] dark:bg-cyan-950/20',
    success: 'bg-emerald-50 dark:bg-emerald-950/20',
    warning: 'bg-amber-50 dark:bg-amber-950/20',
    neutral: 'bg-[var(--surface-muted)] dark:bg-slate-800',
  }

  return (
    <section
      className={cn(
        'min-w-0 rounded-xl border border-[var(--surface-border)] p-4 dark:border-slate-700',
        surfaces[variant],
        className,
      )}
    >
      {children}
    </section>
  )
}
