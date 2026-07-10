import type { ReactNode } from 'react'
import { addDays } from '../lib/dates'
import { Button, Field, TextInput } from './ui'

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
  density?: 'default' | 'compact'
  footer?: ReactNode
}) {
  const isToday = selectedDate === today
  const isFuture = selectedDate >= today

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
          <TextInput
            type="date"
            aria-label="日期"
            className="h-11 min-w-0"
            value={selectedDate}
            max={today}
            onChange={(event) => onChange(event.target.value)}
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
        <TextInput type="date" className="h-10 sm:h-11" value={selectedDate} max={today} onChange={(event) => onChange(event.target.value)} />
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
