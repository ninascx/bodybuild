import { Button, Card, DisclosurePanel } from '../components/ui'
import { DateNavigator } from '../components/DateNavigator'
import { QuickRecordSection } from '../components/QuickRecordSection'
import { DailyCalendarPanel, MeasurementPanel } from '../components/daily/DailyRecordPanels'
import { addDays } from '../lib/dates'
import { summarizeWorkout } from '../lib/workout'
import { useSwipe } from '../hooks/useSwipe'
import { useMemo } from 'react'
import type { DailyLog, DailyTarget, WorkoutLog } from '../types'
import type { SyncState } from '../lib/storage'
import type { DailyFocusKey } from '../lib/productFlow'

type QuickStatus = { label: string; value: string; helper: string; tone: 'positive' | 'warning' | 'neutral' }

function targetCalories(target: DailyTarget): number | undefined {
  if (target.calories !== undefined) return target.calories
  return target.calorieRange?.[1]
}

function targetDeltaStatus(
  label: string,
  actual: number | undefined,
  target: number | undefined,
  unit: string,
  mode: 'upper' | 'floor',
): QuickStatus {
  if (target === undefined) {
    return { label, value: '无目标', helper: '可在个人页设置', tone: 'neutral' }
  }
  if (actual === undefined) {
    return { label, value: '未记录', helper: `目标 ${target}${unit}`, tone: 'neutral' }
  }
  const diff = Math.round((target - actual) * 10) / 10
  if (mode === 'upper') {
    if (diff === 0) {
      return { label, value: '刚好达标', helper: `已记 ${actual}${unit}`, tone: 'positive' }
    }
    return diff >= 0
      ? { label, value: `还可 ${diff}${unit}`, helper: `已记 ${actual}${unit}`, tone: 'positive' }
      : { label, value: `超出 ${Math.abs(diff)}${unit}`, helper: `目标 ${target}${unit}`, tone: 'warning' }
  }
  if (diff === 0) {
    return { label, value: '刚好达标', helper: `目标 ${target}${unit}`, tone: 'positive' }
  }
  return diff <= 0
    ? { label, value: `已达标 +${Math.abs(diff)}${unit}`, helper: `目标 ${target}${unit}`, tone: 'positive' }
    : { label, value: `还差 ${diff}${unit}`, helper: `已记 ${actual}${unit}`, tone: 'warning' }
}

function weightDeltaStatus(
  actual: number | undefined,
  previous: DailyLog | undefined,
): QuickStatus {
  if (actual === undefined) {
    return { label: '体重', value: '未记录', helper: '填晨起体重', tone: 'neutral' }
  }
  if (previous?.morningWeightKg === undefined) {
    return { label: '体重', value: `${actual}kg`, helper: '暂无上次对比', tone: 'neutral' }
  }
  const diff = Math.round((actual - previous.morningWeightKg) * 10) / 10
  const helper = `上次 ${previous.date.slice(5)} ${previous.morningWeightKg}kg`
  if (diff === 0) return { label: '体重', value: '较上次持平', helper, tone: 'neutral' }
  return {
    label: '体重',
    value: `较上次 ${diff > 0 ? '+' : ''}${diff}kg`,
    helper,
    tone: 'neutral',
  }
}

function trainingStatus(log: Partial<DailyLog>, target: DailyTarget): QuickStatus {
  if (log.trained === undefined) {
    return {
      label: '训练',
      value: '未记录',
      helper: target.isTrainingDay ? '计划训练日' : '计划休息日',
      tone: 'neutral',
    }
  }
  if (log.trained === false) {
    return target.isTrainingDay
      ? { label: '训练', value: '未训练', helper: '计划训练日', tone: 'warning' }
      : { label: '训练', value: '休息日', helper: '已标记不训练', tone: 'positive' }
  }
  const completion = log.workoutCompletion ?? 0
  if (completion >= 100) {
    return { label: '训练', value: '已完成', helper: '完成度 100%', tone: 'positive' }
  }
  if (completion > 0) {
    return { label: '训练', value: `${completion}%`, helper: '训练进行中', tone: 'warning' }
  }
  return {
    label: '训练',
    value: '已训练',
    helper: target.isTrainingDay ? '可补完成度' : '休息日加练',
    tone: 'positive',
  }
}

