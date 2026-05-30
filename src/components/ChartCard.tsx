import type { ReactElement, ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'
import { Card, EmptyState } from './ui'
import type { TrendPoint } from '../lib/metrics'

export function ChartCard({
  title,
  description,
  children,
  isEmpty = false,
  emptyMessage = '连续记录两天以上后，这里会显示趋势。',
  action,
  chartSummary,
  legend,
}: {
  title: string
  description?: ReactNode
  children: ReactElement
  isEmpty?: boolean
  emptyMessage?: ReactNode
  action?: ReactNode
  chartSummary?: string
  legend?: ReactNode
}) {
  const accessibleSummary = chartSummary ?? [title, typeof description === 'string' ? description : undefined].filter(Boolean).join('。')

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4 h-56 sm:h-64">
        {isEmpty ? (
          <EmptyState
            compact
            className="flex h-full flex-col items-center justify-center"
            title="暂无趋势数据"
            message={emptyMessage}
          />
        ) : (
          <div className="h-full" role="img" aria-label={accessibleSummary}>
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {!isEmpty && legend ? <div className="mt-3">{legend}</div> : null}
    </Card>
  )
}

type ChartLegendItem = { label: string; color?: string; pattern?: 'solid' | 'dashed' | 'bar' | 'area' }

function ChartLegendMarker({ item }: { item: ChartLegendItem }) {
  if (!item.color) return null

  if (item.pattern === 'dashed') {
    return <span className="block w-6 border-t-2 border-dashed" style={{ borderColor: item.color }} aria-hidden="true" />
  }

  if (item.pattern === 'bar') {
    return <span className="block h-3.5 w-3 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden="true" />
  }

  if (item.pattern === 'area') {
    return (
      <span
        className="block h-3 w-6 rounded-sm border"
        style={{ backgroundColor: `${item.color}33`, borderColor: item.color }}
        aria-hidden="true"
      />
    )
  }

  return <span className="block w-6 rounded-full border-t-[3px]" style={{ borderColor: item.color }} aria-hidden="true" />
}

export function ChartLegend({
  items,
  note,
}: {
  items: ChartLegendItem[]
  note?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
      {items.map((item) => (
        <span key={item.label} className="inline-flex min-h-6 items-center gap-2">
          <ChartLegendMarker item={item} />
          <span>{item.label}</span>
        </span>
      ))}
      {note ? <span className="text-slate-500 dark:text-slate-400">{note}</span> : null}
    </div>
  )
}

interface TooltipPayloadItem {
  payload?: TrendPoint
  value?: number
}

export function WeightTrendTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  if (!point) return null
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs leading-5 shadow dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold text-slate-950 dark:text-slate-50">{point.fullDate}</p>
      {point.weight !== undefined ? (
        <p className="text-slate-700 dark:text-slate-200">
          每日体重：<span className="font-medium">{point.weight} kg</span>
        </p>
      ) : null}
      {point.weightAverage7 !== undefined ? (
        <p className="text-slate-700 dark:text-slate-200">
          7 日均重：<span className="font-medium">{point.weightAverage7} kg</span>
        </p>
      ) : null}
      {point.calories !== undefined ? (
        <p className="text-slate-500 dark:text-slate-400">当天热量：{point.calories} kcal</p>
      ) : null}
      {point.protein !== undefined ? (
        <p className="text-slate-500 dark:text-slate-400">当天蛋白质：{point.protein} g</p>
      ) : null}
    </div>
  )
}
