import { Button } from '../ui'

type ChartToolbarProps = {
  title: string
  dateRange?: string
  onDateRangeChange?: (range: '7' | '30' | '90' | '365') => void
  onExport?: () => void
  onFullscreen?: () => void
  showDateRangePicker?: boolean
  showExport?: boolean
  showFullscreen?: boolean
  children?: React.ReactNode
}

export function ChartToolbar({
  title,
  dateRange,
  onDateRangeChange,
  onExport,
  onFullscreen,
  showDateRangePicker = true,
  showExport = true,
  showFullscreen = false,
  children,
}: ChartToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-lg border-b border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>

      <div className="flex flex-wrap items-center gap-2">
        {showDateRangePicker && onDateRangeChange && (
          <div className="flex rounded-md border border-slate-300 dark:border-slate-700">
            {(['7', '30', '90', '365'] as const).map((range) => (
              <button
                key={range}
                onClick={() => onDateRangeChange(range)}
                className={`px-3 py-1 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
                  dateRange === range
                    ? 'bg-[var(--color-primary-700)] text-white dark:bg-cyan-600'
                    : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {range === '365' ? '1年' : `${range}天`}
              </button>
            ))}
          </div>
        )}

        {children}

        {showExport && onExport && (
          <Button variant="ghost" onClick={onExport} className="text-xs" title="导出图表数据">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            导出
          </Button>
        )}

        {showFullscreen && onFullscreen && (
          <Button variant="ghost" onClick={onFullscreen} className="text-xs" title="全屏显示">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
            </svg>
          </Button>
        )}
      </div>
    </div>
  )
}
