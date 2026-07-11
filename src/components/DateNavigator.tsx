import type { ReactNode } from 'react'
import { addDays } from '../lib/dates'
import { Button, Field, TextInput } from './ui'

function IsoDateInput({
  value,
  max,
  className,
  ariaLabel,
  onChange,
}: {
  value: string
  max: string
  className: string
  ariaLabel?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <TextInput
        type="date"
        lang="en-CA"
        aria-label={ariaLabel}
        className={`${className} text-transparent caret-transparent dark:text-transparent`}
        value={value}
        max={max}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="pointer-events-none absolute inset-y-0 left-3 right-11 flex items-center text-sm tabular-nums text-slate-800 dark:text-slate-100" aria-hidden="true">
        {value}
      </span>
    </div>
  )
}

export function DateNavigator({
  selectedDate,
  today,
  onChange,
  density = 'default',
  footer,
}: {
  selectedDate: string
  today: string
  onChange: (date: string) => void
  density?: 'default' | 'compact' | 'toolbar'
  footer?: ReactNode
}) {
  const isToday = selectedDate === today
  const isFuture = selectedDate >= today

  if (density === 'toolbar') {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          className="min-h-11 min-w-11 px-2"
          onClick={() => onChange(addDays(selectedDate, -1))}
          aria-label="前一天"
        >
          ‹
        </Button>
        <div className="min-w-40 flex-1 sm:max-w-48">
          <IsoDateInput
          ariaLabel="日期"
          className="h-11"
          value={selectedDate}
          max={today}
          onChange={onChange}
          />
        </div>
        <Button
          variant="secondary"
          className="min-h-11 min-w-11 px-2"
          onClick={() => onChange(addDays(selectedDate, 1))}
          disabled={isFuture}
          aria-label="后一天"
        >
          ›
        </Button>
        <Button
          variant="ghost"
          className="min-h-11 px-3"
          onClick={() => onChange(today)}
          disabled={isToday}
        >
          今天
        </Button>
        {footer ? <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">{footer}</div> : null}
      </div>
    )
  }

  if (density === 'compact') {
    return (
      <div className="grid gap-2">
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-1">
          <Button
            variant="secondary"
            className="min-h-11 min-w-11 px-2"
            onClick={() => onChange(addDays(selectedDate, -1))}
            aria-label="前一天"
          >
            ‹
          </Button>
          <IsoDateInput
            ariaLabel="日期"
            className="h-11 min-w-0"
            value={selectedDate}
            max={today}
            onChange={onChange}
          />
          <Button
            variant="secondary"
            className="min-h-11 min-w-11 px-2"
            onClick={() => onChange(addDays(selectedDate, 1))}
            disabled={isFuture}
            aria-label="后一天"
          >
            ›
          </Button>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <Button
            variant="secondary"
            className="min-h-11 px-3 shadow-none"
            onClick={() => onChange(today)}
            disabled={isToday}
          >
            今天
          </Button>
          {footer}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-end">
      <Field label="日期" className="sm:min-w-48">
        <IsoDateInput className="h-10 sm:h-11" value={selectedDate} max={today} onChange={onChange} />
      </Field>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-1 sm:flex">
        <Button
          variant="secondary"
          className="min-h-10 min-w-11 px-2 sm:min-h-11"
          onClick={() => onChange(addDays(selectedDate, -1))}
          aria-label="前一天"
        >
          ‹
        </Button>
        <Button
          variant="secondary"
          className="min-h-10 px-3 sm:min-h-11"
          onClick={() => onChange(today)}
          disabled={isToday}
        >
          今天
        </Button>
        <Button
          variant="secondary"
          className="min-h-10 min-w-11 px-2 sm:min-h-11"
          onClick={() => onChange(addDays(selectedDate, 1))}
          disabled={isFuture}
          aria-label="后一天"
        >
          ›
        </Button>
      </div>
      {footer}
    </div>
  )
}
