import { Component, type ErrorInfo, type ReactNode } from 'react'
import { createBackup, downloadBackup, loadCachedData } from '../lib/storage'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
  exportMessage: string
  copyStatus: 'idle' | 'success' | 'error'
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, exportMessage: '', copyStatus: 'idle' }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App crash captured by ErrorBoundary:', error, info)
  }

  reset = () => {
    this.setState({ error: null, exportMessage: '', copyStatus: 'idle' })
  }

  exportCache = () => {
    try {
      const cached = loadCachedData()
      downloadBackup(createBackup(cached.dailyLogs, cached.workoutLogs, cached.workoutTemplates))
      this.setState({ exportMessage: '已导出本地缓存到下载目录。' })
    } catch (error) {
      console.error('从缓存导出备份失败：', error)
      this.setState({ exportMessage: '导出失败，请手动备份后再刷新。' })
    }
  }

  copyError = async () => {
    const { error } = this.state
    if (!error) return
    const text = [
      `Message: ${error.message}`,
      error.stack ? `Stack:\n${error.stack}` : '',
      `UA: ${navigator.userAgent}`,
      `Time: ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n\n')
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', 'true')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
      }
      this.setState({ copyStatus: 'success' })
      window.setTimeout(() => this.setState({ copyStatus: 'idle' }), 2000)
    } catch (copyError) {
      console.error('复制错误信息失败：', copyError)
      this.setState({ copyStatus: 'error' })
      window.setTimeout(() => this.setState({ copyStatus: 'idle' }), 2000)
    }
  }

  clearTabAndReload = () => {
    try {
      window.sessionStorage.removeItem('bodybuild:v1:activeTab')
    } catch (error) {
      console.warn('清除上次激活标签失败：', error)
    }
    window.location.reload()
  }

  render(): ReactNode {
    const { error, exportMessage, copyStatus } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)
    const copyLabel = copyStatus === 'success' ? '✓ 已复制' : copyStatus === 'error' ? '✗ 复制失败' : '复制错误信息'
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-900 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-100">
        <h2 className="text-lg font-semibold">出现错误</h2>
        <p className="mt-2 text-sm leading-6">
          页面渲染时遇到异常。可以先把本地缓存导出做备份，再尝试恢复。
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm leading-6">
          <li>检查"记录"或"训练"页面的日期是否为空</li>
          <li>点击"导出本地缓存"先备份，避免数据丢失</li>
          <li>点击"复制错误信息"再贴给开发者，便于排查</li>
          <li>再点击"重试"或"清除标签缓存并刷新"</li>
        </ul>
        <pre className="mt-3 max-h-40 overflow-auto rounded bg-rose-100 p-2 text-xs dark:bg-rose-900/50">
          {error.message}
          {error.stack ? `\n\n${error.stack}` : ''}
        </pre>
        {exportMessage ? <p className="mt-2 text-xs text-rose-800 dark:text-rose-200">{exportMessage}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={this.exportCache}
            className="inline-flex h-10 items-center justify-center rounded-md border border-rose-300 bg-white px-4 text-sm font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-700/40 dark:bg-rose-900/40 dark:text-rose-100 dark:hover:bg-rose-900/60"
          >
            导出本地缓存
          </button>
          <button
            type="button"
            onClick={() => void this.copyError()}
            aria-live="polite"
            className={`inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium transition ${
              copyStatus === 'success'
                ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/40 dark:text-emerald-100'
                : copyStatus === 'error'
                  ? 'border-rose-400 bg-rose-200 text-rose-900 dark:border-rose-700/40 dark:bg-rose-900/60 dark:text-rose-100'
                  : 'border-rose-300 bg-white text-rose-700 hover:bg-rose-100 dark:border-rose-700/40 dark:bg-rose-900/40 dark:text-rose-100 dark:hover:bg-rose-900/60'
            }`}
          >
            {copyLabel}
          </button>
          <button
            type="button"
            onClick={this.reset}
            className="inline-flex h-10 items-center justify-center rounded-md bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-700"
          >
            重试
          </button>
          <button
            type="button"
            onClick={this.clearTabAndReload}
            className="inline-flex h-10 items-center justify-center rounded-md border border-rose-300 bg-white px-4 text-sm font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-700/40 dark:bg-rose-900/40 dark:text-rose-100 dark:hover:bg-rose-900/60"
          >
            清除标签缓存并刷新
          </button>
        </div>
      </div>
    )
  }
}
