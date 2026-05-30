import { addDays } from '../lib/dates'
import { Button, Field, TextInput } from './ui'

export function DateNavigator({
  selectedDate,
  today,
  onChange,
}: {
  selectedDate: string
  today: string
  onChange: (date: string) => void
}) {
  const isToday = selectedDate === today
  const isFuture = selectedDate >= today
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="日期">
        <TextInput type="date" value={selectedDate} max={today} onChange={(event) => onChange(event.target.value)} />
      </Field>
      <div className="flex gap-1">
        <Button
          variant="secondary"
          className="min-w-11 px-2"
          onClick={() => onChange(addDays(selectedDate, -1))}
          aria-label="前一天"
        >
          ‹
        </Button>
        <Button
          variant="secondary"
          className="px-3"
          onClick={() => onChange(today)}
          disabled={isToday}
        >
          今天
        </Button>
        <Button
          variant="secondary"
          className="min-w-11 px-2"
          onClick={() => onChange(addDays(selectedDate, 1))}
          disabled={isFuture}
          aria-label="后一天"
        >
          ›
        </Button>
      </div>
    </div>
  )
}
