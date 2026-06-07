import type { CSSProperties } from 'react'
import { useEffect } from 'react'
import type { DailyLog, DailyTarget } from '../../types'
import type { SyncState } from '../../lib/storage'
import type { DailyFocusKey } from '../../lib/productFlow'
import { Button } from '../ui'
import { NumberField, type NumberRange } from '../NumberField'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

export type DailyEssentialsFormProps = {
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
}

const quickFieldClass = 'h-11 text-base'

type EssentialField = {
  key: DailyFocusKey
  label: string
  value?: number
  step: string
  kind: 'decimal' | 'integer'
  range: NumberRange
  quickStep: number
  quickStepLabel: string
  patch: (value: number | undefined) => Partial<DailyLog>
}

function clampValue(value: number, range: NumberRange): number {
  if (range.min !== undefined && value < range.min) return range.min
  if (range.max !== undefined && value > range.max) return range.max
  return value
}

function normalizeAdjustedValue(value: number, field: EssentialField): number {
  const adjusted = field.kind === 'integer' ? Math.round(value) : Math.round(value * 10) / 10
  return clampValue(adjusted, field.range)
}

function QuickAdjustButtons({
  label,
  stepLabel,
  disabled,
  onDecrease,
  onIncrease,
}: {
  label: string
  stepLabel: string
  disabled: boolean
  onDecrease: () => void
  onIncrease: () => void
}) {
  const buttonClass =
    'h-9 min-w-[36px] border-l border-[var(--surface-border)] px-1.5 text-xs font-semibold leading-none text-slate-600 transition-colors first:border-l-0 hover:bg-white hover:text-[var(--color-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-cyan-100 dark:focus-visible:ring-cyan-500/40 dark:disabled:text-slate-600 sm:h-11 sm:min-w-[44px] sm:px-2 sm:text-sm'

  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)] dark:border-slate-700 dark:bg-slate-900" aria-label={`${label} 快速微调`}>
      <button
        type="button"
        className={buttonClass}
        disabled={disabled}
        title={disabled ? '先输入数值后可微调' : `减少 ${stepLabel}`}
        aria-label={`${label} 减少 ${stepLabel}`}
        onClick={onDecrease}
      >
        -{stepLabel}
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={disabled}
        title={disabled ? '先输入数值后可微调' : `增加 ${stepLabel}`}
        aria-label={`${label} 增加 ${stepLabel}`}
        onClick={onIncrease}
      >
        +
      </button>
    </div>
  )
}

function getSaveLabel(syncState: SyncState, savePending: boolean, lastSyncedLabel: string) {
  if (savePending) return '待保存'
  if (syncState === 'synced') return lastSyncedLabel ? `已保存 ${lastSyncedLabel}` : '已保存'
  if (syncState === 'saving') return '保存中'
  return '离线缓存'
}

