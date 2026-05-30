import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'h-11 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-400 dark:focus:ring-orange-500/30',
        className,
      )}
    />
  )
}