function workoutLogStatus(workout: WorkoutLog | undefined, target: DailyTarget, summary = workout ? summarizeWorkout(workout) : undefined): QuickStatus {
  if (!workout) {
    return target.isTrainingDay
      ? { label: '计划', value: '未关联', helper: '训练页可生成', tone: 'neutral' }
      : { label: '计划', value: '休息日', helper: '无需训练计划', tone: 'positive' }
  }
  const safeSummary = summary ?? summarizeWorkout(workout)
  if (safeSummary.totalSets === 0) {
    return { label: '计划', value: `${safeSummary.exerciseCount} 动作`, helper: '未设置组数', tone: 'neutral' }
  }
  if (safeSummary.completionPercent >= 100) {
    return { label: '计划', value: '动作已满', helper: `${safeSummary.filledSets}/${safeSummary.totalSets} 组`, tone: 'positive' }
  }
  if (safeSummary.filledSets > 0) {
    return { label: '计划', value: `${safeSummary.completionPercent}%`, helper: `${safeSummary.totalSets - safeSummary.filledSets} 组待填`, tone: 'warning' }
  }
  return { label: '计划', value: `${safeSummary.totalSets} 组`, helper: `${safeSummary.exerciseCount} 个动作`, tone: 'neutral' }
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
  onCopySelectedDate: () => void
  onExportSelectedDate: () => void
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
  const selectedWorkout = props.workoutLogs.find((workout) => workout.date === props.selectedDate)

  const selectedWorkoutSummary = useMemo(
    () => selectedWorkout ? summarizeWorkout(selectedWorkout) : undefined,
    [selectedWorkout]
  )

  const calorieTarget = targetCalories(props.selectedTarget)

  const previousLogs = useMemo(
    () => props.dailyLogs
      .filter((log) => log.date < props.selectedDate)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [props.dailyLogs, props.selectedDate]
  )

  const previousWeightLog = useMemo(
    () => previousLogs.find((log) => log.morningWeightKg !== undefined),
    [previousLogs]
  )

  const quickStatuses = useMemo(() => [
    weightDeltaStatus(props.selectedLog.morningWeightKg, previousWeightLog),
    targetDeltaStatus('热量', props.selectedLog.calories, calorieTarget, 'kcal', 'upper'),
    targetDeltaStatus('蛋白', props.selectedLog.protein, props.selectedTarget.protein, 'g', 'floor'),
    targetDeltaStatus('步数', props.selectedLog.steps, props.selectedTarget.stepTarget, '步', 'floor'),
    targetDeltaStatus('睡眠', props.selectedLog.sleepHours, props.sleepFloorHours, 'h', 'floor'),
    targetDeltaStatus('疲劳', props.selectedLog.fatigueScore, props.fatigueThreshold, '分', 'upper'),
    trainingStatus(props.selectedLog, props.selectedTarget),
    workoutLogStatus(selectedWorkout, props.selectedTarget, selectedWorkoutSummary),
  ], [
    props.selectedLog,
    props.selectedTarget,
    props.sleepFloorHours,
    props.fatigueThreshold,
    previousWeightLog,
    calorieTarget,
    selectedWorkout,
    selectedWorkoutSummary,
  ])
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
  const workoutCompletionFromLog = selectedWorkoutSummary?.completionPercent ?? 0
  const canSyncWorkoutCompletion =
    workoutCompletionFromLog > 0 &&
    (props.selectedLog.trained !== true || (props.selectedLog.workoutCompletion ?? 0) !== workoutCompletionFromLog)
  const syncWorkoutCompletion = () => {
    if (!canSyncWorkoutCompletion) return
    props.onQuickAction({
      trained: true,
      workoutCompletion: workoutCompletionFromLog,
    })
  }
  return (
    <Card {...swipeHandlers} className="space-y-3 sm:space-y-4">
      <QuickRecordSection
        selectedLog={props.selectedLog}
        selectedTarget={props.selectedTarget}
        yesterdayLog={yesterdayLog}
        quickStatuses={quickStatuses}
        calorieTarget={calorieTarget}
        fatigueThreshold={props.fatigueThreshold}
        syncState={props.syncState}
        savePending={props.savePending}
        lastSyncedLabel={props.lastSyncedLabel}
        onUpdateDailyLog={props.onUpdateDailyLog}
        onQuickAction={props.onQuickAction}
        onCopyYesterday={copyYesterdayQuickFields}
        onFillTarget={fillTargetQuickFields}
        onSyncWorkoutCompletion={syncWorkoutCompletion}
        hasFillableTargetFields={hasFillableTargetQuickFields}
        canSyncWorkoutCompletion={canSyncWorkoutCompletion}
        workoutCompletionFromLog={workoutCompletionFromLog}
        focusKey={props.focusKey}
        onFocusConsumed={props.onFocusConsumed}
      />

      <DisclosurePanel
        title="日期与补充详情"
        className="border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70"
        contentClassName="grid gap-3"
      >
        <DateNavigator selectedDate={props.selectedDate} today={props.today} onChange={props.onDateChange} />
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">日期、日历、围度和数据操作放在这里，避免打断今日录入。</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" className="w-full px-3" onClick={props.onCopySelectedDate}>
            复制此日
          </Button>
          <Button variant="secondary" className="w-full px-3" onClick={props.onExportSelectedDate}>
            导出此日
          </Button>
        </div>
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
