import { Badge, Button, Card, DisclosurePanel } from '../components/ui'
import { DateNavigator } from '../components/DateNavigator'
import { MiniCalendar } from '../components/MiniCalendar'
import { QuickRecordSection } from '../components/QuickRecordSection'
import { DailyNotesSection } from '../components/daily/DailyCheckInPanel'
import { DailyRecordDesktopAside } from '../components/daily/DailyRecordDesktopAside'
import { DailyRecordToolbar } from '../components/daily/DailyRecordToolbar'
import { DailyCalendarPanel } from '../components/daily/DailyRecordPanels'
import { buildCopyYesterdayPatch } from '../components/daily/dailyRecordActions'
import { getDailySaveLabel } from '../components/daily/dailyRecordStatus'
import { addDays } from '../lib/dates'
import { useSwipe } from '../hooks/useSwipe'
import { lazy, Suspense, useMemo } from 'react'
import type { BodyMetricType, BodyRecord, DailyLog, DailyTarget, WorkoutLog } from '../types'
import type { SyncState } from '../lib/storage'
import type { DailyFocusKey } from '../lib/productFlow'

const DailyMeasurementCard = lazy(() =>
  import('../components/daily/DailyBodyPanels').then((module) => ({ default: module.DailyMeasurementCard })),
)

function targetCalories(target: DailyTarget): number | undefined {
  if (target.calories !== undefined) return target.calories
  return target.calorieRange?.[1]
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
  xunjiSyncPending,
  onDateChange,
  onSyncFromXunji,
}: {
  selectedDate: string
  today: string
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  syncState: SyncState
  savePending: boolean
  lastSyncedLabel: string
  xunjiSyncPending: boolean
  onDateChange: (date: string) => void
  onSyncFromXunji: () => void
}) {
  return (
    <aside className="hidden self-start xl:block">
      <div className="sticky top-20 grid gap-3">
        <section className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">记录日期</p>
          <div className="mt-2">
            <DateNavigator selectedDate={selectedDate} today={today} onChange={onDateChange} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--surface-border)] pt-3 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400">保存状态</span>
            <span role="status" aria-live="polite" aria-atomic="true">
              <Badge tone={syncTone(syncState, savePending)} className="justify-center">
                {getDailySaveLabel(syncState, savePending, lastSyncedLabel)}
              </Badge>
            </span>
          </div>
          {syncState === 'offline' ? (
            <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">将在联网后自动同步</p>
          ) : null}
          <Button
            variant="secondary"
            className="mt-3 w-full shadow-none"
            loading={xunjiSyncPending}
            onClick={onSyncFromXunji}
          >
            从训记导入
          </Button>
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

