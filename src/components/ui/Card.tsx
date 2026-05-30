import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'nested'
}

export function Card({ children, className = '', variant = 'default' }: CardProps) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900',
        variant === 'default' && 'shadow-sm',
        className,
      )}
    >
      {children}
    </section>
  )
}
