import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui'

/**
 * PWA 更新提示
 * - 检测到新版本时，浮窗提示用户刷新
 * - autoUpdate 注册类型已经会自动激活新 SW，这里只是给用户一个明确的"重新加载"入口
 */
export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      // 每小时检查一次更新（应用打开期间）
      if (registration) {
        setInterval(() => {
          void registration.update()
        }, 60 * 60 * 1000)
      }
    },
    onRegisterError(error) {
      console.error('SW 注册失败：', error)
    },
  })

  const [showOffline, setShowOffline] = useState(false)

  useEffect(() => {
    if (offlineReady) {
      const showTimer = window.setTimeout(() => setShowOffline(true), 0)
      const hideTimer = window.setTimeout(() => {
        setShowOffline(false)
        setOfflineReady(false)
      }, 4000)
      return () => {
        window.clearTimeout(showTimer)
        window.clearTimeout(hideTimer)
      }
    }
  }, [offlineReady, setOfflineReady])

  if (!needRefresh && !showOffline) return null

  return (
    <div
      className="fixed inset-x-0 bottom-4 z-50 mx-auto flex max-w-md justify-center px-4"
      role="status"
      aria-live="polite"
    >
      {needRefresh ? (
        <div className="flex w-full items-center gap-3 rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-700/40 dark:bg-slate-900">
          <div className="flex-1 text-sm">
            <p className="font-semibold text-slate-950 dark:text-slate-50">新版本已就绪</p>
            <p className="text-slate-600 dark:text-slate-400">点击重新加载使用最新功能。</p>
          </div>
          <Button className="shrink-0 px-3" onClick={() => updateServiceWorker(true)}>
            重新加载
          </Button>
          <Button variant="ghost" className="min-h-11 shrink-0 px-3" onClick={() => setNeedRefresh(false)} aria-label="忽略新版本提示">
            关闭
          </Button>
        </div>
      ) : showOffline ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-100">
          已缓存到本地，可离线使用
        </div>
      ) : null}
    </div>
  )
}
