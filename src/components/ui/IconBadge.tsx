import { cn } from '../../lib/cn'

export type IconBadgeIcon = 'fire' | 'dumbbell' | 'heart' | 'target' | 'lightning' | 'trophy' | 'chart' | 'clock' | 'check' | 'star'
export type IconBadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
export type IconBadgeSize = 'sm' | 'md' | 'lg'

export interface IconBadgeProps {
  icon: IconBadgeIcon
  variant?: IconBadgeVariant
  size?: IconBadgeSize
  className?: string
}

const iconPaths: Record<IconBadgeIcon, string> = {
  fire: 'M12 2c-1.5 3-4 5-4 8s1.5 5 4 5 4-2 4-5-2.5-5-4-8z M8 13c0 2.2 1.8 4 4 4s4-1.8 4-4',
  dumbbell: 'M6.5 6L6.5 18 M17.5 6L17.5 18 M3 8L3 16 M21 8L21 16 M6.5 9L17.5 9 M6.5 15L17.5 15',
  heart: 'M12 21c-1.5 0-9-5.5-9-12C3 6 5 4 7 4c1.5 0 3 1 5 3 2-2 3.5-3 5-3 2 0 4 2 4 5 0 6.5-7.5 12-9 12z',
  target: 'M12 2a10 10 0 100 20 10 10 0 000-20z M12 6a6 6 0 100 12 6 6 0 000-12z M12 10a2 2 0 100 4 2 2 0 000-4z',
  lightning: 'M13 2L3 14h8l-1 8 10-12h-8l1-8z',
  trophy: 'M7 8h10 M8 2h8v6a4 4 0 01-8 0V2z M12 14v8 M8 22h8 M6 8c-2 0-3-1-3-3s1-2 2-2h1 M18 8c2 0 3-1 3-3s-1-2-2-2h-1',
  chart: 'M3 3v16a2 2 0 002 2h16 M7 16V8 M12 16V6 M17 16v-4',
  clock: 'M12 2a10 10 0 100 20 10 10 0 000-20z M12 6v6l4 2',
  check: 'M20 6L9 17l-5-5',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
}

const variantClasses: Record<IconBadgeVariant, string> = {
  primary: 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/30 dark:from-teal-400 dark:to-cyan-500 dark:shadow-teal-400/20',
  success: 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 dark:from-emerald-400 dark:to-green-500 dark:shadow-emerald-400/20',
  warning: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 dark:from-amber-400 dark:to-orange-500 dark:shadow-amber-400/20',
  danger: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30 dark:from-rose-400 dark:to-red-500 dark:shadow-rose-400/20',
  neutral: 'bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-lg shadow-slate-500/20 dark:from-slate-400 dark:to-slate-500 dark:shadow-slate-400/15',
}

const sizeClasses: Record<IconBadgeSize, { container: string; icon: string }> = {
  sm: {
    container: 'h-8 w-8',
    icon: 'h-4 w-4',
  },
  md: {
    container: 'h-10 w-10',
    icon: 'h-5 w-5',
  },
  lg: {
    container: 'h-12 w-12',
    icon: 'h-6 w-6',
  },
}

export function IconBadge({ icon, variant = 'primary', size = 'md', className = '' }: IconBadgeProps) {
  const path = iconPaths[icon]
  const sizes = sizeClasses[size]

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl transition-all duration-300 hover:scale-105',
        variantClasses[variant],
        sizes.container,
        className,
      )}
    >
      <svg
        className={sizes.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={path} />
      </svg>
    </div>
  )
}
