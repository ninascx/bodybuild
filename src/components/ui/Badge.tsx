import type { ReactNode } from 'react'
import type { RecommendationTone } from '../../types'
import { cn } from '../../lib/cn'

export interface BadgeProps {
  children: ReactNode
  tone?: RecommendationTone
  className?: string
}

const toneClasses: Record<RecommendationTone, string> = {
  positive: 'border-emerald-200 bg-white text-emerald-800 dark:border-emerald-700/50 dark:bg-slate-900 dark:text-emerald-200',
  warning: 'border-amber-200 bg-white text-amber-800 dark:border-amber-600/50 dark:bg-slate-900 dark:text-amber-200',
  danger: 'border-rose-200 bg-white text-rose-800 dark:border-rose-600/50 dark:bg-slate-900 dark:text-rose-200',
  neutral: 'border-[var(--surface-border)] bg-[var(--surface-muted)] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
}

export function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold leading-none', toneClasses[tone], className)}>
      {children}
    </span>
  )
}
