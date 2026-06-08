import { addDays } from '../../lib/dates'
import { Button, Field, TextInput } from '../ui'

export function WorkoutDateControls({
  selectedDate,
  today,
  onDateChange,
}: {
  selectedDate: string
  today: string
  onDateChange: (date: string) => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(9.5rem,10rem)_repeat(3,4.75rem)]">
      <Field label="训练日期">
        <TextInput
          type="date"
          value={selectedDate}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </Field>
      <div className="grid grid-cols-3 gap-1 self-end sm:contents">
        <Button
          variant="secondary"
          className="min-h-10 whitespace-nowrap px-2 text-xs"
          onClick={() => onDateChange(addDays(selectedDate, -1))}
        >
          前一天
        </Button>
        <Button
          variant="secondary"
          className="min-h-10 whitespace-nowrap px-2 text-xs"
          onClick={() => onDateChange(today)}
          disabled={selectedDate === today}
        >
          今天
        </Button>
        <Button
          variant="secondary"
          className="min-h-10 whitespace-nowrap px-2 text-xs"
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          disabled={selectedDate >= today}
        >
          后一天
        </Button>
      </div>
    </div>
  )
}
