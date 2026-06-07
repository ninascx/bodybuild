import { useState } from 'react'

type ChartTooltipProps = {
  x: number
  y: number
  content: React.ReactNode
  visible: boolean
}

/**
 * Tooltip for chart data points
 */
export function ChartTooltip({ x, y, content, visible }: ChartTooltipProps) {
  if (!visible) return null

  return (
    <div
      className="pointer-events-none absolute z-50 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -100%) translateY(-8px)'
      }}
    >
      {content}
      <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-4 border-transparent border-t-white dark:border-t-slate-800"></div>
    </div>
  )
}

type ChartDataPoint = {
  x: number | string
  y: number
  label?: string
}

type InteractiveChartProps = {
  data: ChartDataPoint[]
  width: number
  height: number
  onHover?: (point: ChartDataPoint | null) => void
  renderTooltip?: (point: ChartDataPoint) => React.ReactNode
  children: (hoveredIndex: number | null) => React.ReactNode
}

/**
 * Wrapper for interactive chart with hover detection
 */
export function InteractiveChart({
  data,
  width,
  height,
  onHover,
  renderTooltip,
  children
}: InteractiveChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  function handleMouseMove(e: React.MouseEvent<SVGElement>) {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left

    // Find closest data point
    const pointWidth = width / data.length
    const index = Math.floor(x / pointWidth)

    if (index >= 0 && index < data.length) {
      setHoveredIndex(index)
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      onHover?.(data[index])
    } else {
      setHoveredIndex(null)
      onHover?.(null)
    }
  }

  function handleMouseLeave() {
    setHoveredIndex(null)
    onHover?.(null)
  }

  return (
    <div className="relative">
      <svg
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair"
      >
        {children(hoveredIndex)}
      </svg>

      {hoveredIndex !== null && renderTooltip && (
        <ChartTooltip
          x={tooltipPos.x}
          y={tooltipPos.y}
          content={renderTooltip(data[hoveredIndex])}
          visible={true}
        />
      )}
    </div>
  )
}

/**
 * Simple data formatter helpers
 */
export const chartFormatters = {
  number: (value: number, decimals = 1) => value.toFixed(decimals),
  kg: (value: number) => `${value.toFixed(1)} kg`,
  reps: (value: number) => `${Math.round(value)} 次`,
  kcal: (value: number) => `${Math.round(value)} kcal`,
  percentage: (value: number) => `${Math.round(value * 100)}%`,
  date: (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}
