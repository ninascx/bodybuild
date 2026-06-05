import { useEffect } from 'react'
import { Field, TextArea } from '../ui'
import type { DailyLog, DailyTarget } from '../../types'
import type { SyncState } from '../../lib/storage'
import type { DailyFocusKey } from '../../lib/productFlow'
import { getMotionScrollBehavior } from '../../lib/motion'
import { DailyEssentialsForm } from './DailyEssentialsForm'

export type DailyCheckInPanelProps = {
  selectedLog: Partial<DailyLog> & { date: string }
  selectedTarget: DailyTarget
  yesterdayLog: DailyLog | undefined
  calorieTarget: number | undefined
  fatigueThreshold: number
  syncState: SyncState
  savePending: boolean
  lastSyncedLabel: string
  onUpdateDailyLog: (patch: Partial<DailyLog>) => void
  onQuickAction: (patch: Partial<DailyLog>) => void
  onCopyYesterday: () => void
  onFillTarget: () => void
  hasFillableTargetFields: boolean
  focusKey?: DailyFocusKey
  priorityKeys?: DailyFocusKey[]
  onFocusConsumed?: () => void
}

function DailyNotesSection({
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
        className="min-h-20 bg-white dark:bg-slate-900"
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
    const target = document.querySelector<HTMLElement>(`[data-daily-focus="${focusKey}"]`)
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
    <div className="grid gap-3 sm:gap-4">
      <div className="grid gap-3 sm:gap-4">
        <DailyEssentialsForm {...props} />
        <DailyNotesSection selectedLog={props.selectedLog} onUpdateDailyLog={props.onUpdateDailyLog} />
      </div>
    </div>
  )
}
