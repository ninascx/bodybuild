import { useState, useEffect, useRef } from 'react'

type UseVirtualScrollOptions = {
  itemHeight: number
  containerHeight: number
  itemCount: number
  overscan?: number
}

/**
 * Virtual scrolling hook for optimizing long lists
 * Only renders visible items + overscan buffer
 */
export function useVirtualScroll({
  itemHeight,
  containerHeight,
  itemCount,
  overscan = 3
}: UseVirtualScrollOptions) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = []
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push(i)
  }

  // Total height to maintain scroll position
  const totalHeight = itemCount * itemHeight

  // Offset for visible items
  const offsetY = startIndex * itemHeight

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      setScrollTop(container.scrollTop)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  return {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex
  }
}
