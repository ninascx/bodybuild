type SkeletonProps = {
  width?: string
  height?: string
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
}

/**
 * Skeleton loading component with shimmer animation
 */
export function Skeleton({
  width,
  height,
  className = '',
  variant = 'rectangular'
}: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }

  return (
    <div
      className={`skeleton-shimmer bg-slate-200 dark:bg-slate-700 ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

/**
 * Skeleton for card content
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 ${className}`}>
      <Skeleton width="60%" height="1.5rem" className="mb-3" />
      <Skeleton width="100%" height="1rem" className="mb-2" />
      <Skeleton width="80%" height="1rem" className="mb-4" />
      <div className="flex gap-2">
        <Skeleton width="5rem" height="2rem" />
        <Skeleton width="5rem" height="2rem" />
      </div>
    </div>
  )
}

/**
 * Skeleton for list items
 */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="circular" width="3rem" height="3rem" />
          <div className="flex-1">
            <Skeleton width="40%" height="1rem" className="mb-2" />
            <Skeleton width="60%" height="0.875rem" />
          </div>
        </div>
      ))}
    </div>
  )
}
