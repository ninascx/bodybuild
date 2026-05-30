import { useEffect, useState } from 'react'
import { Button } from './ui'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandaloneDisplay(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as NavigatorWithStandalone).standalone === true
}

function installPromptRecentlyDismissed(): boolean {
  const dismissed = localStorage.getItem('pwa-install-dismissed')
  if (!dismissed) return false
  const dismissedTime = Number.parseInt(dismissed, 10)
  if (!Number.isFinite(dismissedTime)) return false
  const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60)
  return hoursSinceDismissed < 24
}

/**
 * PWA 安装提示组件
 * - Android/Chrome: 捕获 beforeinstallprompt 事件，显示自定义安装按钮
 * - iOS Safari: 显示手动安装指引
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS] = useState(isIosDevice)
  const [isStandalone] = useState(isStandaloneDisplay)

  useEffect(() => {
    // 如果已安装，不显示提示
    if (isStandalone || installPromptRecentlyDismissed()) return

    let showTimer: number | undefined

    // Android/Chrome: 捕获 beforeinstallprompt 事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // 延迟显示，避免用户刚进入就弹窗
      showTimer = window.setTimeout(() => setShowPrompt(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // iOS: 3秒后显示手动安装指引
    if (isIOS) {
      showTimer = window.setTimeout(() => setShowPrompt(true), 3000)
    }

    return () => {
      if (showTimer !== undefined) window.clearTimeout(showTimer)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [isIOS, isStandalone])

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

  if (!showPrompt || isStandalone) return null

  return (
    <div
      className="fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-md justify-center px-4 md:bottom-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full items-start gap-3 rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-700/40 dark:bg-slate-900">
        <div className="flex-1 text-sm">
          <p className="font-semibold text-slate-950 dark:text-slate-50">
            {isIOS ? '添加到主屏幕' : '安装应用'}
          </p>
          {isIOS ? (
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
              点击浏览器分享按钮，选择"添加到主屏幕"。
            </p>
          ) : (
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
              安装后可离线使用，体验更流畅
            </p>
          )}
        </div>
        {!isIOS && deferredPrompt ? (
          <Button className="shrink-0 px-3" onClick={() => void handleInstallClick()}>
            安装
          </Button>
        ) : null}
        <Button variant="ghost" className="shrink-0 px-3" onClick={handleDismiss} aria-label="关闭安装提示">
          关闭
        </Button>
      </div>
    </div>
  )
}
