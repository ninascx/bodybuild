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
}

export function DailyNotesSection({
  selectedLog,
  onUpdateDailyLog,
}: {
  selectedLog: Partial<DailyLog>
  onUpdateDailyLog: (patch: Partial<DailyLog>) => void
}) {
  return (
    <Field label="备注" className="scroll-mt-28" >
      <TextArea
        data-daily-focus="notes"
        className="min-h-20 bg-white dark:bg-slate-900 lg:min-h-28"
        value={selectedLog.notes ?? ''}
        placeholder="记录训练感受、饮食调整、身体变化..."
        onChange={(event) => onUpdateDailyLog({ notes: event.target.value })}
      />
    </Field>
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
