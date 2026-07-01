import { useState } from 'react'
import { cn } from '../../lib/cn'
import { Button, UserAvatar } from '../ui'
import type { CurrentUser, SyncState } from '../../lib/storage'

type DesktopSidebarProps<T extends string> = {
  tabs: Array<{ key: T; label: string }>
  activeTab: T
  currentUser: CurrentUser | null
  syncState: SyncState
  syncMessage: string
  lastSyncedLabel: string
  onTabChange: (tab: T) => void
  onRetrySync: () => void
}

const iconPaths: Record<string, string> = {
  daily: 'M6 4h9l3 3v13H6V4z M14 4v4h4 M9 12h6 M9 15h6 M9 18h3',
  workout: 'M6 10v4 M4 12h4 M16 10v4 M14 12h4 M8 12h6 M12 7v10',
  analytics: 'M5 19V9 M10 19V5 M15 19v-7 M20 19V8 M4 19h17',
  settings: 'M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z M12 3v3 M12 18v3 M4.8 5.2l2.1 2.1 M17.1 16.7l2.1 2.1 M3 12h3 M18 12h3 M4.8 18.8l2.1-2.1 M17.1 7.3l2.1-2.1',
  admin: 'M12 4l7 3v5c0 4.2-2.8 6.8-7 8-4.2-1.2-7-3.8-7-8V7l7-3z M9 12l2 2 4-5',
}

function NavIcon({ tabKey }: { tabKey: string }) {
  const path = iconPaths[tabKey] ?? iconPaths.daily
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  )
}

function SyncStatusIndicator({ syncState, message, lastSynced, onRetry }: { syncState: SyncState; message: string; lastSynced: string; onRetry: () => void }) {
  const statusColor = syncState === 'synced' ? 'text-emerald-600 dark:text-emerald-400' :
    syncState === 'saving' || syncState === 'loading' ? 'text-amber-600 dark:text-amber-400' :
    'text-red-600 dark:text-red-400'

  const statusDot = syncState === 'synced' ? '●' :
    syncState === 'saving' || syncState === 'loading' ? '◐' : '○'

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn('text-base leading-none', statusColor)}>{statusDot}</span>
      <div className="flex-1 min-w-0">
        <p className="truncate text-slate-600 dark:text-slate-400">{message}</p>
        {lastSynced && syncState === 'synced' ? (
          <p className="truncate text-slate-500 dark:text-slate-500">{lastSynced}</p>
        ) : null}
      </div>
      {syncState === 'offline' ? (
        <button
          onClick={onRetry}
          className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          title="重试同步"
        >
          ↻
        </button>
      ) : null}
    </div>
  )
}

export function DesktopSidebar<T extends string>({
  tabs,
  activeTab,
  currentUser,
  syncState,
  syncMessage,
  lastSyncedLabel,
  onTabChange,
  onRetrySync,
}: DesktopSidebarProps<T>) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden lg:flex lg:flex-col border-r border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl transition-all duration-300',
        collapsed ? 'lg:w-16' : 'lg:w-60'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 p-4">
        {collapsed ? (
          <img src="/favicon.png" alt="LiftLog" className="h-8 w-8 rounded-md shadow-md" />
        ) : (
          <>
            <img src="/favicon.png" alt="LiftLog" className="h-8 w-8 rounded-md shadow-md" />
            <h1 className="flex-1 truncate text-lg font-bold tracking-tight text-slate-950 dark:text-slate-50">
              LiftLog
            </h1>
          </>
        )}
      </div>

      {/* User Info */}
      {currentUser && !collapsed ? (
        <div className="border-b border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <UserAvatar displayName={currentUser.displayName} role={currentUser.role} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{currentUser.displayName}</p>
              {currentUser.role === 'admin' ? (
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">管理员</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {tabs.map((tab) => {
            const active = activeTab === tab.key
            return (
              <Button
                key={tab.key}
                variant={active ? 'primary' : 'ghost'}
                onClick={() => onTabChange(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all',
                  collapsed ? 'justify-center px-2' : '',
                  active
                    ? 'bg-[var(--color-primary-700)] text-white shadow-md hover:bg-[var(--color-primary-600)] dark:bg-cyan-600'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80'
                )}
              >
                <NavIcon tabKey={tab.key} />
                {!collapsed && <span>{tab.label}</span>}
              </Button>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-3">
        {!collapsed ? (
          <SyncStatusIndicator
            syncState={syncState}
            message={syncMessage}
            lastSynced={lastSyncedLabel}
            onRetry={onRetrySync}
          />
        ) : (
          <div className="flex justify-center">
            <span className={cn(
              'text-2xl',
              syncState === 'synced' ? 'text-emerald-600 dark:text-emerald-400' :
              syncState === 'saving' || syncState === 'loading' ? 'text-amber-600 dark:text-amber-400' :
              'text-red-600 dark:text-red-400'
            )}>
              {syncState === 'synced' ? '●' : syncState === 'saving' || syncState === 'loading' ? '◐' : '○'}
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mt-2 w-full rounded-md py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>
    </aside>
  )
}
