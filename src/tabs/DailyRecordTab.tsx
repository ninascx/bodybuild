import { Badge, Card, DisclosurePanel } from '../components/ui'
import { DateNavigator } from '../components/DateNavigator'
import { MiniCalendar } from '../components/MiniCalendar'
import { QuickRecordSection } from '../components/QuickRecordSection'
import { DailyRecordDesktopAside } from '../components/daily/DailyRecordDesktopAside'
import { DailyRecordToolbar } from '../components/daily/DailyRecordToolbar'
import { DailyCalendarPanel, DailyMeasurementCard, MeasurementPanel } from '../components/daily/DailyRecordPanels'
import { getDailySaveLabel } from '../components/daily/dailyRecordStatus'
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

function syncTone(syncState: SyncState, savePending: boolean): 'positive' | 'warning' | 'danger' {
  if (savePending || syncState === 'saving' || syncState === 'loading') return 'warning'
  if (syncState === 'offline') return 'danger'
  return 'positive'
}

function DailyRecordDesktopDateRail({
  selectedDate,
  today,
  dailyLogs,
  workoutLogs,
  syncState,
  savePending,
  lastSyncedLabel,
  onDateChange,
}: {
  selectedDate: string
  today: string
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  syncState: SyncState
  savePending: boolean
  lastSyncedLabel: string
  onDateChange: (date: string) => void
}) {
  return (
    <aside className="hidden lg:block lg:self-start">
      <div className="sticky top-20 grid max-h-[calc(100vh-6rem)] gap-3 overflow-y-auto pr-1">
        <section className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">记录日期</p>
          <div className="mt-2">
            <DateNavigator selectedDate={selectedDate} today={today} onChange={onDateChange} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--surface-border)] pt-3 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400">保存状态</span>
            <Badge tone={syncTone(syncState, savePending)} className="justify-center">
              {getDailySaveLabel(syncState, savePending, lastSyncedLabel)}
            </Badge>
          </div>
          {syncState === 'offline' ? (
            <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">将在联网后自动同步</p>
          ) : null}
        </section>

        <MiniCalendar
          selectedDate={selectedDate}
          today={today}
          dailyLogs={dailyLogs}
          workoutLogs={workoutLogs}
          onSelectDate={onDateChange}
          density="compact"
        />
      </div>
    </aside>
  )
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
  xunjiSyncPending: boolean
  sleepFloorHours: number
  fatigueThreshold: number
  onDateChange: (date: string) => void
  onUpdateDailyLog: (patch: Partial<DailyLog>) => void
  onQuickAction: (patch: Partial<DailyLog>) => void
  onSyncFromXunji: () => void
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
      <div className="lg:hidden">
        <DailyRecordToolbar
          selectedDate={props.selectedDate}
          today={props.today}
          syncState={props.syncState}
          savePending={props.savePending}
          lastSyncedLabel={props.lastSyncedLabel}
          xunjiSyncPending={props.xunjiSyncPending}
          onDateChange={props.onDateChange}
          onSyncFromXunji={props.onSyncFromXunji}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[17.5rem_minmax(0,1fr)_19rem] lg:items-start">
        <DailyRecordDesktopDateRail
          selectedDate={props.selectedDate}
          today={props.today}
          dailyLogs={props.dailyLogs}
          workoutLogs={props.workoutLogs}
          syncState={props.syncState}
          savePending={props.savePending}
          lastSyncedLabel={props.lastSyncedLabel}
          onDateChange={props.onDateChange}
        />

        <main className="grid min-w-0 gap-3">
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
            showSaveStatus={false}
            onUpdateDailyLog={props.onUpdateDailyLog}
            onQuickAction={props.onQuickAction}
            onCopyYesterday={copyYesterdayQuickFields}
            onFillTarget={fillTargetQuickFields}
            hasFillableTargetFields={hasFillableTargetQuickFields}
            focusKey={props.focusKey}
            priorityKeys={props.priorityKeys}
            onFocusConsumed={props.onFocusConsumed}
          />

          <DailyMeasurementCard
            className="hidden lg:block"
            selectedLog={props.selectedLog}
            previousLogs={previousLogs}
            onUpdateDailyLog={props.onUpdateDailyLog}
          />
        </main>

        <DailyRecordDesktopAside
          selectedDate={props.selectedDate}
          selectedLog={props.selectedLog}
          previousLogs={previousLogs}
          dailyLogs={props.dailyLogs}
          workoutLogs={props.workoutLogs}
          xunjiSyncPending={props.xunjiSyncPending}
          onSelectDate={props.onDateChange}
          onSyncFromXunji={props.onSyncFromXunji}
          onUpdateDailyLog={props.onUpdateDailyLog}
        />
      </div>

      <DisclosurePanel className="lg:hidden" title="日历与补充详情" contentClassName="grid gap-3" open={true}>
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
