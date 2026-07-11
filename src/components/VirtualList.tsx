/* eslint-disable react-refresh/only-export-components */
import { useRef, useState, useEffect, useCallback } from 'react'

type VirtualListProps<T> = {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
  renderItem,
  className = '',
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const totalHeight = items.length * itemHeight
  const visibleCount = Math.ceil(containerHeight / itemHeight)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount + 2 * overscan)

  const visibleItems = items.slice(startIndex, endIndex + 1)
  const offsetY = startIndex * itemHeight

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Hook for dynamic item heights (more complex but flexible)
type UseVirtualScrollOptions = {
  itemCount: number
  estimateItemHeight: (index: number) => number
  overscan?: number
}

type VirtualItem = {
  index: number
  start: number
  size: number
}

export function useVirtualScroll({
  itemCount,
  estimateItemHeight,
  overscan = 3,
}: UseVirtualScrollOptions) {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const [measurements, setMeasurements] = useState<Map<number, number>>(() => new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setContainerHeight(entry.contentRect.height)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const getItemHeight = useCallback(
    (index: number): number => {
      const cached = measurements.get(index)
      if (cached !== undefined) return cached
      return estimateItemHeight(index)
    },
    [estimateItemHeight, measurements]
  )

  const getTotalHeight = useCallback((): number => {
    let total = 0
    for (let i = 0; i < itemCount; i++) {
      total += getItemHeight(i)
    }
    return total
  }, [itemCount, getItemHeight])

  const getVirtualItems = useCallback((): VirtualItem[] => {
    const items: VirtualItem[] = []

    let start = 0
    let index = 0

    // Find first visible item
    while (index < itemCount && start + getItemHeight(index) < scrollTop) {
      start += getItemHeight(index)
      index++
    }

    // Add overscan items before
    const overscanStart = Math.max(0, index - overscan)
    let currentStart = 0
    for (let i = 0; i < overscanStart; i++) {
      currentStart += getItemHeight(i)
    }

    // Add visible and overscan items
    for (let i = overscanStart; i < itemCount; i++) {
      const height = getItemHeight(i)
      items.push({ index: i, start: currentStart, size: height })
      currentStart += height

      if (currentStart > scrollTop + containerHeight + overscan * 100) {
        break
      }
    }

    return items
  }, [itemCount, scrollTop, containerHeight, overscan, getItemHeight])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const measureElement = useCallback((index: number, element: HTMLElement | null) => {
    if (!element) return
    const height = element.getBoundingClientRect().height
    setMeasurements((current) => {
      if (current.get(index) === height) return current
      const next = new Map(current)
      next.set(index, height)
      return next
    })
  }, [])

  return {
    containerRef,
    virtualItems: getVirtualItems(),
    totalHeight: getTotalHeight(),
    handleScroll,
    measureElement,
  }
}
