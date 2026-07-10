import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { TextInput } from './ui'

export type NumberRange = {
  min?: number
  max?: number
  allowZero?: boolean
}

type NumberKind = 'decimal' | 'integer'

function displayNumber(value: number | undefined): string {
  return value === undefined ? '' : String(value)
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = '1',
  range,
  kind = 'integer',
  inputRef,
  className,
  labelAction,
  showControls = true,
}: {
  label: string
  value?: number
  onChange: (value: number | undefined) => void
  min?: number
  max?: number
  step?: string
  range?: NumberRange
  kind?: NumberKind
  inputRef?: (el: HTMLInputElement | null) => void
  className?: string
  labelAction?: ReactNode
  showControls?: boolean
}) {
  const effectiveRange: NumberRange | undefined =
    range ?? (min !== undefined || max !== undefined ? { min, max, allowZero: min === 0 } : undefined)
  const inputMode = kind === 'decimal' ? 'decimal' : 'numeric'
  const pattern = kind === 'decimal' ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'
  const [rawValue, setRawValue] = useState(displayNumber(value))
  const [outOfRange, setOutOfRange] = useState(false)
  const stepValue = Number(step)
  const inputId = useId()
  const errorId = `${inputId}-error`

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const display = displayNumber(value)
      setRawValue((current) => {
        const parsed = Number(current)
        if (current.trim() !== '' && Number.isFinite(parsed) && parsed === value) {
          return current
        }
        return display
      })
      if (value !== undefined) setOutOfRange(false)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [value])

  const increment = () => {
    const newValue = (value ?? 0) + stepValue
    if (effectiveRange?.max !== undefined && newValue > effectiveRange.max) return
    onChange(newValue)
  }

  const decrement = () => {
    const newValue = (value ?? 0) - stepValue
    if (effectiveRange?.min !== undefined && newValue < effectiveRange.min) return
    onChange(newValue)
  }

  const handleChange = (next: string) => {
    setRawValue(next)
    if (next.trim() === '') {
      setOutOfRange(false)
      onChange(undefined)
      return
    }
    // 逗号小数点规范化（例如 "1,5" → "1.5"）
    const normalized = next.trim().replace(',', '.')
    const parsed = Number(normalized)
    if (!Number.isFinite(parsed)) {
      setOutOfRange(true)
      return
    }
    if (kind === 'integer' && !Number.isInteger(parsed)) {
      setOutOfRange(true)
      return
    }
    if (effectiveRange) {
      if (effectiveRange.min !== undefined && parsed < effectiveRange.min) {
        setOutOfRange(true)
        return
      }
      if (effectiveRange.max !== undefined && parsed > effectiveRange.max) {
        setOutOfRange(true)
        return
      }
    }
    setOutOfRange(false)
    onChange(parsed)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      increment()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      decrement()
    }
  }

  const rangeHint =
    effectiveRange && (effectiveRange.min !== undefined || effectiveRange.max !== undefined)
      ? effectiveRange.min !== undefined && effectiveRange.max !== undefined
        ? `请输入 ${effectiveRange.min}-${effectiveRange.max} 之间的数值`
        : effectiveRange.max !== undefined
          ? `不能超过 ${effectiveRange.max}`
          : effectiveRange.allowZero
            ? `请输入 0 或 ${effectiveRange.min} 以上的数值`
            : `不能低于 ${effectiveRange.min}`
      : '请输入有效数字'

  return (
    <div className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
      <label htmlFor={inputId} className="min-w-0">
        {label}
      </label>
      <div className="relative flex items-center gap-1">
        {showControls && (
          <button
            type="button"
            onClick={decrement}
            disabled={effectiveRange?.min !== undefined && (value ?? 0) <= effectiveRange.min}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={`减少${label}`}
          >
            −
          </button>
        )}
        <TextInput
          id={inputId}
          type="text"
          inputMode={inputMode}
          pattern={pattern}
          value={rawValue}
          data-min={min}
          data-max={max}
          data-step={step}
          ref={(el) => {
            if (inputRef) inputRef(el)
          }}
          aria-invalid={outOfRange}
          aria-describedby={outOfRange ? errorId : undefined}
          className={`${outOfRange ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-500 dark:focus:border-rose-400 dark:focus:ring-rose-900/40' : ''} ${className ?? ''}`}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {showControls && (
          <button
            type="button"
            onClick={increment}
            disabled={effectiveRange?.max !== undefined && (value ?? 0) >= effectiveRange.max}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={`增加${label}`}
          >
            +
          </button>
        )}
      </div>
      {labelAction ? <div className="flex justify-end">{labelAction}</div> : null}
      {outOfRange ? (
        <span id={errorId} className="text-xs font-semibold leading-5 text-rose-600 dark:text-rose-400" role="alert">
          {rangeHint}
        </span>
      ) : null}
    </div>
  )
}

function clampNumber(value: number, range: NumberRange | undefined): number {
  if (range?.min !== undefined && value < range.min) return range.min
  if (range?.max !== undefined && value > range.max) return range.max
  return value
}

export function QuickAdjustNumberField({
  label,
  value,
  onChange,
  range,
  kind = 'integer',
  inputStep = '1',
  quickStep,
  quickStepLabel,
  className,
  footerLeading,
}: {
  label: string
  value?: number
  onChange: (value: number | undefined) => void
  range?: NumberRange
  kind?: NumberKind
  inputStep?: string
  quickStep: number
  quickStepLabel: string
  className?: string
  footerLeading?: ReactNode
}) {
  const adjust = (direction: -1 | 1) => {
    if (value === undefined) return
    const nextValue = value + (quickStep * direction)
    const normalized = kind === 'integer'
      ? Math.round(nextValue)
      : Math.round(nextValue * 10) / 10
    onChange(clampNumber(normalized, range))
  }
  const disabled = value === undefined
  const buttonClass =
    'h-11 min-w-11 border-l border-[var(--surface-border)] px-2 text-sm font-semibold leading-none text-slate-600 transition-colors first:border-l-0 hover:bg-white hover:text-[var(--color-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-cyan-100 dark:focus-visible:ring-cyan-500/40 dark:disabled:text-slate-600'

  return (
    <NumberField
      className={className}
      label={label}
      value={value}
      step={inputStep}
      kind={kind}
      range={range}
      showControls={false}
      labelAction={
        <div className="flex w-full min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">{footerLeading}</div>
          <div
            className="inline-flex shrink-0 overflow-hidden rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)] dark:border-slate-700 dark:bg-slate-900"
            aria-label={`${label} 快捷微调`}
          >
            <button
              type="button"
              className={buttonClass}
              disabled={disabled}
              title={disabled ? '先输入数值后可微调' : `减少 ${quickStepLabel}`}
              aria-label={`${label} 减少 ${quickStepLabel}`}
              onClick={() => adjust(-1)}
            >
              −{quickStepLabel}
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={disabled}
              title={disabled ? '先输入数值后可微调' : `增加 ${quickStepLabel}`}
              aria-label={`${label} 增加 ${quickStepLabel}`}
              onClick={() => adjust(1)}
            >
              +{quickStepLabel}
            </button>
          </div>
        </div>
      }
      onChange={onChange}
    />
  )
}
