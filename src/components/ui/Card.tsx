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
        'min-w-0 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-panel)] p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900',
        variant === 'nested' && 'bg-[var(--surface-muted)] shadow-none dark:bg-slate-800/70',
        variant === 'interactive' && 'card-hover cursor-pointer shadow-md hover:shadow-lg',
        className,
      )}
    >
      {children}
    </section>
  )
}
