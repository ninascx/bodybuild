import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

export interface AnimatedMetricProps {
  value: number
  duration?: number
  className?: string
  format?: (value: number) => string
}

export function AnimatedMetric({
  value,
  duration = 800,
  className = '',
  format = (v) => Math.round(v).toLocaleString()
}: AnimatedMetricProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const previousValue = useRef(value)
  const startTime = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    // Skip animation if value hasn't changed
    if (previousValue.current === value) return

    const startValue = displayValue
    const endValue = value
    const change = endValue - startValue

    startTime.current = null

    const animate = (currentTime: number) => {
      if (startTime.current === null) {
        startTime.current = currentTime
      }

      const elapsed = currentTime - startTime.current
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + change * eased

      setDisplayValue(currentValue)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        previousValue.current = value
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [value, duration, displayValue])

  return (
    <span className={cn('tabular-nums', className)}>
      {format(displayValue)}
    </span>
  )
}
