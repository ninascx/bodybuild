import { Card, DisclosurePanel } from '../components/ui'
import { DateNavigator } from '../components/DateNavigator'
import { QuickRecordSection } from '../components/QuickRecordSection'
import { DailyCalendarPanel, MeasurementPanel } from '../components/daily/DailyRecordPanels'
import { addDays } from '../lib/dates'
import { useSwipe } from '../hooks/useSwipe'
import { useMemo, useState, type ComponentProps } from 'react'
import type { DailyLog, DailyTarget, WorkoutLog } from '../types'
import type { SyncState } from '../lib/storage'
import type { DailyFocusKey } from '../lib/productFlow'

function targetCalories(target: DailyTarget): number | undefined {
  if (target.calories !== undefined) return target.calories
  return target.calorieRange?.[1]
}

const visibleDailyFieldKeys: DailyFocusKey[] = ['weight', 'calories', 'protein', 'steps', 'sleep', 'fatigue']
const defaultDailyPriorityKeys: DailyFocusKey[] = ['weight', 'calories', 'protein']

function normalizePriorityKeys(priorityKeys: DailyFocusKey[] | undefined, focusKey: DailyFocusKey | undefined) {
  const keys = [...(focusKey ? [focusKey] : []), ...(priorityKeys ?? [])]
  const normalized = keys.filter((key, index) => visibleDailyFieldKeys.includes(key) && keys.indexOf(key) === index)
  return normalized.length > 0 ? normalized : defaultDailyPriorityKeys
}

type QuickRecordSectionProps = ComponentProps<typeof QuickRecordSection>

function StableQuickRecordSection(props: QuickRecordSectionProps) {
  const [stablePriorityKeys] = useState(() => normalizePriorityKeys(props.priorityKeys, props.focusKey))

  return <QuickRecordSection {...props} priorityKeys={stablePriorityKeys} />
}

type DailyRecordTabProps = {
  selectedDate: string
  today: string
  selectedLog: Partial<DailyLog> & { date: string }
  selectedTarget: DailyTarget
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  syncState: SyncState
  savePending: boolean
  lastSyncedLabel: string
  sleepFloorHours: number
  fatigueThreshold: number
  onDateChange: (date: string) => void
  onUpdateDailyLog: (patch: Partial<DailyLog>) => void
  onQuickAction: (patch: Partial<DailyLog>) => void
  focusKey?: DailyFocusKey
  priorityKeys?: DailyFocusKey[]
  onFocusConsumed?: () => void
}

export function DailyRecordTab(props: DailyRecordTabProps) {
  const swipeHandlers = useSwipe((direction) => {
    const nextDate = direction === 'left'
      ? addDays(props.selectedDate, 1)
      : addDays(props.selectedDate, -1)
    props.onDateChange(nextDate)
  })

  const yesterday = addDays(props.selectedDate, -1)
  const yesterdayLog = props.dailyLogs.find((log) => log.date === yesterday)

  const calorieTarget = targetCalories(props.selectedTarget)

  const previousLogs = useMemo(
    () => props.dailyLogs
      .filter((log) => log.date < props.selectedDate)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [props.dailyLogs, props.selectedDate]
  )

  const copyYesterdayQuickFields = () => {
    if (!yesterdayLog) return
    props.onQuickAction({
      morningWeightKg: yesterdayLog.morningWeightKg,
      calories: yesterdayLog.calories,
      protein: yesterdayLog.protein,
      steps: yesterdayLog.steps,
      sleepHours: yesterdayLog.sleepHours,
      fatigueScore: yesterdayLog.fatigueScore,
    })
  }
  const fillTargetQuickFields = () => {
    const patch: Partial<DailyLog> = {}
    if (props.selectedLog.calories === undefined && calorieTarget !== undefined) patch.calories = calorieTarget
    if (props.selectedLog.protein === undefined) patch.protein = props.selectedTarget.protein
    if (props.selectedLog.steps === undefined) patch.steps = props.selectedTarget.stepTarget
    if (props.selectedLog.sleepHours === undefined) patch.sleepHours = props.sleepFloorHours
    if (Object.keys(patch).length === 0) return
    props.onQuickAction(patch)
  }
  const hasFillableTargetQuickFields =
    (props.selectedLog.calories === undefined && calorieTarget !== undefined) ||
    props.selectedLog.protein === undefined ||
    props.selectedLog.steps === undefined ||
    props.selectedLog.sleepHours === undefined
  return (
    <Card {...swipeHandlers} className="space-y-3 border-0 bg-transparent p-0 shadow-none dark:bg-transparent sm:space-y-4 md:border-[var(--surface-border)] md:bg-[var(--surface-panel)] md:p-4 md:dark:border-slate-800 md:dark:bg-slate-900">
      <section className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] px-3 py-2 dark:border-slate-800 dark:bg-slate-900 md:bg-[var(--surface-muted)] md:p-3 md:dark:bg-slate-800/70">
        <div className="min-w-0">
          <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 md:text-sm md:font-semibold md:text-slate-950 md:dark:text-slate-50">记录日期</p>
          <DateNavigator selectedDate={props.selectedDate} today={props.today} onChange={props.onDateChange} />
        </div>
      </section>

      <StableQuickRecordSection
        key={props.selectedDate}
        selectedLog={props.selectedLog}
        selectedTarget={props.selectedTarget}
        yesterdayLog={yesterdayLog}
        calorieTarget={calorieTarget}
        fatigueThreshold={props.fatigueThreshold}
        syncState={props.syncState}
        savePending={props.savePending}
        lastSyncedLabel={props.lastSyncedLabel}
        onUpdateDailyLog={props.onUpdateDailyLog}
        onQuickAction={props.onQuickAction}
        onCopyYesterday={copyYesterdayQuickFields}
        onFillTarget={fillTargetQuickFields}
        hasFillableTargetFields={hasFillableTargetQuickFields}
        focusKey={props.focusKey}
        priorityKeys={props.priorityKeys}
        onFocusConsumed={props.onFocusConsumed}
      />

      <DisclosurePanel title="日历与补充详情" contentClassName="grid gap-3" open={true}>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">日历和围度放在这里，避免打断今日录入。</p>
        <DailyCalendarPanel
          selectedDate={props.selectedDate}
          today={props.today}
          dailyLogs={props.dailyLogs}
          workoutLogs={props.workoutLogs}
          onSelectDate={props.onDateChange}
        />

        <MeasurementPanel
          selectedLog={props.selectedLog}
          previousLogs={previousLogs}
          onUpdateDailyLog={props.onUpdateDailyLog}
        />
      </DisclosurePanel>
    </Card>
  )
}
