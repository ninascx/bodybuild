import { Badge, Button, Card, RecommendationBox } from '../components/ui'
import { SummaryRow } from '../components/SummaryRow'
import { addDays, getDayKey, startOfWeekSunday } from '../lib/dates'
import { roundMetric } from '../lib/metrics'
import { dayNames, weekendRules } from '../data/plans'
import { useMemo } from 'react'
import type { AdjustmentRecommendation, DailyLog, WeeklySummary } from '../types'

type WeeklyTabProps = {
  weeklySummary: WeeklySummary
  weeklyAnchorDate: string
  today: string
  twoWeekAdjustment: AdjustmentRecommendation
  weekendRisk: AdjustmentRecommendation
  pushShoulderRisk: AdjustmentRecommendation
  weeklyConclusionCard: AdjustmentRecommendation
  dailyLogs: DailyLog[]
  onAnchorChange: (date: string) => void
}

export function WeeklyTab(props: WeeklyTabProps) {
  const weekendLogs = useMemo(
    () =>
      props.dailyLogs.filter(
        (log) =>
          log.date >= props.weeklySummary.weekStart &&
          log.date <= props.weeklySummary.weekEnd &&
          [5, 6].includes(getDayKey(log.date)),
      ),
    [props.dailyLogs, props.weeklySummary.weekStart, props.weeklySummary.weekEnd],
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-3 shadow-sm">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">查看周次</p>
        <div className="flex flex-wrap gap-1">
          <Button
            variant="secondary"
            className="px-3"
            onClick={() => props.onAnchorChange(addDays(props.weeklyAnchorDate, -7))}
            aria-label="上一周"
          >
            ‹ 上一周
          </Button>
          <Button
            variant="secondary"
            className="px-3"
            onClick={() => props.onAnchorChange(props.today)}
            disabled={startOfWeekSunday(props.weeklyAnchorDate) === startOfWeekSunday(props.today)}
          >
            本周
          </Button>
          <Button
            variant="secondary"
            className="px-3"
            onClick={() => props.onAnchorChange(addDays(props.weeklyAnchorDate, 7))}
            disabled={addDays(props.weeklyAnchorDate, 7) > props.today}
            aria-label="下一周"
          >
            下一周 ›
          </Button>
        </div>
      </div>
      <div className="lg:col-span-2">
        <RecommendationBox title={props.weeklyConclusionCard.title} message={props.weeklyConclusionCard.message} tone={props.weeklyConclusionCard.tone} />
      </div>
      <Card>
        <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">本周总结</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{props.weeklySummary.weekStart} 至 {props.weeklySummary.weekEnd}</p>
        <div className="mt-5 grid gap-3">
          <SummaryRow label="本周平均体重" value={`${roundMetric(props.weeklySummary.averageWeight)} kg`} />
          <SummaryRow label="较上周 7 日均值" value={props.weeklySummary.weightDelta === undefined ? '暂无' : `${props.weeklySummary.weightDelta > 0 ? '+' : ''}${props.weeklySummary.weightDelta} kg`} />
          <SummaryRow label="本周腰围变化" value={props.weeklySummary.waistDelta === undefined ? '暂无' : `${props.weeklySummary.waistDelta > 0 ? '+' : ''}${props.weeklySummary.waistDelta} cm`} />
          <SummaryRow label="训练完成率" value={`${props.weeklySummary.trainingCompletionRate}%`} />
          <SummaryRow label="本周总热量" value={`${props.weeklySummary.totalCalories} kcal`} />
          <SummaryRow label="周末平均热量" value={props.weeklySummary.weekendAverageCalories === undefined ? '暂无' : `${props.weeklySummary.weekendAverageCalories} kcal`} danger={props.weeklySummary.weekendOverLimit} />
        </div>
      </Card>
      <div className="grid gap-4">
        <RecommendationBox title={props.twoWeekAdjustment.title} message={props.twoWeekAdjustment.message} tone={props.twoWeekAdjustment.tone} />
        <RecommendationBox title={props.weekendRisk.title} message={props.weekendRisk.message} tone={props.weekendRisk.tone} />
        <RecommendationBox title={props.pushShoulderRisk.title} message={props.pushShoulderRisk.message} tone={props.pushShoulderRisk.tone} />
        <Card>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">下一周建议</h2>
          <div className="mt-3 grid gap-2">
            {props.weeklySummary.suggestions.map((suggestion) => (
              <div
                key={suggestion}
                className={`rounded-lg border p-3 text-sm leading-6 ${
                  props.weeklySummary.weekendOverLimit && suggestion.includes('周末')
                    ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-600/40 dark:bg-rose-900/30 dark:text-rose-100'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                {suggestion}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">周末规则检查</h2>
          <div className="mt-3 grid gap-2">
            {weekendLogs.map((log) => (
                <div key={log.date} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-slate-950 dark:text-slate-50">{log.date} · {dayNames[getDayKey(log.date)]}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={(log.calories ?? 0) > weekendRules.caloriesUpperKcal ? 'danger' : 'positive'}>热量 {log.calories ?? '未填'} kcal</Badge>
                    <Badge tone={log.protein !== undefined && log.protein < weekendRules.proteinMinG ? 'warning' : 'positive'}>蛋白质 {log.protein ?? '未填'} g</Badge>
                    <Badge tone={log.steps !== undefined && log.steps < weekendRules.stepsMinSteps ? 'warning' : 'positive'}>步数 {log.steps ?? '未填'}</Badge>
                  </div>
                </div>
              ))}
            {weekendLogs.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">本周还没有周五/周六记录。</p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  )
}
