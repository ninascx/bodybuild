import type { ReactNode } from 'react'
import { DropdownMenu, StatusMessage } from '../ui'
import type { DropdownMenuItem } from '../ui'
import { MainNavigation } from './MainNavigation'
import { SyncStatusBar } from './SyncStatusBar'
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
    <main className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#app-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-slate-950 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 dark:focus:bg-slate-100 dark:focus:text-slate-950"
      >
        跳到主要内容
      </a>
      <div className={`mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 pt-2 sm:px-6 sm:pt-4 lg:px-8 ${immersiveMode ? 'pb-4' : 'pb-24 md:pb-4'}`}>
        {!immersiveMode ? (
          <>
            <header className="mb-2 border-b border-slate-200/70 pb-1.5 dark:border-slate-800 sm:pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <img
                    src="/favicon.png"
                    alt="BodyBuild"
                    className="h-7 w-7 shrink-0 rounded-md sm:h-8 sm:w-8"
                    width={32}
                    height={32}
                  />
                  <span className="hidden text-slate-300 dark:text-slate-700 sm:inline">/</span>
                  <h1 className="truncate text-xl font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">{activeLabel}</h1>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <p className="hidden max-w-40 truncate text-sm text-slate-500 dark:text-slate-400 sm:block">
                    {currentUser?.displayName ?? '未登录'}
                    {currentUser?.role === 'admin' ? <span className="ml-1 font-semibold text-teal-700 dark:text-cyan-300">管理员</span> : null}
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

            <MainNavigation tabs={tabs} activeTab={activeTab} onChange={onTabChange} />
          </>
        ) : null}

        <section id="app-content" key={String(activeTab)} tabIndex={-1} className={`outline-none ${immersiveMode ? 'pt-1' : 'motion-tab-view'}`}>
          {children}
        </section>
        {saveFeedback && !(saveFeedback.tone === 'neutral' && syncState === 'saving') ? (
          <div className="pointer-events-none fixed left-1/2 top-4 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2">
            <StatusMessage className="pointer-events-auto motion-feedback shadow-lg" tone={saveFeedback.tone} announce>
              {saveFeedback.message}
            </StatusMessage>
          </div>
        ) : null}
      </div>
    </main>
  )
}
