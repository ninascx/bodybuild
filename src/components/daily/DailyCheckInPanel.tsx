import { useEffect } from 'react'
import { Field, TextArea } from '../ui'
import type { BodyMetricType, BodyRecord, DailyLog, DailyTarget } from '../../types'
import type { DailyFocusKey } from '../../lib/productFlow'
import { getMotionScrollBehavior } from '../../lib/motion'
import { DailyEssentialsForm } from './DailyEssentialsForm'
import { findDailyFocusTarget } from './dailyFocus'

export type DailyCheckInPanelProps = {
  selectedLog: Partial<DailyLog> & { date: string }
  selectedBodyRecords: BodyRecord[]
  selectedTarget: DailyTarget
  yesterdayLog: DailyLog | undefined
  calorieTarget: number | undefined
  fatigueThreshold: number
  onUpdateDailyLog: (patch: Partial<DailyLog>) => void
  onUpdateBodyRecord: (type: BodyMetricType, value: number | undefined) => void
  onQuickAction: (patch: Partial<DailyLog>, feedback?: string) => void
  onCopyYesterday: () => void
  onFillTarget: () => void
  hasCopyableYesterdayFields: boolean
  hasFillableTargetFields: boolean
  focusKey?: DailyFocusKey
  onFocusConsumed?: () => void
  nextActionLabel?: string
  onNextAction?: () => void
}

export function DailyNotesSection({
  selectedLog,
  onUpdateDailyLog,
}: {
  selectedLog: Partial<DailyLog>
  onUpdateDailyLog: (patch: Partial<DailyLog>) => void
}) {
  return (
    <section className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-4 dark:border-slate-800 dark:bg-slate-900">
      <Field label="当天备注" className="scroll-mt-28" helper="可记录饮食调整、训练感受或身体变化。">
        <TextArea
          data-daily-focus="notes"
          className="min-h-24 bg-white dark:bg-slate-950 lg:min-h-32"
          value={selectedLog.notes ?? ''}
          placeholder="写下今天值得记住的变化"
          onChange={(event) => onUpdateDailyLog({ notes: event.target.value })}
        />
      </Field>
    </section>
  )
}

export function DailyCheckInPanel(props: DailyCheckInPanelProps) {
  const { focusKey, onFocusConsumed } = props

  useEffect(() => {
    if (!focusKey) return
    const target = findDailyFocusTarget(focusKey)
    if (!target) return
    const timer = window.setTimeout(() => {
      target.scrollIntoView({ block: 'center', behavior: getMotionScrollBehavior() })
      const control = target.matches('input, textarea, button')
        ? target
        : target.querySelector<HTMLElement>('input, textarea') ?? target.querySelector<HTMLElement>('button')
      control?.focus({ preventScroll: true })
      onFocusConsumed?.()
    }, 80)
    return () => window.clearTimeout(timer)
  }, [focusKey, onFocusConsumed])

  return (
    <DailyEssentialsForm {...props} />
  )
}
