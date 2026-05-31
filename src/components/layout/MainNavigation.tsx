import { cn } from '../../lib/cn'
import { Button } from '../ui'

type MainNavigationProps<T extends string> = {
  tabs: Array<{ key: T; label: string }>
  activeTab: T
  onChange: (tab: T) => void
}

export function MainNavigation<T extends string>({ tabs, activeTab, onChange }: MainNavigationProps<T>) {
  return (
    <>
      <nav className="sticky top-0 z-20 mb-5 hidden overflow-x-auto border-y border-slate-200/80 bg-slate-100/90 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 md:block">
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
                    ? 'bg-teal-700 text-white shadow-sm hover:bg-teal-800 dark:bg-cyan-600 dark:text-white dark:hover:bg-cyan-500'
                    : 'text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50',
                )}
              >
                {tab.label}
              </Button>
            )
          })}
        </div>
      </nav>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgb(15_23_42_/_0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden"
        aria-label="主要导航"
      >
        <div className={`mx-auto grid max-w-md gap-1 ${tabs.length === 6 ? 'grid-cols-6' : 'grid-cols-5'}`}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key
            return (
              <Button
                key={tab.key}
                variant="ghost"
                onClick={() => onChange(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'min-h-12 rounded-lg px-1 py-1 text-xs font-semibold shadow-none',
                  active
                    ? 'bg-teal-700 text-white hover:bg-teal-800 dark:bg-cyan-600 dark:text-white dark:hover:bg-cyan-500'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-50',
                )}
              >
                <span className="whitespace-nowrap leading-5">{tab.label}</span>
              </Button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
