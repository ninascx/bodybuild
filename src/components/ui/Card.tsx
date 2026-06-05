import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'nested' | 'interactive'
}

export function Card({ children, className = '', variant = 'default' }: CardProps) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-4 dark:border-slate-800 dark:bg-slate-900',
        variant === 'nested' && 'bg-[var(--surface-muted)] dark:bg-slate-800/70',
        variant === 'interactive' && 'card-hover cursor-pointer',
        className,
      )}
    >
      {children}
    </section>
  )
}
