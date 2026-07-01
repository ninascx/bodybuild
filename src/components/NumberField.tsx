import { useEffect, useState, useRef } from 'react'
import type { ReactNode } from 'react'
import { Field, TextInput } from './ui'

export type NumberRange = {
  min?: number
  max?: number
  allowZero?: boolean
}

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
  kind?: 'decimal' | 'integer'
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
  const localInputRef = useRef<HTMLInputElement | null>(null)
  const stepValue = Number(step)

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

  const handleWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    if (document.activeElement === localInputRef.current) {
      event.preventDefault()
      if (event.deltaY < 0) {
        increment()
      } else {
        decrement()
      }
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
    <Field label={label} error={outOfRange ? rangeHint : undefined} labelAction={labelAction}>
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
          type="text"
          inputMode={inputMode}
          pattern={pattern}
          value={rawValue}
          data-min={min}
          data-max={max}
          data-step={step}
          ref={(el) => {
            localInputRef.current = el
            if (inputRef) inputRef(el)
          }}
          aria-invalid={outOfRange}
          className={`${outOfRange ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-500 dark:focus:border-rose-400 dark:focus:ring-rose-900/40' : ''} ${className ?? ''}`}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onWheel={handleWheel}
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
    </Field>
  )
}
