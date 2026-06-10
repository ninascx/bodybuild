import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface GradientCardProps {
  children: ReactNode
  className?: string
  variant?: 'primary' | 'success' | 'warning' | 'neutral'
}

export function GradientCard({ children, className = '', variant = 'primary' }: GradientCardProps) {
  const gradients = {
    primary: 'bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-blue-500/10 dark:from-teal-500/20 dark:via-cyan-500/10 dark:to-blue-500/20',
    success: 'bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10 dark:from-emerald-500/20 dark:via-green-500/10 dark:to-teal-500/20',
    warning: 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 dark:from-amber-500/20 dark:via-orange-500/10 dark:to-red-500/20',
    neutral: 'bg-gradient-to-br from-slate-500/5 via-gray-500/3 to-slate-500/5 dark:from-slate-500/10 dark:via-gray-500/5 dark:to-slate-500/10',
  }

  return (
    <section
      className={cn(
        'min-w-0 rounded-xl border border-[var(--surface-border)] p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl dark:border-slate-700',
        gradients[variant],
        className,
      )}
    >
      {children}
    </section>
  )
}
