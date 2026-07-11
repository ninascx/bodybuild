import { lazy, Suspense, useMemo, useState } from 'react'
import { DisclosurePanel } from '../components/ui'
import { QuickRecordSection } from '../components/QuickRecordSection'
import { DailyNotesSection } from '../components/daily/DailyCheckInPanel'
import { DailyRecordToolbar } from '../components/daily/DailyRecordToolbar'
import { DailyCalendarPanel } from '../components/daily/DailyRecordPanels'
import { DailyRecordStatusPanel } from '../components/daily/DailyRecordStatusPanel'
import { buildCopyYesterdayPatch } from '../components/daily/dailyRecordActions'
import { buildDailyRecordStatus } from '../components/daily/dailyRecordStatus'
import { bodyValue } from '../lib/bodyMetrics'
import { addDays } from '../lib/dates'
import { useSwipe } from '../hooks/useSwipe'
import type { BodyMetricType, BodyRecord, DailyLog, DailyTarget, WorkoutLog } from '../types'
import type { SyncState } from '../lib/storage'
import type { DailyFocusKey } from '../lib/productFlow'

const DailyMeasurementCard = lazy(() =>
  import('../components/daily/DailyBodyPanels').then((module) => ({ default: module.DailyMeasurementCard })),
)

const DailyHistoryDialog = lazy(() =>
  import('../components/daily/DailyHistoryDialog').then((module) => ({ default: module.DailyHistoryDialog })),
)

function targetCalories(target: DailyTarget): number | undefined {
  if (target.calories !== undefined) return target.calories
  return target.calorieRange?.[1]
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
  onOpenWorkout: () => void
  focusKey?: DailyFocusKey
  onFocusConsumed?: () => void
}

export function DailyRecordTab(props: DailyRecordTabProps) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [localFocusRequest, setLocalFocusRequest] = useState<{ date: string; key: DailyFocusKey }>()
  const swipeHandlers = useSwipe((direction) => {
    const nextDate = direction === 'left'
      ? addDays(props.selectedDate, 1)
      : addDays(props.selectedDate, -1)
    props.onDateChange(nextDate)
  })

  const yesterday = addDays(props.selectedDate, -1)
  const yesterdayLog = props.dailyLogs.find((log) => log.date === yesterday)
  const selectedWorkout = props.workoutLogs.find((log) => log.date === props.selectedDate)
  const calorieTarget = targetCalories(props.selectedTarget)
  const selectedWeight = bodyValue(props.selectedBodyRecords, props.selectedDate, 'weight')
  const pendingBodyCount = props.selectedBodyRecords.filter((record) => record.origin !== 'xunji').length
  const status = useMemo(
    () => buildDailyRecordStatus({
      weight: selectedWeight,
      log: props.selectedLog,
      target: props.selectedTarget,
      workout: selectedWorkout,
    }),
    [props.selectedLog, props.selectedTarget, selectedWeight, selectedWorkout],
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

  const effectiveFocusKey = localFocusRequest?.date === props.selectedDate
    ? localFocusRequest.key
    : props.focusKey
  const consumeFocus = () => {
    setLocalFocusRequest(undefined)
    props.onFocusConsumed?.()
  }
  const runPrimaryAction = () => {
    const action = status.primaryAction
    if (!action) return
    if (action.kind === 'focus') {
      setLocalFocusRequest({ date: props.selectedDate, key: action.focusKey })
      return
    }
    props.onOpenWorkout()
  }

  return (
    <section {...swipeHandlers} className="mx-auto grid w-full max-w-[73.75rem] gap-4">
      <DailyRecordToolbar
        selectedDate={props.selectedDate}
        today={props.today}
        syncState={props.syncState}
        savePending={props.savePending}
        lastSyncedLabel={props.lastSyncedLabel}
        xunjiSyncPending={props.xunjiSyncPending}
        onDateChange={props.onDateChange}
        onSyncFromXunji={props.onSyncFromXunji}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <div className="grid items-start gap-4">
        <section className="grid min-w-0 gap-4" aria-label="当日记录表单">
          <QuickRecordSection
            key={props.selectedDate}
            selectedLog={props.selectedLog}
            selectedBodyRecords={props.selectedBodyRecords}
            selectedTarget={props.selectedTarget}
            yesterdayLog={yesterdayLog}
            calorieTarget={calorieTarget}
            fatigueThreshold={props.fatigueThreshold}
            onUpdateDailyLog={props.onUpdateDailyLog}
            onUpdateBodyRecord={props.onUpdateBodyRecord}
            onQuickAction={props.onQuickAction}
            onCopyYesterday={copyYesterdayQuickFields}
            onFillTarget={fillTargetQuickFields}
            hasCopyableYesterdayFields={copyYesterdayPreview.filledCount > 0}
            hasFillableTargetFields={hasFillableTargetQuickFields}
            focusKey={effectiveFocusKey}
            onFocusConsumed={consumeFocus}
          />

          <div>
            <DailyRecordStatusPanel
              status={status}
              pendingBodyCount={pendingBodyCount}
              onPrimaryAction={runPrimaryAction}
              onSyncBody={props.onSyncBodyToXunji}
            />
          </div>

          <Suspense
            fallback={(
              <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400" role="status" aria-live="polite" aria-busy="true">
                正在加载身体数据…
              </div>
            )}
          >
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
        </section>

      </div>

      <DisclosurePanel className="md:hidden" title="最近六周日历" contentClassName="grid gap-3">
        <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">查看历史记录或切换到其他日期。</p>
        <DailyCalendarPanel
          selectedDate={props.selectedDate}
          today={props.today}
          dailyLogs={props.dailyLogs}
          workoutLogs={props.workoutLogs}
          onSelectDate={props.onDateChange}
        />
      </DisclosurePanel>

      {historyOpen ? (
        <Suspense fallback={<span className="sr-only" role="status" aria-live="polite">正在加载历史记录…</span>}>
          <DailyHistoryDialog
            selectedDate={props.selectedDate}
            today={props.today}
            dailyLogs={props.dailyLogs}
            bodyRecords={props.bodyRecords}
            workoutLogs={props.workoutLogs}
            onSelectDate={props.onDateChange}
            onClose={() => setHistoryOpen(false)}
          />
        </Suspense>
      ) : null}
    </section>
  )
}
