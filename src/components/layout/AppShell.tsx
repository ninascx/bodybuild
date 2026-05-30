import type { ReactNode } from 'react'
import { DropdownMenu } from '../ui'
import { MainNavigation } from './MainNavigation'
import { SyncStatusBar } from './SyncStatusBar'
import type { ColorSchemePreference } from '../../hooks/useColorScheme'
import type { CurrentUser, SyncState } from '../../lib/storage'

type AppShellProps<T extends string> = {
  children: ReactNode
  tabs: Array<{ key: T; label: string }>
  activeTab: T
  currentUser: CurrentUser | null
  colorPreference: ColorSchemePreference
  resolvedColorScheme: 'light' | 'dark'
  syncState: SyncState
  syncMessage: string
  lastSyncedLabel: string
  slowSave: boolean
  autoRetryEnabled: boolean
  noticeMessage: string
  copyMessage: string
  copyStatus: 'idle' | 'success' | 'error'
  onTabChange: (tab: T) => void
  onCycleColorScheme: () => void
  onCopyToday: () => void
  onPreviewToday: () => void
  onOpenExport: () => void
  onLogout: () => void
  onRetrySync: () => void
}

export function AppShell<T extends string>({
  children,
  tabs,
  activeTab,
  currentUser,
  colorPreference,
  resolvedColorScheme,
  syncState,
  syncMessage,
  lastSyncedLabel,
  slowSave,
  autoRetryEnabled,
  noticeMessage,
  copyMessage,
  copyStatus,
  onTabChange,
  onCycleColorScheme,
  onCopyToday,
  onPreviewToday,
  onOpenExport,
  onLogout,
  onRetrySync,
}: AppShellProps<T>) {
  const activeLabel = tabs.find((tab) => tab.key === activeTab)?.label ?? '追踪'
  const themeLabel =
    colorPreference === 'system'
      ? `系统 ${resolvedColorScheme === 'dark' ? '深色' : '浅色'}`
      : colorPreference === 'dark'
        ? '深色'
        : '浅色'
  const copyLabel = copyStatus === 'success' ? '已复制今天' : copyStatus === 'error' ? '重新复制今天' : '复制今天'

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#app-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-slate-950 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:bg-slate-100 dark:focus:text-slate-950"
      >
        跳到主要内容
      </a>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-24 pt-3 sm:px-6 sm:pt-4 md:pb-4 lg:px-8">
        <header className="mb-2 border-b border-slate-200/80 pb-2 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400">BodyBuild</span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">{activeLabel}</h1>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <p className="hidden max-w-40 truncate text-sm text-slate-500 dark:text-slate-400 sm:block">
                {currentUser?.displayName ?? '未登录'}
                {currentUser?.role === 'admin' ? <span className="ml-1 font-semibold text-orange-700 dark:text-orange-400">管理员</span> : null}
              </p>
              <DropdownMenu
                label="更多"
                items={[
                  { label: copyLabel, onSelect: onCopyToday },
                  { label: '预览复制', onSelect: onPreviewToday },
                  { label: '导出', onSelect: onOpenExport },
                  { label: `主题：${themeLabel}`, onSelect: onCycleColorScheme },
                  { label: '退出', onSelect: onLogout, tone: 'danger' },
                ]}
              />
            </div>
          </div>

          <SyncStatusBar
            syncState={syncState}
            syncMessage={syncMessage}
            lastSyncedLabel={lastSyncedLabel}
            slowSave={slowSave}
            autoRetryEnabled={autoRetryEnabled}
            noticeMessage={noticeMessage}
            copyMessage={copyMessage}
            onRetry={onRetrySync}
          />
        </header>

        <MainNavigation tabs={tabs} activeTab={activeTab} onChange={onTabChange} />
        <section id="app-content" tabIndex={-1} className="outline-none">
          {children}
        </section>
      </div>
    </main>
  )
}
