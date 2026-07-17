import { Badge, Card, DisclosurePanel, EmptyState } from '../components/ui'
import { SummaryRow } from '../components/SummaryRow'
import { getDayKey } from '../lib/dates'
import { roundMetric } from '../lib/metrics'
import { dayNames, weekendRules } from '../data/plans'
import { useMemo } from 'react'
import type { AdjustmentRecommendation, DailyLog, WeeklySummary } from '../types'

type WeeklyTabProps = {
  weeklySummary: WeeklySummary
  twoWeekAdjustment: AdjustmentRecommendation
  weekendRisk: AdjustmentRecommendation
  trendAlerts: AdjustmentRecommendation[]
  weeklyActionRecommendations: AdjustmentRecommendation[]
  weekendCalorieUpperKcal: number
  dailyLogs: DailyLog[]
}

const toneDotClass = {
  positive: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  neutral: 'bg-slate-400',
} as const

function RecommendationList({ items }: { items: AdjustmentRecommendation[] }) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">当前没有需要处理的提醒。</p>
  }
  return (
    <ul className="divide-y divide-[var(--surface-border)] dark:divide-slate-700">
      {items.map((item) => (
        <li key={item.title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${toneDotClass[item.tone]}`} aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-950 dark:text-slate-50">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.message}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function WeeklyTab(props: WeeklyTabProps) {
  const weekendLogs = useMemo(
    () => props.dailyLogs.filter(
      (log) => log.date >= props.weeklySummary.weekStart && log.date <= props.weeklySummary.weekEnd && [5, 6].includes(getDayKey(log.date)),
    ),
    [props.dailyLogs, props.weeklySummary.weekStart, props.weeklySummary.weekEnd],
  )

  return (
    <div className="grid gap-5">
      <section className="border-b border-[var(--surface-border)] pb-5 dark:border-slate-800" aria-labelledby="next-week-title">
        <h2 id="next-week-title" className="text-lg font-semibold text-slate-950 dark:text-slate-50">下周怎么调</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">先看可执行调整，再查看指标和明细。</p>
        <div className="mt-4">
          <RecommendationList items={props.weeklyActionRecommendations} />
        </div>
      </section>

      <Card>
        <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">本周关键指标</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{props.weeklySummary.weekStart} 至 {props.weeklySummary.weekEnd}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <SummaryRow label="本周平均体重" value={`${roundMetric(props.weeklySummary.averageWeight)} kg`} />
          <SummaryRow label="较上周 7 日均值" value={props.weeklySummary.weightDelta === undefined ? '暂无' : `${props.weeklySummary.weightDelta > 0 ? '+' : ''}${props.weeklySummary.weightDelta} kg`} />
          <SummaryRow label="本周腰围变化" value={props.weeklySummary.waistDelta === undefined ? '暂无' : `${props.weeklySummary.waistDelta > 0 ? '+' : ''}${props.weeklySummary.waistDelta} cm`} />
          <SummaryRow label="训练完成率" value={`${props.weeklySummary.trainingCompletionRate}%`} />
          <SummaryRow label="本周总热量" value={`${props.weeklySummary.totalCalories} kcal`} />
          <SummaryRow label="周末平均热量" value={props.weeklySummary.weekendAverageCalories === undefined ? '暂无' : `${props.weeklySummary.weekendAverageCalories} kcal`} danger={props.weeklySummary.weekendOverLimit} />
        </div>
      </Card>

      <DisclosurePanel title="趋势提醒与明细" contentClassName="grid gap-6 p-4 lg:grid-cols-2">
        <section>
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">两周趋势</h2>
          <div className="mt-3">
            <RecommendationList items={[props.twoWeekAdjustment]} />
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">趋势提醒</h2>
          <div className="mt-3">
            <RecommendationList items={props.trendAlerts} />
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">周末风险</h2>
          <div className="mt-3">
            <RecommendationList items={[props.weekendRisk]} />
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">下一周建议</h2>
          <ul className="mt-3 divide-y divide-[var(--surface-border)] text-sm leading-6 text-slate-700 dark:divide-slate-700 dark:text-slate-200">
            {props.weeklySummary.suggestions.map((suggestion) => (
              <li key={suggestion} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${props.weeklySummary.weekendOverLimit && suggestion.includes('周末') ? 'bg-rose-500' : 'bg-[var(--color-primary-600)]'}`} aria-hidden="true" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">周末规则检查</h2>
          <div className="mt-3 grid gap-x-5 md:grid-cols-2">
            {weekendLogs.map((log) => (
              <div key={log.date} className="border-b border-[var(--surface-border)] py-3 text-sm first:pt-0 dark:border-slate-700">
                <p className="font-medium text-slate-950 dark:text-slate-50">{log.date} · {dayNames[getDayKey(log.date)]}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone={(log.calories ?? 0) > props.weekendCalorieUpperKcal ? 'danger' : 'positive'}>热量 {log.calories ?? '未填'} kcal</Badge>
                  <Badge tone={log.protein !== undefined && log.protein < weekendRules.proteinMinG ? 'warning' : 'positive'}>蛋白质 {log.protein ?? '未填'} g</Badge>
                  <Badge tone={log.steps !== undefined && log.steps < weekendRules.stepsMinSteps ? 'warning' : 'positive'}>步数 {log.steps ?? '未填'}</Badge>
                </div>
              </div>
            ))}
            {weekendLogs.length === 0 ? <EmptyState className="md:col-span-2" title="本周还没有周五/周六记录" message="周末记录会在这里集中检查热量、蛋白和步数。" /> : null}
          </div>
        </section>
      </DisclosurePanel>
    </div>
  )
}
