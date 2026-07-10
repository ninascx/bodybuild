import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import type { BodyMetricType, BodyRecord, DailyLog, DailyTarget } from '../../types'
import type { SyncState } from '../../lib/storage'
import type { DailyFocusKey } from '../../lib/productFlow'
import { bodyMetricDefinition } from '../../lib/bodyMetrics'
import { Badge, Button, DisclosurePanel } from '../ui'
import { QuickAdjustNumberField, type NumberRange } from '../NumberField'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { getDailySaveLabel } from './dailyRecordStatus'
import { getBodyRecordStatus } from './bodyRecordStatus'
import { keyRecordCompletion } from './dailyRecordActions'

export type DailyEssentialsFormProps = {
  selectedLog: Partial<DailyLog> & { date: string }
  selectedBodyRecords: BodyRecord[]
  selectedTarget: DailyTarget
  yesterdayLog: DailyLog | undefined
  calorieTarget: number | undefined
  fatigueThreshold: number
  syncState: SyncState
  savePending: boolean
  lastSyncedLabel: string
  showSaveStatus?: boolean
  onUpdateDailyLog: (patch: Partial<DailyLog>) => void
  onUpdateBodyRecord: (type: BodyMetricType, value: number | undefined) => void
  onQuickAction: (patch: Partial<DailyLog>, feedback?: string) => void
  onCopyYesterday: () => void
  onFillTarget: () => void
  hasCopyableYesterdayFields: boolean
  hasFillableTargetFields: boolean
  focusKey?: DailyFocusKey
}

const quickFieldClass = 'h-11 min-w-[7.5rem] text-base tabular-nums'
const supplementaryKeys: DailyFocusKey[] = ['steps', 'sleep', 'fatigue']

type RecordField = {
  key: DailyFocusKey
  label: string
  value?: number
  inputStep: string
  kind: 'decimal' | 'integer'
  range: NumberRange
  quickStep: number
  quickStepLabel: string
  onChange: (value: number | undefined) => void
  footerLeading?: ReactNode
  className?: string
}

function fieldFocusClass(focused: boolean): string {
  return focused
    ? 'rounded-lg border border-[var(--color-primary-100)] bg-[var(--surface-selected)] p-1 dark:border-cyan-700/40 dark:bg-cyan-950/20'
    : ''
}

