import { cn } from '../lib/cn'

type TrendIndicatorProps = {
  value: number
  previousValue?: number
  format?: (value: number) => string
  showSparkline?: boolean
  sparklineData?: number[]
  inverse?: boolean // 如果为 true，下降是好的（如体重）
}

export function TrendIndicator({
  value,
  previousValue,
  format = (v) => String(v),
  showSparkline = false,
  sparklineData = [],
  inverse = false,
}: TrendIndicatorProps) {
  if (previousValue === undefined || previousValue === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{format(value)}</span>
        {showSparkline && sparklineData.length > 0 && (
          <Sparkline data={sparklineData} className="h-8 w-20" />
        )}
      </div>
    )
  }

  const change = value - previousValue
  const percentChange = (change / previousValue) * 100
  const isPositive = change > 0
  const isGood = inverse ? !isPositive : isPositive
  const showChange = Math.abs(percentChange) >= 0.1

  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{format(value)}</span>

      {showChange && (
        <div
          className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
            isGood
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
          )}
        >
          <span>{isPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(percentChange).toFixed(1)}%</span>
        </div>
      )}

      {showSparkline && sparklineData.length > 0 && (
        <Sparkline
          data={sparklineData}
          className="h-8 w-20"
          color={isGood ? 'emerald' : 'rose'}
        />
      )}
    </div>
  )
}

type SparklineProps = {
  data: number[]
  className?: string
  color?: 'emerald' | 'rose' | 'slate'
}

function Sparkline({ data, className, color = 'slate' }: SparklineProps) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 100
    return `${x},${y}`
  }).join(' ')

  const strokeColor =
    color === 'emerald' ? 'stroke-emerald-500 dark:stroke-emerald-400' :
    color === 'rose' ? 'stroke-rose-500 dark:stroke-rose-400' :
    'stroke-slate-400 dark:stroke-slate-500'

  const fillColor =
    color === 'emerald' ? 'fill-emerald-100 dark:fill-emerald-950/30' :
    color === 'rose' ? 'fill-rose-100 dark:fill-rose-950/30' :
    'fill-slate-100 dark:fill-slate-800/30'

  return (
    <svg viewBox="0 0 100 100" className={className} preserveAspectRatio="none">
      <polyline
        points={`0,100 ${points} 100,100`}
        className={cn('transition-colors', fillColor)}
        strokeWidth="0"
      />
      <polyline
        points={points}
        className={cn('transition-colors', strokeColor)}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export { Sparkline }
