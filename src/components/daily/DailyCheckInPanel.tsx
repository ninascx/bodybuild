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
        {selectedTarget.isTrainingDay ? <Badge tone="positive">计划训练日</Badge> : <span className="text-xs font-medium text-slate-500 dark:text-slate-400">计划休息日</span>}
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

function StatusCard({ status }: { status: QuickStatus }) {
  return (
    <div
      className={`min-h-[4.5rem] rounded-lg border p-3 ${
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
  )
}

function DailyStatusDetails({ statuses }: { statuses: QuickStatus[] }) {
  const bodyDataStatuses = [statuses[0], statuses[1], statuses[2], statuses[3]]
  const stateDataStatuses = [statuses[4], statuses[5], statuses[6], statuses[7]]

  return (
    <div className="grid gap-3">
      <DisclosurePanel className="bg-white dark:bg-slate-900" title="身体数据" contentClassName="grid gap-2 sm:grid-cols-2">
        {bodyDataStatuses.map((status) => <StatusCard key={status.label} status={status} />)}
      </DisclosurePanel>

      <DisclosurePanel className="bg-white dark:bg-slate-900" title="状态数据" contentClassName="grid gap-2 sm:grid-cols-2">
        {stateDataStatuses.map((status) => <StatusCard key={status.label} status={status} />)}
      </DisclosurePanel>
    </div>
  )
}

export function DailyCheckInPanel(props: DailyCheckInPanelProps) {
  return (
    <div className="grid gap-3 sm:gap-4">
      <DailyEssentialsForm {...props} />
      <DailySummaryStrip statuses={props.quickStatuses} />
      <DailyTrainingPanel {...props} />
      <DailyUtilitiesPanel {...props} />
      <DailyStatusDetails statuses={props.quickStatuses} />
    </div>
  )
}
