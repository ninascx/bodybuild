import type { ColorSchemePreference } from '../hooks/useColorScheme'
import { Button } from './ui'

export function ThemeToggle({
  preference,
  resolved,
  onCycle,
}: {
  preference: ColorSchemePreference
  resolved: 'light' | 'dark'
  onCycle: () => void
}) {
  const label =
    preference === 'system'
      ? `跟随系统（当前${resolved === 'dark' ? '深色' : '浅色'}）`
      : preference === 'dark'
        ? '深色'
        : '浅色'
  const shortLabel = preference === 'system' ? '系统' : preference === 'dark' ? '深色' : '浅色'
  return (
    <Button
      variant="secondary"
      onClick={onCycle}
      title={`主题：${label}（点击切换）`}
      aria-label={`主题：${label}`}
      className="min-w-11 gap-1.5 px-3 shadow-none"
    >
      <span aria-hidden="true" className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
        {shortLabel}
      </span>
      <span className="hidden sm:inline">主题</span>
    </Button>
  )
}
