import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App crash captured by ErrorBoundary:', error, info)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <h2 className="text-lg font-semibold">出现错误</h2>
        <p className="mt-2 text-sm leading-6">
          页面渲染时遇到异常，可能是日期输入或数据格式不正确。请尝试：
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm leading-6">
          <li>检查"记录"或"训练"页面的日期是否为空</li>
          <li>点击下方"重试"按钮</li>
          <li>仍异常请刷新页面，必要时通过"导出 JSON"备份数据</li>
        </ul>
        <pre className="mt-3 max-h-40 overflow-auto rounded bg-rose-100 p-2 text-xs">
          {error.message}
        </pre>
        <button
          type="button"
          onClick={this.reset}
          className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-700"
        >
          重试
        </button>
      </div>
    )
  }
}