type DailyRecordTabProps = {
  selectedDate: string
  today: string
  selectedLog: Partial<DailyLog> & { date: string }
  selectedBodyRecords: BodyRecord[]
  bodyRecords: BodyRecord[]
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
  onUpdateBodyRecord: (type: BodyMetricType, value: number | undefined) => void
  onQuickAction: (patch: Partial<DailyLog>, feedback?: string) => void
  onSyncFromXunji: () => void
  onSyncBodyToXunji: () => void
  focusKey?: DailyFocusKey
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
    const result = buildCopyYesterdayPatch(props.selectedLog, yesterdayLog)
    if (result.filledCount === 0) return
    const preservedMessage = result.preservedCount > 0 ? `，保留 ${result.preservedCount} 项现有值` : ''
    props.onQuickAction(result.patch, `已补入 ${result.filledCount} 项昨天记录${preservedMessage}。`)
  }
  const copyYesterdayPreview = buildCopyYesterdayPatch(props.selectedLog, yesterdayLog)
  const fillTargetQuickFields = () => {
    const patch: Partial<DailyLog> = {}
    if (props.selectedLog.calories === undefined && calorieTarget !== undefined) patch.calories = calorieTarget
    if (props.selectedLog.protein === undefined) patch.protein = props.selectedTarget.protein
    if (props.selectedLog.steps === undefined) patch.steps = props.selectedTarget.stepTarget
    if (props.selectedLog.sleepHours === undefined) patch.sleepHours = props.sleepFloorHours
    const filledCount = Object.keys(patch).length
    if (filledCount === 0) return
    props.onQuickAction(patch, `已填入 ${filledCount} 项目标值。`)
  }
  const hasFillableTargetQuickFields =
    (props.selectedLog.calories === undefined && calorieTarget !== undefined) ||
    props.selectedLog.protein === undefined ||
    props.selectedLog.steps === undefined ||
    props.selectedLog.sleepHours === undefined
  return (
    <Card {...swipeHandlers} className="space-y-3 border-0 bg-transparent p-0 shadow-none dark:bg-transparent sm:space-y-4 md:border-[var(--surface-border)] md:bg-[var(--surface-panel)] md:p-4 md:dark:border-slate-800 md:dark:bg-slate-900">
      <div className="xl:hidden">
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

      <div className="grid gap-3 xl:grid-cols-[17.5rem_minmax(0,1fr)] xl:items-start 2xl:grid-cols-[17.5rem_minmax(32rem,1fr)_19rem]">
        <DailyRecordDesktopDateRail
          selectedDate={props.selectedDate}
          today={props.today}
          dailyLogs={props.dailyLogs}
          workoutLogs={props.workoutLogs}
          syncState={props.syncState}
          savePending={props.savePending}
          lastSyncedLabel={props.lastSyncedLabel}
          xunjiSyncPending={props.xunjiSyncPending}
          onDateChange={props.onDateChange}
          onSyncFromXunji={props.onSyncFromXunji}
        />

        <main className="grid min-w-0 gap-3">
          <QuickRecordSection
            key={props.selectedDate}
            selectedLog={props.selectedLog}
            selectedBodyRecords={props.selectedBodyRecords}
            selectedTarget={props.selectedTarget}
            yesterdayLog={yesterdayLog}
            calorieTarget={calorieTarget}
            fatigueThreshold={props.fatigueThreshold}
            syncState={props.syncState}
            savePending={props.savePending}
            lastSyncedLabel={props.lastSyncedLabel}
            showSaveStatus={false}
            onUpdateDailyLog={props.onUpdateDailyLog}
            onUpdateBodyRecord={props.onUpdateBodyRecord}
            onQuickAction={props.onQuickAction}
            onCopyYesterday={copyYesterdayQuickFields}
            onFillTarget={fillTargetQuickFields}
            hasCopyableYesterdayFields={copyYesterdayPreview.filledCount > 0}
            hasFillableTargetFields={hasFillableTargetQuickFields}
            focusKey={props.focusKey}
            onFocusConsumed={props.onFocusConsumed}
          />

          <Suspense fallback={null}>
            <DailyMeasurementCard
              records={props.selectedBodyRecords}
              onChange={props.onUpdateBodyRecord}
              onSync={props.onSyncBodyToXunji}
            />
          </Suspense>

          <DailyNotesSection
            selectedLog={props.selectedLog}
            onUpdateDailyLog={props.onUpdateDailyLog}
          />
        </main>

        <DailyRecordDesktopAside
          selectedDate={props.selectedDate}
          selectedLog={props.selectedLog}
          selectedBodyRecords={props.selectedBodyRecords}
          bodyRecords={props.bodyRecords}
          previousLogs={previousLogs}
          workoutLogs={props.workoutLogs}
          onSelectDate={props.onDateChange}
        />
      </div>

      <DisclosurePanel className="xl:hidden" title="最近 6 周日历" contentClassName="grid gap-3">
        <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">查看历史记录或切换到其他日期。</p>
        <DailyCalendarPanel
          selectedDate={props.selectedDate}
          today={props.today}
          dailyLogs={props.dailyLogs}
          workoutLogs={props.workoutLogs}
          onSelectDate={props.onDateChange}
        />
      </DisclosurePanel>
    </Card>
  )
}
