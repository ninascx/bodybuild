import type { ColorSchemePreference } from '../hooks/useColorScheme'

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
  const icon = preference === 'system' ? '🖥️' : preference === 'dark' ? '🌙' : '☀️'
  return (
    <button
      type="button"
      onClick={onCycle}
      title={`主题：${label}（点击切换）`}
      aria-label={`主题：${label}`}
      className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 px-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
    >
      <span aria-hidden="true">{icon}</span>
      <span className="hidden sm:inline">主题</span>
    </button>
  )
}
