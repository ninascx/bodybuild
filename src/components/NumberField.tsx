import { useEffect, useState } from 'react'
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
  helper,
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
  helper?: ReactNode
}) {
  const effectiveRange: NumberRange | undefined =
    range ?? (min !== undefined || max !== undefined ? { min, max, allowZero: min === 0 } : undefined)
  const inputMode = kind === 'decimal' ? 'decimal' : 'numeric'
  const pattern = kind === 'decimal' ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'
  const [rawValue, setRawValue] = useState(displayNumber(value))
  const [outOfRange, setOutOfRange] = useState(false)

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

  const rangeHint =
    effectiveRange && (effectiveRange.min !== undefined || effectiveRange.max !== undefined)
      ? `应在 ${effectiveRange.min ?? '负无穷'}${effectiveRange.max !== undefined ? `-${effectiveRange.max}` : '+'} 之间`
      : '请输入有效数字'

  return (
    <Field label={label} helper={helper} error={outOfRange ? rangeHint : undefined} labelAction={labelAction}>
      <TextInput
        type="text"
        inputMode={inputMode}
        pattern={pattern}
        value={rawValue}
        data-min={min}
        data-max={max}
        data-step={step}
        ref={inputRef}
        aria-invalid={outOfRange}
        className={`${outOfRange ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-500 dark:focus:border-rose-400 dark:focus:ring-rose-900/40' : ''} ${className ?? ''}`}
        onChange={(event) => handleChange(event.target.value)}
      />
    </Field>
  )
}
