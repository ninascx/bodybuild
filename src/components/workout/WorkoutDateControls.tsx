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
    <div className="grid gap-2 sm:grid-cols-2 lg:w-80">
      <Field label="训练日期">
        <TextInput
          type="date"
          value={selectedDate}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </Field>
      <div className="grid grid-cols-3 gap-1 self-end">
        <Button
          variant="secondary"
          className="px-2 text-xs"
          onClick={() => onDateChange(addDays(selectedDate, -1))}
        >
          前一天
        </Button>
        <Button
          variant="secondary"
          className="px-2 text-xs"
          onClick={() => onDateChange(today)}
          disabled={selectedDate === today}
        >
          今天
        </Button>
        <Button
          variant="secondary"
          className="px-2 text-xs"
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          disabled={selectedDate >= today}
        >
          后一天
        </Button>
      </div>
    </div>
  )
}