export function DailyEssentialsForm(props: DailyEssentialsFormProps) {
  const weightRecord = props.selectedBodyRecords.find((record) => record.type === 'weight')
  const weightDefinition = bodyMetricDefinition('weight')
  const weightStatus = weightRecord ? getBodyRecordStatus(weightRecord) : undefined
  const completion = keyRecordCompletion({
    weight: weightRecord?.value,
    calories: props.selectedLog.calories,
    protein: props.selectedLog.protein,
  })
  const [supplementaryOpen, setSupplementaryOpen] = useState(
    () => Boolean(props.focusKey && supplementaryKeys.includes(props.focusKey)),
  )
  const showSaveStatus = props.showSaveStatus ?? true

  useEffect(() => {
    if (!props.focusKey || !supplementaryKeys.includes(props.focusKey)) return
    const timer = window.setTimeout(() => setSupplementaryOpen(true), 0)
    return () => window.clearTimeout(timer)
  }, [props.focusKey])

  useKeyboardShortcuts([
    {
      key: 'y',
      ctrl: true,
      handler: () => {
        if (props.hasCopyableYesterdayFields) props.onCopyYesterday()
      },
    },
    {
      key: 't',
      ctrl: true,
      handler: () => {
        if (props.hasFillableTargetFields) props.onFillTarget()
      },
    },
  ])

  const coreFields: RecordField[] = [
    {
      key: 'weight',
      label: `体重 ${weightDefinition.unit}`,
      value: weightRecord?.value,
      inputStep: '0.1',
      kind: 'decimal',
      range: { min: weightDefinition.min, max: weightDefinition.max },
      quickStep: 0.1,
      quickStepLabel: '0.1',
      onChange: (value) => props.onUpdateBodyRecord('weight', value),
      footerLeading: weightStatus ? <Badge tone={weightStatus.tone}>{weightStatus.label}</Badge> : undefined,
      className: 'col-span-2 sm:col-span-1',
    },
    {
      key: 'calories',
      label: '热量 kcal',
      value: props.selectedLog.calories,
      inputStep: '1',
      kind: 'integer',
      range: { min: 0, max: 10000, allowZero: true },
      quickStep: 100,
      quickStepLabel: '100',
      onChange: (value) => props.onUpdateDailyLog({ calories: value }),
    },
    {
      key: 'protein',
      label: '蛋白质 g',
      value: props.selectedLog.protein,
      inputStep: '1',
      kind: 'integer',
      range: { min: 0, max: 500, allowZero: true },
      quickStep: 10,
      quickStepLabel: '10',
      onChange: (value) => props.onUpdateDailyLog({ protein: value }),
    },
  ]

  const supplementaryFields: RecordField[] = [
    {
      key: 'steps',
      label: '步数',
      value: props.selectedLog.steps,
      inputStep: '1',
      kind: 'integer',
      range: { min: 0, max: 100000, allowZero: true },
      quickStep: 1000,
      quickStepLabel: '1000',
      onChange: (value) => props.onUpdateDailyLog({ steps: value }),
    },
    {
      key: 'sleep',
      label: '睡眠 h',
      value: props.selectedLog.sleepHours,
      inputStep: '0.1',
      kind: 'decimal',
      range: { min: 0, max: 24, allowZero: true },
      quickStep: 0.5,
      quickStepLabel: '0.5',
      onChange: (value) => props.onUpdateDailyLog({ sleepHours: value }),
    },
    {
      key: 'fatigue',
      label: `疲劳 ≤${props.fatigueThreshold}`,
      value: props.selectedLog.fatigueScore,
      inputStep: '1',
      kind: 'integer',
      range: { min: 0, max: 10, allowZero: true },
      quickStep: 1,
      quickStepLabel: '1',
      onChange: (value) => props.onUpdateDailyLog({ fatigueScore: value }),
    },
  ]

  const renderField = (field: RecordField, index: number) => (
    <div
      key={field.key}
      data-daily-focus={field.key}
      style={{ '--motion-index': Math.min(index, 3) } as CSSProperties}
      className={`${field.className ?? ''} ${fieldFocusClass(props.focusKey === field.key)}`}
    >
      <QuickAdjustNumberField
        className={quickFieldClass}
        label={field.label}
        value={field.value}
        inputStep={field.inputStep}
        kind={field.kind}
        range={field.range}
        quickStep={field.quickStep}
        quickStepLabel={field.quickStepLabel}
        footerLeading={field.footerLeading}
        onChange={field.onChange}
      />
    </div>
  )

  return (
    <section className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">关键记录</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">体重、热量和蛋白质</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span role="status" aria-live="polite" aria-atomic="true">
            <Badge tone={completion.completed === completion.total ? 'positive' : completion.completed > 0 ? 'warning' : 'neutral'}>
              关键记录 {completion.completed}/{completion.total}
            </Badge>
          </span>
          {showSaveStatus ? (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400" role="status" aria-live="polite">
              {getDailySaveLabel(props.syncState, props.savePending, props.lastSyncedLabel)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="motion-list mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {coreFields.map(renderField)}
      </div>

      <DisclosurePanel
        className="mt-3 sm:hidden"
        title="补充记录"
        open={supplementaryOpen}
        onOpenChange={setSupplementaryOpen}
        contentClassName="motion-list grid gap-3 border-t border-[var(--surface-border)] p-3 dark:border-slate-700"
      >
        {supplementaryFields.map(renderField)}
      </DisclosurePanel>

      <section className="mt-4 hidden border-t border-[var(--surface-border)] pt-4 dark:border-slate-700 sm:block" aria-labelledby="supplementary-record-heading">
        <h4 id="supplementary-record-heading" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          补充记录
        </h4>
        <div className="motion-list mt-3 grid grid-cols-3 gap-3">
          {supplementaryFields.map(renderField)}
        </div>
      </section>

      {(props.hasCopyableYesterdayFields || props.hasFillableTargetFields) ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            className="w-full px-2 text-xs shadow-none sm:text-sm"
            disabled={!props.hasCopyableYesterdayFields}
            onClick={props.onCopyYesterday}
            title={props.hasCopyableYesterdayFields ? '快捷键: Ctrl+Y' : undefined}
          >
            补入昨天空值
          </Button>
          <Button
            variant="secondary"
            className="w-full px-2 text-xs shadow-none sm:text-sm"
            disabled={!props.hasFillableTargetFields}
            onClick={props.onFillTarget}
            title={props.hasFillableTargetFields ? '快捷键: Ctrl+T' : undefined}
          >
            填入目标
          </Button>
        </div>
      ) : null}
    </section>
  )
}
