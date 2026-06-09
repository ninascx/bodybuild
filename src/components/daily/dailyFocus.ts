import type { DailyFocusKey } from '../../lib/productFlow'

function isVisibleElement(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  return element.getClientRects().length > 0
}

export function findDailyFocusTarget(focusKey: DailyFocusKey): HTMLElement | null {
  const targets = Array.from(document.querySelectorAll<HTMLElement>(`[data-daily-focus="${focusKey}"]`))
  return targets.find(isVisibleElement) ?? targets[0] ?? null
}
