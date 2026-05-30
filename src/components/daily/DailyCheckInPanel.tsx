import { Badge, Button, DisclosurePanel, Field, SegmentedControl, TextArea } from '../ui'
import type { DailyLog, DailyTarget } from '../../types'
import type { SyncState } from '../../lib/storage'
import { DailyEssentialsForm } from './DailyEssentialsForm'
import { DailySummaryStrip } from './DailySummaryStrip'

type QuickStatus = { label: string; value: string; helper: string; tone: 'positive' | 'warning' | 'neutral' }

export type DailyCheckInPanelProps = {
  selectedLog: Partial<DailyLog> & { date: string }
  selectedTarget: DailyTarget
  yesterdayLog: DailyLog | undefined
  quickStatuses: QuickStatus[]
  calorieTarget: number | undefined
  fatigueThreshold: number
  syncState: SyncState
  savePending: boolean
  lastSyncedLabel: string
  onUpdateDailyLog: (patch: Partial<DailyLog>) => void
  onQuickAction: (patch: Partial<DailyLog>) => void
  onCopyYesterday: () => void
  onFillTarget: () => void
  onMarkRestDay: () => void
  onMarkTrainingStarted: () => void
  onSyncWorkoutCompletion: () => void
  onCompleteCommonRecord: () => void
  hasFillableTargetFields: boolean
  canSyncWorkoutCompletion: boolean
  workoutCompletionFromLog: number
  canCompleteCommonRecord: boolean
}

type CheckItem = { label: string; done: boolean }

function getPrimaryActionLabel(canComplete: boolean, missingCount: number, canSyncWorkoutCompletion: boolean) {
  if (!canComplete) return '常用记录已完成'
  if (missingCount > 0) return '完成今日缺口'
  if (canSyncWorkoutCompletion) return '同步训练完成度'
  return '更新常用记录'
}

function TodayGapPanel({
  items,
  primaryActionLabel,
  canCompleteCommonRecord,
  onCompleteCommonRecord,
}: {
  items: CheckItem[]
  primaryActionLabel: string
  canCompleteCommonRecord: boolean
  onCompleteCommonRecord: () => void
}) {
  const completedCount = items.filter((item) => item.done).length
  const missingItems = items.filter((item) => !item.done)
  const complete = missingItems.length === 0

  return (
    <section className="rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">今日缺口</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {complete ? '常用项已经齐了，后面只补细节。' : `先补 ${missingItems.length} 项，今天的判断才可靠。`}
          </p>
        </div>
        <Badge tone={complete ? 'positive' : 'warning'}>{completedCount}/{items.length}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {complete ? (
          <>
            <span className="inline-flex min-h-8 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-200 sm:hidden">
              已补齐
            </span>
            {items.map((item) => (
              <span
                key={item.label}
                className="hidden min-h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:inline-flex"
              >
                已填 {item.label}
              </span>
            ))}
          </>
        ) : missingItems.map((item) => (
          <span
            key={item.label}
            className="inline-flex min-h-8 items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 text-xs font-semibold text-amber-900 dark:border-amber-600/40 dark:bg-amber-900/30 dark:text-amber-100"
          >
            待填 {item.label}
          </span>
        ))}
        {complete ? (
          null
        ) : null}
      </div>

      <Button
        className="mt-3 w-full"
        onClick={onCompleteCommonRecord}
        disabled={!canCompleteCommonRecord}
      >
        {primaryActionLabel}
      </Button>
    </section>
  )
}

