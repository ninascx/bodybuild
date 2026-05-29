import { Badge, Button, Card, Field, TextArea } from '../components/ui'
import { MiniCalendar } from '../components/MiniCalendar'
import { DateNavigator } from '../components/DateNavigator'
import { NumberField } from '../components/NumberField'
import { addDays } from '../lib/dates'
import { summarizeWorkout } from '../lib/workout'
import type { DailyLog, DailyTarget, WorkoutLog } from '../types'
import type { SyncState } from '../lib/storage'

type DimensionKey = 'waistCm' | 'chestCm' | 'upperArmCm' | 'thighCm'
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
}

export function DailyRecordTab(props: DailyRecordTabProps) {
  const trainedValue = props.selectedLog.trained
  const yesterday = addDays(props.selectedDate, -1)
  const yesterdayLog = props.dailyLogs.find((log) => log.date === yesterday)
  const selectedWorkout = props.workoutLogs.find((workout) => workout.date === props.selectedDate)
  const selectedWorkoutSummary = selectedWorkout ? summarizeWorkout(selectedWorkout) : undefined
  const calorieTarget = targetCalories(props.selectedTarget)
  const previousLogs = props.dailyLogs
    .filter((log) => log.date < props.selectedDate)
    .sort((a, b) => b.date.localeCompare(a.date))
  const previousWeightLog = previousLogs.find((log) => log.morningWeightKg !== undefined)
  const quickStatuses = [
    weightDeltaStatus(props.selectedLog.morningWeightKg, previousWeightLog),
    targetDeltaStatus('热量', props.selectedLog.calories, calorieTarget, 'kcal', 'upper'),
    targetDeltaStatus('蛋白', props.selectedLog.protein, props.selectedTarget.protein, 'g', 'floor'),
    targetDeltaStatus('步数', props.selectedLog.steps, props.selectedTarget.stepTarget, '步', 'floor'),
    targetDeltaStatus('睡眠', props.selectedLog.sleepHours, props.sleepFloorHours, 'h', 'floor'),
    targetDeltaStatus('疲劳', props.selectedLog.fatigueScore, props.fatigueThreshold, '分', 'upper'),
    trainingStatus(props.selectedLog, props.selectedTarget),
    workoutLogStatus(selectedWorkout, props.selectedTarget, selectedWorkoutSummary),
  ]
  const quickRequiredItems = [
    ['体重', props.selectedLog.morningWeightKg !== undefined],
    ['热量', props.selectedLog.calories !== undefined],
    ['蛋白', props.selectedLog.protein !== undefined],
    ['步数', props.selectedLog.steps !== undefined],
    ['睡眠', props.selectedLog.sleepHours !== undefined],
    ['训练', props.selectedLog.trained !== undefined],
  ] as const
  const completedQuickCount = quickRequiredItems.filter(([, done]) => done).length
  const missingQuickLabels = quickRequiredItems
    .filter(([, done]) => !done)
    .map(([label]) => label)
  const quickFieldClass = 'h-12 text-base'
  const setTrainedValue = (value: boolean | undefined) => {
    props.onQuickAction({
      trained: value,
      workoutCompletion: value === true ? props.selectedLog.workoutCompletion : 0,
    })
  }
  const setWorkoutCompletionValue = (value: number) => {
    props.onQuickAction({
      trained: value > 0 ? true : props.selectedLog.trained,
      workoutCompletion: value,
    })
  }
  const copyYesterdayQuickFields = () => {
    if (!yesterdayLog) return
    props.onQuickAction({
      morningWeightKg: yesterdayLog.morningWeightKg,
      calories: yesterdayLog.calories,
      protein: yesterdayLog.protein,
      steps: yesterdayLog.steps,
      sleepHours: yesterdayLog.sleepHours,
      fatigueScore: yesterdayLog.fatigueScore,
      trained: yesterdayLog.trained,
      workoutCompletion: yesterdayLog.trained === true ? yesterdayLog.workoutCompletion : 0,
    })
  }
  const fillTargetQuickFields = () => {
    const patch: Partial<DailyLog> = {}
    if (props.selectedLog.calories === undefined && calorieTarget !== undefined) patch.calories = calorieTarget
    if (props.selectedLog.protein === undefined) patch.protein = props.selectedTarget.protein
    if (props.selectedLog.steps === undefined) patch.steps = props.selectedTarget.stepTarget
    if (props.selectedLog.sleepHours === undefined) patch.sleepHours = props.sleepFloorHours
    if (!props.selectedTarget.isTrainingDay && props.selectedLog.trained === undefined) {
      patch.trained = false
      patch.workoutCompletion = 0
    }
    if (Object.keys(patch).length === 0) return
    props.onQuickAction(patch)
  }
  const markPlannedRestDay = () => {
    if (props.selectedTarget.isTrainingDay) return
    props.onQuickAction({ trained: false, workoutCompletion: 0 })
  }
  const markTrainingStarted = () => {
    props.onQuickAction({
      trained: true,
      workoutCompletion: props.selectedLog.workoutCompletion ?? 0,
    })
  }
  const hasFillableTargetQuickFields =
    (props.selectedLog.calories === undefined && calorieTarget !== undefined) ||
    props.selectedLog.protein === undefined ||
    props.selectedLog.steps === undefined ||
    props.selectedLog.sleepHours === undefined ||
    (!props.selectedTarget.isTrainingDay && props.selectedLog.trained === undefined)
  const workoutCompletionFromLog = selectedWorkoutSummary?.completionPercent ?? 0
  const canSyncWorkoutCompletion =
    workoutCompletionFromLog > 0 &&
    (props.selectedLog.trained !== true || (props.selectedLog.workoutCompletion ?? 0) !== workoutCompletionFromLog)
  const sleepAlreadyAtTarget =
    props.selectedLog.sleepHours !== undefined && props.selectedLog.sleepHours >= props.sleepFloorHours
  const caloriesAlreadyAtTarget = calorieTarget !== undefined && props.selectedLog.calories === calorieTarget
  const proteinAlreadyAtTarget =
    props.selectedLog.protein !== undefined && props.selectedLog.protein >= props.selectedTarget.protein
  const stepsAlreadyAtTarget =
    props.selectedLog.steps !== undefined && props.selectedLog.steps >= props.selectedTarget.stepTarget
  const trainingAlreadyComplete =
    props.selectedLog.trained === true && (props.selectedLog.workoutCompletion ?? 0) >= 100
  const syncWorkoutCompletion = () => {
    if (!canSyncWorkoutCompletion) return
    props.onQuickAction({
      trained: true,
      workoutCompletion: workoutCompletionFromLog,
    })
  }
  const renderYesterdayQuick = (value: number | undefined, unit: string, onClick: () => void) => {
    if (value === undefined) return null
    return (
      <button
        type="button"
        onClick={onClick}
        className="justify-self-start rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-700/40 dark:bg-slate-900 dark:text-emerald-200 dark:hover:border-emerald-500"
      >
        昨日 {value}{unit}
      </button>
    )
  }
  const dimensionFields: Array<[string, DimensionKey]> = [
    ['腰围', 'waistCm'],
    ['胸围', 'chestCm'],
    ['上臂', 'upperArmCm'],
    ['大腿', 'thighCm'],
  ]
  const previousDimensionByKey = new Map<DimensionKey, DailyLog>()

  for (const [, key] of dimensionFields) {
    const previous = previousLogs.find((log) => log[key] !== undefined)
    if (previous) previousDimensionByKey.set(key, previous)
  }

  const formatDimensionSummary = (label: string, key: DimensionKey) => {
    const value = props.selectedLog[key]
    if (value === undefined) return null
    const previous = previousDimensionByKey.get(key)
    const previousValue = previous?.[key]
    if (previousValue === undefined) return `${label} ${value}cm`
    const diff = Math.round((value - previousValue) * 10) / 10
    if (diff === 0) return `${label} ${value}cm（持平）`
    return `${label} ${value}cm（比上次 ${diff > 0 ? '+' : ''}${diff}）`
  }

  const dimensionSummary = dimensionFields
    .map(([label, key]) => formatDimensionSummary(label, key))
    .filter((value): value is string => value !== null)
    .join(' · ')

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">每日记录</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">手机端先填快捷项，完整围度有时间再补。</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <DateNavigator selectedDate={props.selectedDate} today={props.today} onChange={props.onDateChange} />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button variant="secondary" className="w-full px-3 sm:w-auto" onClick={props.onCopySelectedDate}>
              复制此日
            </Button>
            <Button variant="secondary" className="w-full px-3 sm:w-auto" onClick={props.onExportSelectedDate}>
              导出此日
            </Button>
          </div>
        </div>
      </div>

      {/* 快捷记录 — 放在日历上方，手机端优先看到 */}
      <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-700/40 dark:bg-emerald-900/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-emerald-950 dark:text-emerald-100">一屏快速记录</h3>
            <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">
              {missingQuickLabels.length > 0
                ? `待填：${missingQuickLabels.join('、')}`
                : '核心记录已补齐。'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
            <Badge tone={missingQuickLabels.length === 0 ? 'positive' : 'warning'} className="col-span-2 sm:col-span-1">
              已填 {completedQuickCount}/{quickRequiredItems.length}
            </Badge>
            <Badge tone="positive" className="col-span-2 sm:col-span-1">30 秒</Badge>
            <Button variant="secondary" className="text-xs sm:px-3" disabled={!yesterdayLog} onClick={copyYesterdayQuickFields}>
              沿用昨天
            </Button>
            <Button variant="secondary" className="text-xs sm:px-3" disabled={!hasFillableTargetQuickFields} title="只补空项，不覆盖已填内容" onClick={fillTargetQuickFields}>
              按目标补空
            </Button>
            {!props.selectedTarget.isTrainingDay ? (
              <Button
                variant="secondary"
                className="text-xs sm:px-3"
                disabled={props.selectedLog.trained === false}
                onClick={markPlannedRestDay}
              >
                按计划休息
              </Button>
            ) : null}
            {props.selectedLog.trained === false || (!props.selectedTarget.isTrainingDay && props.selectedLog.trained !== true) ? (
              <Button
                variant="secondary"
                className="text-xs sm:px-3"
                onClick={markTrainingStarted}
                title={props.selectedTarget.isTrainingDay ? '标记今天已训练' : '休息日额外训练，会标记为已训练'}
              >
                {props.selectedTarget.isTrainingDay ? '改为训练' : '记录加练'}
                <span className="ml-1 text-[10px] opacity-70">→已训练</span>
              </Button>
            ) : null}
            {canSyncWorkoutCompletion ? (
              <Button variant="secondary" className="col-span-2 text-xs sm:col-span-1 sm:px-3" onClick={syncWorkoutCompletion}>
                {workoutCompletionFromLog >= 100 ? '同步训练完成' : `同步训练 ${workoutCompletionFromLog}%`}
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-1">
            <NumberField className={quickFieldClass} label="体重 kg" value={props.selectedLog.morningWeightKg} step="0.1" kind="decimal" range={{ min: 20, max: 300 }} onChange={(value) => props.onUpdateDailyLog({ morningWeightKg: value })} />
            {renderYesterdayQuick(yesterdayLog?.morningWeightKg, 'kg', () => props.onQuickAction({ morningWeightKg: yesterdayLog?.morningWeightKg }))}
          </div>
          <div className="grid gap-1">
            <NumberField className={quickFieldClass} label="热量 kcal" value={props.selectedLog.calories} range={{ min: 0, max: 10000, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ calories: value })} />
            {renderYesterdayQuick(yesterdayLog?.calories, 'kcal', () => props.onQuickAction({ calories: yesterdayLog?.calories }))}
          </div>
          <div className="grid gap-1">
            <NumberField className={quickFieldClass} label="蛋白质 g" value={props.selectedLog.protein} range={{ min: 0, max: 500, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ protein: value })} />
            {renderYesterdayQuick(yesterdayLog?.protein, 'g', () => props.onQuickAction({ protein: yesterdayLog?.protein }))}
          </div>
          <div className="grid gap-1">
            <NumberField className={quickFieldClass} label="步数" value={props.selectedLog.steps} range={{ min: 0, max: 100000, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ steps: value })} />
            {renderYesterdayQuick(yesterdayLog?.steps, '步', () => props.onQuickAction({ steps: yesterdayLog?.steps }))}
          </div>
          <div className="grid gap-1">
            <NumberField className={quickFieldClass} label="睡眠 h" value={props.selectedLog.sleepHours} step="0.1" kind="decimal" range={{ min: 0, max: 24, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ sleepHours: value })} />
            {renderYesterdayQuick(yesterdayLog?.sleepHours, 'h', () => props.onQuickAction({ sleepHours: yesterdayLog?.sleepHours }))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4 xl:grid-cols-8">
          {quickStatuses.map((status) => (
            <div
              key={status.label}
              className={`min-w-0 rounded-lg border bg-white p-2 dark:bg-slate-900 sm:p-3 ${
                status.tone === 'positive'
                  ? 'border-emerald-200 text-emerald-900 dark:border-emerald-700/40 dark:text-emerald-100'
                  : status.tone === 'warning'
                    ? 'border-amber-200 text-amber-950 dark:border-amber-600/40 dark:text-amber-100'
                    : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200'
              }`}
            >
              <p className="text-xs font-medium opacity-75">{status.label}</p>
              <p className="mt-1 truncate text-sm font-semibold sm:text-base">{status.value}</p>
              <p className="mt-1 truncate text-xs opacity-70">{status.helper}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-700/40 dark:bg-slate-900">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">是否训练</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([['', '未填'], ['yes', '是'], ['no', '否']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTrainedValue(val === '' ? undefined : val === 'yes')}
                  className={`min-h-11 rounded-md border px-3 text-sm font-medium transition ${
                    (val === '' ? trainedValue === undefined : val === 'yes' ? trainedValue === true : trainedValue === false)
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-500'
                      : 'border-emerald-200 text-slate-700 hover:border-emerald-400 dark:border-emerald-700/40 dark:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-700/40 dark:bg-slate-900">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">训练完成度</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[0, 50, 80, 100].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setWorkoutCompletionValue(value)}
                  className={`min-h-11 rounded-md border px-2 text-sm font-medium transition ${
                    props.selectedLog.workoutCompletion === value
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-500'
                      : 'border-emerald-200 text-slate-700 hover:border-emerald-400 dark:border-emerald-700/40 dark:text-slate-200'
                  }`}
                >
                  {value}%
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-700/40 dark:bg-slate-900">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">疲劳评分</p>
            <p className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-200/80">建议低于 {props.fatigueThreshold}</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {[0, 3, 5, 7, 9].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => props.onQuickAction({ fatigueScore: value })}
                  className={`min-h-11 rounded-md border px-2 text-sm font-medium transition ${
                    props.selectedLog.fatigueScore === value
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-500'
                      : 'border-emerald-200 text-slate-700 hover:border-emerald-400 dark:border-emerald-700/40 dark:text-slate-200'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Field label="当天备注">
            <TextArea
              className="min-h-20 border-emerald-200 bg-white dark:border-emerald-700/40 dark:bg-slate-900"
              value={props.selectedLog.notes ?? ''}
              onChange={(event) => props.onUpdateDailyLog({ notes: event.target.value })}
            />
          </Field>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-emerald-800 dark:text-emerald-200">
            {props.savePending
              ? '待保存...'
              : props.syncState === 'synced'
                ? props.lastSyncedLabel
                  ? `已保存 ${props.lastSyncedLabel}`
                  : '已保存'
                : props.syncState === 'saving'
                  ? '保存中...'
                  : '离线缓存中'}
          </span>
        </div>
      </div>

      {/* 迷你日历 — 折叠以节省手机端空间 */}
      <details className="mt-5 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">最近 6 周日历</summary>
        <div className="px-3 pb-3">
          <MiniCalendar
            selectedDate={props.selectedDate}
            today={props.today}
            dailyLogs={props.dailyLogs}
            workoutLogs={props.workoutLogs}
            onSelectDate={props.onDateChange}
          />
        </div>
      </details>

      <details className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-600/40 dark:bg-amber-900/30">
        <summary className="cursor-pointer text-sm font-semibold text-amber-950">身体状态</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField label="训练完成度 %" value={props.selectedLog.workoutCompletion} range={{ min: 0, max: 100, allowZero: true }} onChange={(value) => setWorkoutCompletionValue(value ?? 0)} />
          <NumberField label="疲劳评分 0-10（可选）" value={props.selectedLog.fatigueScore} range={{ min: 0, max: 10, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ fatigueScore: value })} />
        </div>
      </details>

      <details className="mt-5 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-200">
          围度 / 更多记录{dimensionSummary ? ` · ${dimensionSummary}` : ''}
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label="腰围 cm" value={props.selectedLog.waistCm} step="0.1" kind="decimal" range={{ min: 30, max: 200 }} onChange={(value) => props.onUpdateDailyLog({ waistCm: value })} />
          <NumberField label="胸围 cm（可选）" value={props.selectedLog.chestCm} step="0.1" kind="decimal" range={{ min: 30, max: 200 }} onChange={(value) => props.onUpdateDailyLog({ chestCm: value })} />
          <NumberField label="上臂围 cm（可选）" value={props.selectedLog.upperArmCm} step="0.1" kind="decimal" range={{ min: 30, max: 200 }} onChange={(value) => props.onUpdateDailyLog({ upperArmCm: value })} />
          <NumberField label="大腿围 cm（可选）" value={props.selectedLog.thighCm} step="0.1" kind="decimal" range={{ min: 30, max: 200 }} onChange={(value) => props.onUpdateDailyLog({ thighCm: value })} />
          <NumberField label="实际碳水 g" value={props.selectedLog.carbs} range={{ min: 0, max: 1000, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ carbs: value })} />
          <NumberField label="实际脂肪 g" value={props.selectedLog.fat} range={{ min: 0, max: 500, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ fat: value })} />
        </div>
      </details>
    </Card>
  )
}
