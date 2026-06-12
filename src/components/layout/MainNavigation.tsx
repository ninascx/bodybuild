import { cn } from '../../lib/cn'
import { Button } from '../ui'

type MainNavigationProps<T extends string> = {
  tabs: Array<{ key: T; label: string }>
  activeTab: T
  onChange: (tab: T) => void
}

const iconPaths: Record<string, string> = {
  today: 'M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v11a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 17.5v-11z M8 3v3 M16 3v3 M4 9h16 M8 13h3 M8 16h6',
  daily: 'M6 4h9l3 3v13H6V4z M14 4v4h4 M9 12h6 M9 15h6 M9 18h3',
  workout: 'M6 10v4 M4 12h4 M16 10v4 M14 12h4 M8 12h6 M12 7v10',
  analytics: 'M5 19V9 M10 19V5 M15 19v-7 M20 19V8 M4 19h17',
  settings: 'M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z M12 3v3 M12 18v3 M4.8 5.2l2.1 2.1 M17.1 16.7l2.1 2.1 M3 12h3 M18 12h3 M4.8 18.8l2.1-2.1 M17.1 7.3l2.1-2.1',
  admin: 'M12 4l7 3v5c0 4.2-2.8 6.8-7 8-4.2-1.2-7-3.8-7-8V7l7-3z M9 12l2 2 4-5',
}

function NavigationIcon({ tabKey }: { tabKey: string }) {
  const path = iconPaths[tabKey] ?? iconPaths.today
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  )
}

export function MainNavigation<T extends string>({ tabs, activeTab, onChange }: MainNavigationProps<T>) {
  const mobileTabs = tabs.filter((tab) => tab.key !== 'admin')
  const mobileGridClass = mobileTabs.length === 4
    ? 'grid-cols-4'
    : mobileTabs.length === 6
      ? 'grid-cols-6'
      : 'grid-cols-5'
  return (
    <>
      <nav className="sticky top-0 z-20 mb-5 hidden overflow-x-auto border-y border-white/30 bg-white/80 py-2 shadow-xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-950/80 md:block">
        <div className="flex min-w-max gap-1.5">
          {tabs.map((tab) => {
            const active = activeTab === tab.key
            return (
              <Button
                key={tab.key}
                variant={active ? 'primary' : 'ghost'}
                onClick={() => onChange(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-md px-4 text-sm font-semibold shadow-none',
                  active
                    ? 'bg-[var(--color-primary-700)] text-white shadow-sm hover:bg-[var(--color-primary-600)] dark:bg-cyan-600 dark:text-white dark:hover:bg-cyan-500'
                    : 'text-slate-700 hover:bg-white/80 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-slate-50',
                  // 增加文字阴影以提高可读性
                  active ? 'drop-shadow-sm' : 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]',
                )}
              >
                <NavigationIcon tabKey={tab.key} />
                {tab.label}
              </Button>
            )
          })}
        </div>
      </nav>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/30 bg-white/85 px-3 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-1.5 shadow-2xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-950/85 md:hidden"
        aria-label="主要导航"
      >
        <div className={`mx-auto grid max-w-md gap-1 ${mobileGridClass}`}>
          {mobileTabs.map((tab) => {
            const active = activeTab === tab.key
            return (
              <Button
                key={tab.key}
                variant="ghost"
                onClick={() => onChange(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative min-h-12 flex-col gap-0.5 rounded-lg px-1 py-1 text-xs font-semibold shadow-none',
                  active
                    ? 'motion-nav-active bg-[var(--surface-selected)] text-[var(--color-primary-700)] hover:bg-[var(--surface-selected)] dark:bg-cyan-950/40 dark:text-cyan-200 dark:hover:bg-cyan-950/40 after:absolute after:inset-x-4 after:top-1 after:h-0.5 after:rounded-full after:bg-[var(--color-primary-700)] dark:after:bg-cyan-400'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-50',
                  // 文字阴影提高可读性
                  'drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]',
                )}
              >
                <NavigationIcon tabKey={tab.key} />
                <span className="whitespace-nowrap leading-5">{tab.label}</span>
              </Button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
