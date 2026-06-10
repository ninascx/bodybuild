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

  const gradientClasses = role === 'admin'
    ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500'
    : 'bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500'

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full p-0.5 shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg',
        gradientClasses,
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
