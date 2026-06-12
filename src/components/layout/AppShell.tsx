import type { ReactNode } from 'react'
import { DropdownMenu, UserAvatar } from '../ui'
import type { DropdownMenuItem } from '../ui'
import { MainNavigation } from './MainNavigation'
import { DesktopSidebar } from './DesktopSidebar'
import { SyncStatusBar } from './SyncStatusBar'
import { KeyboardShortcutsHelp } from '../KeyboardShortcutsHelp'
import type { ColorSchemePreference } from '../../hooks/useColorScheme'
import type { CurrentUser, SyncState } from '../../lib/storage'
import type { RecommendationTone } from '../../types'

type AppShellProps<T extends string> = {
  children: ReactNode
  tabs: Array<{ key: T; label: string }>
  activeTab: T
  immersiveMode?: boolean
  currentUser: CurrentUser | null
  colorPreference: ColorSchemePreference
  resolvedColorScheme: 'light' | 'dark'
  syncState: SyncState
  syncMessage: string
  lastSyncedLabel: string
  saveFeedback: { tone: RecommendationTone; message: string } | null
  slowSave: boolean
  autoRetryEnabled: boolean
  extraMenuItems?: DropdownMenuItem[]
  noticeMessage: string
  copyMessage: string
  contextRail?: ReactNode
  onTabChange: (tab: T) => void
  onCycleColorScheme: () => void
  onLogout: () => void
  onRetrySync: () => void
}

export function AppShell<T extends string>({
  children,
  tabs,
  activeTab,
  immersiveMode = false,
  currentUser,
  colorPreference,
  resolvedColorScheme,
  syncState,
  syncMessage,
  lastSyncedLabel,
  saveFeedback,
  slowSave,
  autoRetryEnabled,
  extraMenuItems = [],
  noticeMessage,
  copyMessage,
  contextRail,
  onTabChange,
  onCycleColorScheme,
  onLogout,
  onRetrySync,
}: AppShellProps<T>) {
  const activeLabel = tabs.find((tab) => tab.key === activeTab)?.label ?? '追踪'
  const adminTab = tabs.find((tab) => tab.key === 'admin')
  const themeLabel =
    colorPreference === 'system'
      ? `系统 ${resolvedColorScheme === 'dark' ? '深色' : '浅色'}`
      : colorPreference === 'dark'
        ? '深色'
        : '浅色'

  return (
    <main className="min-h-screen bg-transparent text-slate-900 dark:bg-transparent dark:text-slate-100">
      <a
        href="#app-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-slate-950 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 dark:focus:bg-slate-100 dark:focus:text-slate-950"
      >
        跳到主要内容
      </a>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar Navigation */}
        {!immersiveMode && (
          <DesktopSidebar
            tabs={tabs}
            activeTab={activeTab}
            currentUser={currentUser}
            syncState={syncState}
            syncMessage={syncMessage}
            lastSyncedLabel={lastSyncedLabel}
            onTabChange={onTabChange}
            onRetrySync={onRetrySync}
          />
        )}

        {/* Main Content Area */}
        <div className={`flex-1 flex min-w-0 ${immersiveMode ? '' : 'lg:ml-0'}`}>
          <div className={`flex-1 flex flex-col min-w-0`}>
            <div className={`mx-auto w-full flex flex-col px-3 pt-2 sm:px-6 sm:pt-4 lg:px-8 ${immersiveMode ? 'pb-4' : 'pb-56 md:pb-4'} ${activeTab === 'analytics' ? 'max-w-[1600px]' : activeTab === 'settings' ? 'max-w-5xl' : 'max-w-7xl'}`}>
            {!immersiveMode ? (
              <>
                {/* Mobile/Tablet Header */}
                <header className="mb-2 border-b border-[var(--surface-border)] pb-1.5 shadow-sm dark:border-slate-800 sm:pb-2 lg:hidden">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <img
                        src="/favicon.png"
                        alt="LiftLog"
                        className="h-7 w-7 shrink-0 rounded-md shadow-md transition-transform duration-300 hover:scale-110 hover:rotate-3 sm:h-8 sm:w-8"
                        width={32}
                        height={32}
                      />
                      <span className="hidden text-[var(--surface-border-strong)] dark:text-slate-700 sm:inline">/</span>
                      <h1 className="truncate bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-xl font-bold tracking-tight text-transparent dark:from-slate-50 dark:to-slate-300 sm:text-2xl">{activeLabel}</h1>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {currentUser ? (
                        <UserAvatar
                          displayName={currentUser.displayName}
                          role={currentUser.role}
                          size="sm"
                        />
                      ) : null}
                      <p className="hidden max-w-40 truncate text-sm text-slate-500 dark:text-slate-400 sm:block">
                        {currentUser?.displayName ?? '未登录'}
                        {currentUser?.role === 'admin' ? <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400">管理员</span> : null}
                      </p>
                      <DropdownMenu
                        label="更多"
                        items={[
                          ...(adminTab ? [{ label: '用户管理与备份', onSelect: () => onTabChange(adminTab.key) }] : []),
                          ...extraMenuItems,
                          { label: `账号：${currentUser?.displayName ?? '未登录'}`, onSelect: () => undefined, disabled: true },
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
                    saveFeedback={saveFeedback}
                    slowSave={slowSave}
                    autoRetryEnabled={autoRetryEnabled}
                    noticeMessage={noticeMessage}
                    copyMessage={copyMessage}
                    onRetry={onRetrySync}
                  />
                </header>

                {/* Desktop Header (Simplified) */}
                <header className="mb-4 hidden lg:block">
                  <div className="flex items-center justify-between">
                    <h1 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-3xl font-bold tracking-tight text-transparent dark:from-slate-50 dark:to-slate-300">
                      {activeLabel}
                    </h1>
                    <DropdownMenu
                      label="更多"
                      items={[
                        ...(adminTab ? [{ label: '用户管理与备份', onSelect: () => onTabChange(adminTab.key) }] : []),
                        ...extraMenuItems,
                        { label: `账号：${currentUser?.displayName ?? '未登录'}`, onSelect: () => undefined, disabled: true },
                        { label: `主题：${themeLabel}`, onSelect: onCycleColorScheme },
                        { label: '退出', onSelect: onLogout, tone: 'danger' },
                      ]}
                    />
                  </div>
                </header>

                {/* Mobile Bottom Navigation */}
                <MainNavigation tabs={tabs} activeTab={activeTab} onChange={onTabChange} />
              </>
            ) : null}

            <section id="app-content" key={String(activeTab)} tabIndex={-1} className={`outline-none ${immersiveMode ? 'pt-1' : 'motion-tab-view'}`}>
              {children}
            </section>
          </div>
        </div>

        {/* Context Rail */}
        {!immersiveMode && contextRail}
      </div>

      {/* Keyboard shortcuts help */}
      {!immersiveMode && <KeyboardShortcutsHelp />}
    </main>
  )
}
