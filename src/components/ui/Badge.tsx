import type { ReactNode } from 'react'
import type { RecommendationTone } from '../../types'
import { cn } from '../../lib/cn'

export interface BadgeProps {
  children: ReactNode
  tone?: RecommendationTone
  className?: string
}

const toneClasses: Record<RecommendationTone, string> = {
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-600/40 dark:bg-amber-900/30 dark:text-amber-100',
  danger: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-600/40 dark:bg-rose-900/30 dark:text-rose-100',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
}

export function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', toneClasses[tone], className)}>
      {children}
    </span>
  )
}
