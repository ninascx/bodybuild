import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

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
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto flex max-w-md justify-center px-4">
      {needRefresh ? (
        <div className="flex w-full items-center gap-3 rounded-lg border border-emerald-200 bg-white p-3 shadow-lg">
          <div className="flex-1 text-sm">
            <p className="font-semibold text-slate-950">新版本已就绪</p>
            <p className="text-slate-600">点击重新加载使用最新功能。</p>
          </div>
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
          >
            重新加载
          </button>
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            className="inline-flex h-9 items-center justify-center rounded-md px-2 text-sm text-slate-500 hover:bg-slate-100"
            aria-label="忽略"
          >
            ✕
          </button>
        </div>
      ) : showOffline ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 shadow-lg">
          已缓存到本地，可离线使用 🥊
        </div>
      ) : null}
    </div>
  )
}
