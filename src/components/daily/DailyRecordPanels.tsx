import type { DailyLog, WorkoutLog } from '../../types'
import { MiniCalendar } from '../MiniCalendar'

export function DailyCalendarPanel({
  selectedDate,
  today,
  dailyLogs,
  workoutLogs,
  onSelectDate,
  className = '',
}: {
  selectedDate: string
  today: string
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  onSelectDate: (date: string) => void
  className?: string
}) {
  return (
    <div className={className}>
      <MiniCalendar
        key={selectedDate}
        selectedDate={selectedDate}
        today={today}
        dailyLogs={dailyLogs}
        workoutLogs={workoutLogs}
        onSelectDate={onSelectDate}
      />
    </div>
  )
}
