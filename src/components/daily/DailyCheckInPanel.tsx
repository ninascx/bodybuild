import { useEffect } from 'react'
import { Button, Field, TextArea } from '../ui'
import type { DailyLog, DailyTarget } from '../../types'
import type { SyncState } from '../../lib/storage'
import type { DailyFocusKey } from '../../lib/productFlow'
import { DailyEssentialsForm } from './DailyEssentialsForm'

type QuickStatus = { label: string; value: string; helper: string; tone: 'positive' | 'warning' | 'neutral' }

export type DailyCheckInPanelProps = {
  selectedLog: Partial<DailyLog> & { date: string }
  selectedTarget: DailyTarget
  yesterdayLog: DailyLog | undefined
  quickStatuses: QuickStatus[]
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

function DailyQuickTools({
  hasFillableTargetFields,
  yesterdayLog,
  onCopyYesterday,
  onFillTarget,
}: DailyCheckInPanelProps) {
  if (!yesterdayLog && !hasFillableTargetFields) return null
  return (
    <div className="grid w-full grid-cols-2 gap-2">
      <Button variant="secondary" className="w-full px-2 text-xs shadow-none sm:text-sm" disabled={!yesterdayLog} onClick={onCopyYesterday}>填入昨天值</Button>
      <Button variant="secondary" className="w-full px-2 text-xs shadow-none sm:text-sm" disabled={!hasFillableTargetFields} onClick={onFillTarget}>填入目标值</Button>
    </div>
  )
}

export function DailyCheckInPanel(props: DailyCheckInPanelProps) {
  const { focusKey, onFocusConsumed } = props
  const missingStatuses = props.quickStatuses.filter((status) => status.value === '未记录' || status.value === '未关联')
  const visibleMissingStatuses = missingStatuses.slice(0, 4)
  const extraMissingCount = Math.max(0, missingStatuses.length - visibleMissingStatuses.length)

  useEffect(() => {
    if (!focusKey) return
    const target = document.querySelector<HTMLElement>(`[data-daily-focus="${focusKey}"]`)
    if (!target) return
    const timer = window.setTimeout(() => {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      const control = target.matches('input, textarea, button')
        ? target
        : target.querySelector<HTMLElement>('input, textarea, button')
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
        <section className="rounded-lg border border-teal-200 bg-cyan-50/70 p-3 dark:border-cyan-700/40 dark:bg-cyan-950/20 sm:p-4">
          <div className="grid gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-slate-50">
                  {missingStatuses.length > 0 ? `今日还差 ${missingStatuses.length} 项` : '今日记录已补齐'}
                </p>
                <p className="mt-1 text-xs leading-5 text-teal-700 dark:text-cyan-200">
                  {missingStatuses.length > 0 ? '先补齐影响判断的核心数据' : '可以继续补备注、围度，或回到今日页查看下一步。'}
                </p>
              </div>
              {extraMissingCount > 0 ? (
                <span className="shrink-0 rounded-full border border-teal-200 bg-white px-2 py-1 text-xs font-semibold text-teal-800 dark:border-cyan-700/50 dark:bg-slate-900 dark:text-cyan-100">
                  +{extraMissingCount}
                </span>
              ) : null}
            </div>

            {missingStatuses.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {visibleMissingStatuses.map((status) => (
                  <div
                    key={status.label}
                    className="min-h-14 rounded-md border border-teal-100 bg-white px-3 py-2 dark:border-cyan-700/40 dark:bg-slate-900"
                  >
                    <p className="truncate text-sm font-semibold text-teal-950 dark:text-cyan-50">{status.label}</p>
                    <p className="mt-0.5 truncate text-xs text-teal-700 dark:text-cyan-200">{status.helper}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <DailyQuickTools {...props} />
          </div>
        </section>
      </div>
    </div>
  )
}
