import { Component, type ErrorInfo, type ReactNode } from 'react'
import { createBackup, downloadBackup, loadAllCachedData } from '../lib/storage'
import { Button, Card, StatusMessage } from './ui'

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
      const cached = loadAllCachedData()
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
    const copyLabel = copyStatus === 'success' ? '已复制' : copyStatus === 'error' ? '复制失败' : '复制错误信息'
    return (
      <div className="min-h-dvh bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50 sm:py-12">
        <Card className="mx-auto max-w-2xl border-rose-200 dark:border-rose-700/40">
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-950 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-50">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">应用异常</p>
            <h2 className="mt-2 text-xl font-semibold">页面渲染时遇到问题</h2>
            <p className="mt-2 text-sm leading-6 text-rose-800 dark:text-rose-100">
              本地记录仍可先导出备份。建议复制错误信息后再重试，方便后续排查。
            </p>
          </div>

          <div className="mt-5 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
            <p>可以按下面顺序恢复：</p>
            <ol className="list-decimal space-y-1 pl-5 leading-6">
              <li>先导出本地缓存，避免数据丢失。</li>
              <li>复制错误信息并保留给排查。</li>
              <li>尝试重试；如果仍失败，再清除标签缓存并刷新。</li>
            </ol>
          </div>

          <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
          </pre>

          {exportMessage ? (
            <StatusMessage className="mt-4" tone={exportMessage.includes('失败') ? 'danger' : 'positive'} announce>
              {exportMessage}
            </StatusMessage>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={this.exportCache}>
              导出本地缓存
            </Button>
            <Button
              variant={copyStatus === 'error' ? 'danger' : copyStatus === 'success' ? 'secondary' : 'secondary'}
              onClick={() => void this.copyError()}
              aria-live="polite"
            >
              {copyLabel}
            </Button>
            <Button variant="danger" onClick={this.reset}>
              重试
            </Button>
            <Button variant="secondary" onClick={this.clearTabAndReload}>
              清除标签缓存并刷新
            </Button>
          </div>
        </Card>
      </div>
    )
  }
}
