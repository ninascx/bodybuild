import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWA 安装提示组件
 * - Android/Chrome: 捕获 beforeinstallprompt 事件，显示自定义安装按钮
 * - iOS Safari: 显示手动安装指引
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // 检测是否为 iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(ios)

    // 检测是否已安装（standalone 模式）
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    // 如果已安装，不显示提示
    if (standalone) return

    // Android/Chrome: 捕获 beforeinstallprompt 事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // 延迟显示，避免用户刚进入就弹窗
      setTimeout(() => setShowPrompt(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // iOS: 3秒后显示手动安装指引
    if (ios) {
      setTimeout(() => setShowPrompt(true), 3000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // 24小时后再显示
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // 检查是否在24小时内被关闭过
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60)
      if (hoursSinceDismissed < 24) {
        setShowPrompt(false)
      }
    }
  }, [])

  if (!showPrompt || isStandalone) return null

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-md justify-center px-4 md:bottom-4">
      <div className="flex w-full items-start gap-3 rounded-lg border border-emerald-200 bg-white p-3 shadow-lg dark:border-emerald-700/40 dark:bg-slate-900">
        <div className="flex-1 text-sm">
          <p className="font-semibold text-slate-950 dark:text-slate-50">
            {isIOS ? '添加到主屏幕' : '安装应用'}
          </p>
          {isIOS ? (
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
              点击 <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-slate-200 text-[10px] dark:bg-slate-700">⬆️</span> 分享按钮，选择"添加到主屏幕"
            </p>
          ) : (
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
              安装后可离线使用，体验更流畅
            </p>
          )}
        </div>
        {!isIOS && deferredPrompt ? (
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
          >
            安装
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleDismiss}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md px-2 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="关闭"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