function DailyTrainingPanel({
  selectedLog,
  selectedTarget,
  canSyncWorkoutCompletion,
  workoutCompletionFromLog,
  fatigueThreshold,
  onUpdateDailyLog,
  onQuickAction,
  onMarkRestDay,
  onMarkTrainingStarted,
  onSyncWorkoutCompletion,
}: DailyCheckInPanelProps) {
  const setTrainedValue = (value: boolean | undefined) => {
    onQuickAction({
      trained: value,
      workoutCompletion: value === true ? selectedLog.workoutCompletion : 0,
    })
  }

  const setWorkoutCompletionValue = (value: number) => {
    onQuickAction({
      trained: value > 0 ? true : selectedLog.trained,
      workoutCompletion: value,
    })
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">训练状态</h3>
        <Badge tone={selectedTarget.isTrainingDay ? 'positive' : 'neutral'}>
          {selectedTarget.isTrainingDay ? '计划训练日' : '计划休息日'}
        </Badge>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">是否训练</p>
          <SegmentedControl
            value={selectedLog.trained === undefined ? 'unset' : selectedLog.trained ? 'yes' : 'no'}
            options={[
              { value: 'unset', label: '未填' },
              { value: 'yes', label: '是' },
              { value: 'no', label: '否' },
            ]}
            onChange={(value) => setTrainedValue(value === 'unset' ? undefined : value === 'yes')}
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">完成度</p>
          <SegmentedControl
            value={selectedLog.workoutCompletion === undefined ? 'unset' : String(selectedLog.workoutCompletion)}
            options={[0, 50, 80, 100].map((value) => ({ value: String(value), label: `${value}%` }))}
            onChange={(value) => setWorkoutCompletionValue(Number(value))}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {!selectedTarget.isTrainingDay ? (
          <Button variant="secondary" className="text-xs shadow-none" disabled={selectedLog.trained === false} onClick={onMarkRestDay}>
            按计划休息
          </Button>
        ) : null}
        {selectedLog.trained === false || (!selectedTarget.isTrainingDay && selectedLog.trained !== true) ? (
          <Button variant="secondary" className="text-xs shadow-none" onClick={onMarkTrainingStarted}>
            {selectedTarget.isTrainingDay ? '改为训练' : '记录加练'}
          </Button>
        ) : null}
        {canSyncWorkoutCompletion ? (
          <Button variant="secondary" className="text-xs shadow-none" onClick={onSyncWorkoutCompletion}>
            {workoutCompletionFromLog >= 100 ? '同步训练完成' : `同步训练 ${workoutCompletionFromLog}%`}
          </Button>
        ) : null}
      </div>

      <DisclosurePanel className="mt-3 bg-slate-50 dark:bg-slate-800/70" title="疲劳和备注" contentClassName="grid gap-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">疲劳 (建议≤{fatigueThreshold})</p>
          <SegmentedControl
            value={selectedLog.fatigueScore === undefined ? 'unset' : String(selectedLog.fatigueScore)}
            options={[0, 3, 5, 7, 9].map((value) => ({ value: String(value), label: value }))}
            onChange={(value) => onQuickAction({ fatigueScore: Number(value) })}
          />
        </div>
        <Field label="备注">
          <TextArea
            className="min-h-16 bg-white dark:bg-slate-900"
            value={selectedLog.notes ?? ''}
            onChange={(event) => onUpdateDailyLog({ notes: event.target.value })}
          />
        </Field>
      </DisclosurePanel>
    </section>
  )
}

function DailyUtilitiesPanel({
  hasFillableTargetFields,
  yesterdayLog,
  onCopyYesterday,
  onFillTarget,
}: DailyCheckInPanelProps) {
  return (
    <DisclosurePanel className="bg-white dark:bg-slate-900" title="补空工具" contentClassName="grid gap-2 sm:grid-cols-2">
      <Button variant="secondary" className="shadow-none" disabled={!yesterdayLog} onClick={onCopyYesterday}>
        沿用昨天
      </Button>
      <Button variant="secondary" className="shadow-none" disabled={!hasFillableTargetFields} title="只补空项，不覆盖已填内容" onClick={onFillTarget}>
        按目标补空
      </Button>
    </DisclosurePanel>
  )
}

function DailyStatusDetails({ statuses }: { statuses: QuickStatus[] }) {
  return (
    <DisclosurePanel className="bg-white dark:bg-slate-900" title="全部状态摘要" contentClassName="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {statuses.map((status) => (
        <div
          key={status.label}
          className={`rounded-lg border p-2.5 ${
            status.tone === 'positive'
              ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-100'
              : status.tone === 'warning'
                ? 'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-600/40 dark:bg-amber-900/20 dark:text-amber-100'
                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
          }`}
        >
          <p className="text-xs font-medium opacity-75">{status.label}</p>
          <p className="mt-1 truncate text-base font-semibold">{status.value}</p>
          <p className="mt-1 truncate text-xs opacity-70">{status.helper}</p>
        </div>
      ))}
    </DisclosurePanel>
  )
}

export function DailyCheckInPanel(props: DailyCheckInPanelProps) {
  const checkItems: CheckItem[] = [
    { label: '体重', done: props.selectedLog.morningWeightKg !== undefined },
    { label: '热量', done: props.selectedLog.calories !== undefined },
    { label: '蛋白', done: props.selectedLog.protein !== undefined },
    { label: '步数', done: props.selectedLog.steps !== undefined },
    { label: '睡眠', done: props.selectedLog.sleepHours !== undefined },
    { label: '训练', done: props.selectedLog.trained !== undefined },
  ]
  const missingCount = checkItems.filter((item) => !item.done).length
  const primaryActionLabel = getPrimaryActionLabel(props.canCompleteCommonRecord, missingCount, props.canSyncWorkoutCompletion)

  return (
    <div className="grid gap-3 sm:gap-4">
      <TodayGapPanel
        items={checkItems}
        primaryActionLabel={primaryActionLabel}
        canCompleteCommonRecord={props.canCompleteCommonRecord}
        onCompleteCommonRecord={props.onCompleteCommonRecord}
      />
      <DailyEssentialsForm {...props} />
      <DailySummaryStrip statuses={props.quickStatuses} />
      <DailyTrainingPanel {...props} />
      <DailyUtilitiesPanel {...props} />
      <DailyStatusDetails statuses={props.quickStatuses} />
    </div>
  )
}
