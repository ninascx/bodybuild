import { useRef, useCallback } from 'react'

type SwipeDirection = 'left' | 'right'

export function useSwipe(onSwipe: (direction: SwipeDirection) => void) {
  const touchStart = useRef<number | null>(null)
  const touchEnd = useRef<number | null>(null)

  const minSwipeDistance = 50

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchEnd.current = null
    touchStart.current = e.targetTouches[0].clientX
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return

    const distance = touchStart.current - touchEnd.current
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      onSwipe('left')
    } else if (isRightSwipe) {
      onSwipe('right')
    }

    touchStart.current = null
    touchEnd.current = null
  }, [onSwipe])

  return { onTouchStart, onTouchMove, onTouchEnd }
}
