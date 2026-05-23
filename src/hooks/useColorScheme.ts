import { useEffect, useState, useCallback } from 'react'

export type ColorSchemePreference = 'system' | 'light' | 'dark'
export type ResolvedColorScheme = 'light' | 'dark'

const STORAGE_KEY = 'bodybuild:v1:colorScheme'

function readSavedPreference(): ColorSchemePreference {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch (error) {
    console.warn('读取主题偏好失败（localStorage 不可用），将使用跟随系统：', error)
  }
  return 'system'
}

function getSystemScheme(): ResolvedColorScheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyHtmlClass(resolved: ResolvedColorScheme) {
  const root = document.documentElement
  if (resolved === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')

  // 同步浏览器 UI（地址栏 / iOS 状态栏）
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    // 深色：slate-950；浅色：与 :root 背景的 slate-50 对齐
    meta.setAttribute('content', resolved === 'dark' ? '#020617' : '#f8fafc')
  }
}

/**
 * 暗色模式管理：默认跟随系统偏好，可手动覆盖为 light / dark；选择持久化到 localStorage。
 */
export function useColorScheme() {
  const [preference, setPreferenceState] = useState<ColorSchemePreference>(() => readSavedPreference())
  const [systemScheme, setSystemScheme] = useState<ResolvedColorScheme>(() => getSystemScheme())

  // 监听系统偏好变化
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (event: MediaQueryListEvent) => setSystemScheme(event.matches ? 'dark' : 'light')
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    }
    // Safari 旧版兼容
    mql.addListener(handler)
    return () => mql.removeListener(handler)
  }, [])

  const resolved: ResolvedColorScheme = preference === 'system' ? systemScheme : preference

  // 同步 html.dark 与 meta theme-color
  useEffect(() => {
    applyHtmlClass(resolved)
  }, [resolved])

  const setPreference = useCallback((next: ColorSchemePreference) => {
    setPreferenceState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch (error) {
      console.warn('保存主题偏好失败（localStorage 不可用，可能是隐私模式或配额已满）：', error)
    }
  }, [])

  const cycle = useCallback(() => {
    setPreferenceState((current) => {
      const next: ColorSchemePreference =
        current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system'
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch (error) {
        console.warn('保存主题偏好失败（localStorage 不可用，可能是隐私模式或配额已满）：', error)
      }
      return next
    })
  }, [])

  return { preference, resolved, setPreference, cycle }
}
