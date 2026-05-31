import { useEffect } from 'react'
import { Button, Field, TextArea } from '../ui'
import { cn } from '../../lib/cn'
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
  onSyncWorkoutCompletion: () => void
  hasFillableTargetFields: boolean
  canSyncWorkoutCompletion: boolean
  workoutCompletionFromLog: number
  focusKey?: DailyFocusKey
  onFocusConsumed?: () => void
}

type ChoiceOption<T extends string> = {
  value: T
  label: string
  helper?: string
}

function ChoiceButtonGroup<T extends string>({
  label,
  helper,
  value,
  options,
  columns = 3,
  onChange,
}: {
  label: string
  helper?: string
  value: T
  options: ChoiceOption<T>[]
  columns?: 3 | 4 | 5
  onChange: (value: T) => void
}) {
  const gridClass = columns === 5 ? 'grid-cols-5' : columns === 4 ? 'grid-cols-4' : 'grid-cols-3'

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-slate-950 dark:text-slate-50">{label}</span>
        {helper ? <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{helper}</span> : null}
      </div>
      <div role="radiogroup" aria-label={label} className={cn('grid gap-1.5', gridClass)}>
        {options.map((option) => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={cn(
                'min-h-14 rounded-md border px-2 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:focus-visible:ring-cyan-500',
                selected
                  ? 'border-teal-700 bg-teal-700 text-white shadow-sm dark:border-cyan-500 dark:bg-cyan-600'
                  : 'border-slate-200 bg-white text-teal-950 hover:border-teal-300 hover:bg-cyan-50 dark:border-slate-700 dark:bg-slate-900 dark:text-cyan-50 dark:hover:border-cyan-600/60 dark:hover:bg-cyan-950/30',
              )}
              onClick={() => onChange(option.value)}
            >
              <span className="block text-sm font-semibold leading-5 tabular-nums">{option.label}</span>
              {option.helper ? (
                <span className={cn('mt-0.5 block text-[11px] leading-4', selected ? 'text-cyan-50/85' : 'text-teal-700 dark:text-cyan-200')}>
                  {option.helper}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}


function DailyTrainingPanel({
  selectedLog,
  selectedTarget,
  canSyncWorkoutCompletion,
  workoutCompletionFromLog,
  onQuickAction,
  onSyncWorkoutCompletion,
}: DailyCheckInPanelProps) {
  const trainingValue = selectedLog.trained === undefined ? 'unset' : selectedLog.trained ? 'yes' : 'no'
  const completionValue = String(selectedLog.workoutCompletion ?? 0)
  const hasWorkoutDerivedCompletion = workoutCompletionFromLog > 0

  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4"
      data-daily-focus="training"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-950 dark:text-slate-50">训练与恢复</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {selectedTarget.isTrainingDay ? `计划：${selectedTarget.workoutName}` : '今天是休息日，可记录加练或恢复状态'}
          </p>
        </div>
        {canSyncWorkoutCompletion ? (
          <Button variant="secondary" className="min-h-9 px-3 text-xs shadow-none" onClick={onSyncWorkoutCompletion}>
            同步训练 {workoutCompletionFromLog}%
          </Button>
        ) : hasWorkoutDerivedCompletion ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100">
            训练日志已计算 {workoutCompletionFromLog}%
          </span>
        ) : null}
      </div>

      <div className="grid gap-3">
        <ChoiceButtonGroup
          label="训练状态"
          helper={selectedTarget.isTrainingDay ? '今日计划' : '休息安排'}
          value={trainingValue}
          options={[
            { value: 'unset', label: '未填' },
            { value: 'yes', label: '已训练' },
            { value: 'no', label: '休息' },
          ]}
          onChange={(value) => onQuickAction({
              trained: value === 'unset' ? undefined : value === 'yes',
              workoutCompletion: value === 'yes' ? selectedLog.workoutCompletion : 0,
            })}
        />

        {!hasWorkoutDerivedCompletion ? (
          <ChoiceButtonGroup
            label="训练完成度"
            helper="没有训练日志时手动估算"
            value={completionValue}
            columns={4}
            options={[
              { value: '0', label: '0%', helper: '未开始' },
              { value: '50', label: '50%', helper: '做一半' },
              { value: '80', label: '80%', helper: '快完成' },
              { value: '100', label: '100%', helper: '完成' },
            ]}
            onChange={(value) => onQuickAction({
                trained: Number(value) > 0 ? true : selectedLog.trained,
                workoutCompletion: Number(value),
              })}
          />
        ) : null}
      </div>
    </div>
  )
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
        <DailyTrainingPanel {...props} />
      </div>
    </div>
  )
}
