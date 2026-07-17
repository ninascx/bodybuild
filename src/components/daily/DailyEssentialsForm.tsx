import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import type { BodyMetricType, BodyRecord, DailyLog, DailyTarget } from '../../types'
import type { DailyFocusKey } from '../../lib/productFlow'
import { bodyMetricDefinition } from '../../lib/bodyMetrics'
import { Badge, Button } from '../ui'
import { QuickAdjustNumberField, type NumberRange } from '../NumberField'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { getBodyRecordStatus } from './bodyRecordStatus'
import { keyRecordState } from './dailyRecordActions'

export type DailyEssentialsFormProps = {
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
  nextActionLabel?: string
  onNextAction?: () => void
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
    ? 'rounded-lg bg-[var(--surface-selected)] p-2 ring-2 ring-[var(--color-primary-100)] dark:bg-cyan-950/20 dark:ring-cyan-700/40'
    : ''
}

export function DailyEssentialsForm(props: DailyEssentialsFormProps) {
  const weightRecord = props.selectedBodyRecords.find((record) => record.type === 'weight')
  const weightDefinition = bodyMetricDefinition('weight')
  const weightStatus = weightRecord ? getBodyRecordStatus(weightRecord) : undefined
  const keyStatus = keyRecordState({
    weight: weightRecord?.value,
    calories: props.selectedLog.calories,
    protein: props.selectedLog.protein,
  })
  const [supplementaryOpen, setSupplementaryOpen] = useState(
    () => Boolean(props.focusKey && supplementaryKeys.includes(props.focusKey)),
  )
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
      className={`${field.className ?? ''} ${fieldFocusClass(
        props.focusKey === field.key || (!props.focusKey && keyStatus.firstMissing?.key === field.key),
      )}`}
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
        controlPlacement="inline"
        footerLeading={field.footerLeading}
        onChange={field.onChange}
      />
    </div>
  )

  const complete = keyStatus.completed === keyStatus.total
  const nextStepMessage = keyStatus.firstMissing
    ? `先补充${keyStatus.firstMissing.label}，完成后会自动保存。`
    : props.nextActionLabel
      ? '三项关键数据已齐，可以继续记录训练。'
      : '三项关键数据已齐，今天的核心记录已完成。'

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--surface-border-strong)] bg-[var(--surface-panel)] dark:border-slate-700 dark:bg-slate-900">
      <div className="bg-teal-950 px-4 py-4 text-white dark:bg-cyan-950 sm:px-5 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-teal-100 dark:text-cyan-100">关键记录</p>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
            {keyStatus.completed}/{keyStatus.total}
          </span>
        </div>
        <div className="mt-2" role="status" aria-live="polite" aria-atomic="true">
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{keyStatus.title}</h2>
          <p className="mt-1 text-sm leading-6 text-teal-100 dark:text-cyan-100">体重、热量和蛋白质，输入后自动保存。</p>
        </div>
        <div
          className="mt-4 grid grid-cols-3 gap-2"
          role="progressbar"
          aria-label="关键记录完成进度"
          aria-valuemin={0}
          aria-valuemax={keyStatus.total}
          aria-valuenow={keyStatus.completed}
        >
          {keyStatus.items.map((item) => (
            <span
              key={item.key}
              className={`h-1.5 rounded-full ${item.value !== undefined ? 'bg-cyan-300' : 'bg-white/20'}`}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      <div className="px-3 py-4 sm:p-5">
        <div className="motion-list grid grid-cols-2 gap-3 sm:grid-cols-3">
          {coreFields.map(renderField)}
        </div>

        {(props.hasCopyableYesterdayFields || props.hasFillableTargetFields) ? (
          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--surface-border)] pt-3 dark:border-slate-700">
            {props.hasCopyableYesterdayFields ? (
              <Button
                variant="ghost"
                className="px-3 text-xs shadow-none sm:text-sm"
                onClick={props.onCopyYesterday}
                title="快捷键: Ctrl+Y"
              >
                补入昨天空值
              </Button>
            ) : null}
            {props.hasFillableTargetFields ? (
              <Button
                variant="ghost"
                className="px-3 text-xs shadow-none sm:text-sm"
                onClick={props.onFillTarget}
                title="快捷键: Ctrl+T"
              >
                填入目标值
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 rounded-lg bg-[var(--surface-muted)] p-3 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--color-primary-700)] dark:text-cyan-300">下一步</p>
            <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{nextStepMessage}</p>
          </div>
          {props.nextActionLabel && props.onNextAction ? (
            <Button className="w-full shrink-0 sm:w-auto" onClick={props.onNextAction}>
              {props.nextActionLabel}
            </Button>
          ) : complete ? (
            <span className="inline-flex min-h-9 shrink-0 items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <span aria-hidden="true">✓</span>
              核心记录完成
            </span>
          ) : null}
        </div>
      </div>

      <details
        open={supplementaryOpen}
        onToggle={(event) => setSupplementaryOpen(event.currentTarget.open)}
        className="group border-t border-[var(--surface-border)] dark:border-slate-700"
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary-500)] dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-cyan-500 sm:px-5">
          <span>
            补充记录
            <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">步数、睡眠、疲劳</span>
          </span>
          <svg className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-[var(--motion-base)] group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <div className="motion-list grid gap-3 border-t border-[var(--surface-border)] p-4 dark:border-slate-700 sm:grid-cols-3 sm:p-5">
          {supplementaryFields.map(renderField)}
        </div>
      </details>
    </section>
  )
}
