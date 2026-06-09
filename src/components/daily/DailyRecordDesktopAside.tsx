import type { DailyLog, WorkoutLog } from '../../types'
import { DailyCalendarPanel, MeasurementPanel } from './DailyRecordPanels'

export function DailyRecordDesktopAside({
  selectedDate,
  today,
  selectedLog,
  previousLogs,
  dailyLogs,
  workoutLogs,
  onSelectDate,
  onUpdateDailyLog,
}: {
  selectedDate: string
  today: string
  selectedLog: Partial<DailyLog>
  previousLogs: DailyLog[]
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  onSelectDate: (date: string) => void
  onUpdateDailyLog: (patch: Partial<DailyLog>) => void
}) {
  return (
    <aside className="hidden lg:block lg:self-stretch">
      <div data-daily-record-desktop-aside className="sticky top-20 grid gap-3">
        <DailyCalendarPanel
          className="mt-0"
          selectedDate={selectedDate}
          today={today}
          dailyLogs={dailyLogs}
          workoutLogs={workoutLogs}
          onSelectDate={onSelectDate}
        />
        <MeasurementPanel
          className="mt-0"
          compact
          selectedLog={selectedLog}
          previousLogs={previousLogs}
          onUpdateDailyLog={onUpdateDailyLog}
        />
      </div>
    </aside>
  )
}