export function DailyEssentialsForm(props: DailyEssentialsFormProps) {
  const allFields: EssentialField[] = [
    { key: 'weight', label: '体重 kg', value: props.selectedLog.morningWeightKg, step: '0.1', kind: 'decimal', range: { min: 20, max: 300 }, quickStep: 0.1, quickStepLabel: '0.1', patch: (value: number | undefined) => ({ morningWeightKg: value }) },
    { key: 'calories', label: '热量 kcal', value: props.selectedLog.calories, step: '1', kind: 'integer', range: { min: 0, max: 10000, allowZero: true }, quickStep: 100, quickStepLabel: '100', patch: (value: number | undefined) => ({ calories: value }) },
    { key: 'protein', label: '蛋白质 g', value: props.selectedLog.protein, step: '1', kind: 'integer', range: { min: 0, max: 500, allowZero: true }, quickStep: 10, quickStepLabel: '10', patch: (value: number | undefined) => ({ protein: value }) },
    { key: 'steps', label: '步数', value: props.selectedLog.steps, step: '1', kind: 'integer', range: { min: 0, max: 100000, allowZero: true }, quickStep: 1000, quickStepLabel: '1k', patch: (value: number | undefined) => ({ steps: value }) },
    { key: 'sleep', label: '睡眠 h', value: props.selectedLog.sleepHours, step: '0.1', kind: 'decimal', range: { min: 0, max: 24, allowZero: true }, quickStep: 0.5, quickStepLabel: '0.5', patch: (value: number | undefined) => ({ sleepHours: value }) },
    { key: 'fatigue', label: `疲劳 ≤${props.fatigueThreshold}`, value: props.selectedLog.fatigueScore, step: '1', kind: 'integer', range: { min: 0, max: 10, allowZero: true }, quickStep: 1, quickStepLabel: '1', patch: (value: number | undefined) => ({ fatigueScore: value }) },
  ]

  const priorityFieldKeys = props.priorityKeys || ['weight', 'calories', 'protein']
  const essentialFields = priorityFieldKeys.map(key => allFields.find(f => f.key === key)).filter(Boolean) as EssentialField[]
  const supplementaryFields = allFields.filter(f => !priorityFieldKeys.includes(f.key))

  // Keyboard shortcuts for quick actions
  useKeyboardShortcuts([
    {
      key: 'y',
      ctrl: true,
      handler: () => {
        if (props.yesterdayLog) {
          props.onCopyYesterday()
        }
      }
    },
    {
      key: 't',
      ctrl: true,
      handler: () => {
        if (props.hasFillableTargetFields) {
          props.onFillTarget()
        }
      }
    }
  ])

  useEffect(() => {
    // Auto-focus on priority field if focusKey is set
    if (props.focusKey) {
      const element = document.querySelector(`[data-daily-focus="${props.focusKey}"] input`)
      if (element instanceof HTMLInputElement) {
        element.focus()
      }
    }
  }, [props.focusKey])
  return (
    <section className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">每日记录</h3>
          <p className="mt-0.5 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">先填关键数据</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {getSaveLabel(props.syncState, props.savePending, props.lastSyncedLabel)}
          </span>
          {props.syncState === 'offline' ? (
            <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">
              将在联网后自动同步
            </p>
          ) : null}
        </div>
      </div>

      <div className="motion-list mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {essentialFields.map((field, index) => {
          const focused = props.focusKey === field.key
          return (
            <div
              key={field.key}
              data-daily-focus={field.key}
              style={{ '--motion-index': Math.min(index, 3) } as CSSProperties}
              className={focused ? 'rounded-lg border border-[var(--color-primary-100)] bg-[var(--surface-selected)] p-1 dark:border-cyan-700/40 dark:bg-cyan-950/20' : undefined}
            >
              <NumberField
                className={quickFieldClass}
                label={field.label}
                value={field.value}
                step={field.step}
                kind={field.kind}
                range={field.range}
                labelAction={
                  <QuickAdjustButtons
                    label={field.label}
                    stepLabel={field.quickStepLabel}
                    disabled={field.value === undefined}
                    onDecrease={() => {
                      if (field.value === undefined) return
                      props.onUpdateDailyLog(field.patch(normalizeAdjustedValue(field.value - field.quickStep, field)))
                    }}
                    onIncrease={() => {
                      if (field.value === undefined) return
                      props.onUpdateDailyLog(field.patch(normalizeAdjustedValue(field.value + field.quickStep, field)))
                    }}
                  />
                }
                onChange={(value) => props.onUpdateDailyLog(field.patch(value))}
              />
            </div>
          )
        })}
      </div>

      {supplementaryFields.length > 0 ? (
        <details className="mt-3 rounded-md border border-[var(--surface-border)] dark:border-slate-700">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
            补充记录 ({supplementaryFields.length} 项)
          </summary>
          <div className="motion-list grid grid-cols-2 gap-2.5 border-t border-[var(--surface-border)] p-2.5 dark:border-slate-700 sm:grid-cols-3">
            {supplementaryFields.map((field, index) => {
              const focused = props.focusKey === field.key
              return (
                <div
                  key={field.key}
                  data-daily-focus={field.key}
                  style={{ '--motion-index': Math.min(index, 3) } as CSSProperties}
                  className={focused ? 'rounded-lg border border-[var(--color-primary-100)] bg-[var(--surface-selected)] p-1 dark:border-cyan-700/40 dark:bg-cyan-950/20' : undefined}
                >
                  <NumberField
                    className={quickFieldClass}
                    label={field.label}
                    value={field.value}
                    step={field.step}
                    kind={field.kind}
                    range={field.range}
                    labelAction={
                      <QuickAdjustButtons
                        label={field.label}
                        stepLabel={field.quickStepLabel}
                        disabled={field.value === undefined}
                        onDecrease={() => {
                          if (field.value === undefined) return
                          props.onUpdateDailyLog(field.patch(normalizeAdjustedValue(field.value - field.quickStep, field)))
                        }}
                        onIncrease={() => {
                          if (field.value === undefined) return
                          props.onUpdateDailyLog(field.patch(normalizeAdjustedValue(field.value + field.quickStep, field)))
                        }}
                      />
                    }
                    onChange={(value) => props.onUpdateDailyLog(field.patch(value))}
                  />
                </div>
              )
            })}
          </div>
        </details>
      ) : null}

      {(props.yesterdayLog || props.hasFillableTargetFields) ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            className="w-full px-2 text-xs shadow-none sm:text-sm"
            disabled={!props.yesterdayLog}
            onClick={props.onCopyYesterday}
            title={props.yesterdayLog ? "快捷键: Ctrl+Y" : undefined}
          >
            复制昨天
          </Button>
          <Button
            variant="secondary"
            className="w-full px-2 text-xs shadow-none sm:text-sm"
            disabled={!props.hasFillableTargetFields}
            onClick={props.onFillTarget}
            title={props.hasFillableTargetFields ? "快捷键: Ctrl+T" : undefined}
          >
            填入目标
          </Button>
        </div>
      ) : null}
    </section>
  )
}
