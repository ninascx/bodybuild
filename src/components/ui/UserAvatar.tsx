import { cn } from '../../lib/cn'

export interface UserAvatarProps {
  displayName: string
  role?: 'user' | 'admin' | 'member'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function UserAvatar({ displayName, role = 'user', size = 'md', className = '' }: UserAvatarProps) {
  const initial = displayName.charAt(0).toUpperCase()

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  }

  const toneClasses = role === 'admin'
    ? 'border-amber-500 bg-amber-500'
    : 'border-[var(--color-primary-600)] bg-[var(--color-primary-600)]'

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border p-0.5',
        toneClasses,
        className
      )}
      title={displayName}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-white font-semibold text-slate-800 dark:bg-slate-900 dark:text-slate-100',
          sizeClasses[size]
        )}
      >
        {initial}
      </div>
    </div>
  )
}
