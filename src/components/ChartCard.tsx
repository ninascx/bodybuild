import type { ReactElement, ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'
import { Card } from './ui'
import type { TrendPoint } from '../lib/metrics'

export function ChartCard({
  title,
  children,
  isEmpty = false,
  action,
}: {
  title: string
  children: ReactElement
  isEmpty?: boolean
  action?: ReactNode
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
        {action}
      </div>
      <div className="mt-4 h-56 sm:h-64">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm leading-6 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
            连续记录两天以上后，这里会显示趋势。
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        )}
      </div>
    </Card>
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
