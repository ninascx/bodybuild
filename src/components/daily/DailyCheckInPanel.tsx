import { Button, Field, SegmentedControl, TextArea } from '../ui'
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
  onQuickAction,
  onSyncWorkoutCompletion,
}: DailyCheckInPanelProps) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/70">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0 w-10">
            {selectedTarget.isTrainingDay ? '训练日' : '休息日'}
          </span>
          <SegmentedControl
            value={selectedLog.trained === undefined ? 'unset' : selectedLog.trained ? 'yes' : 'no'}
            options={[{ value: 'unset', label: '未填' }, { value: 'yes', label: '已训练' }, { value: 'no', label: '休息' }]}
            onChange={(value) => onQuickAction({
              trained: value === 'unset' ? undefined : value === 'yes',
              workoutCompletion: value === 'yes' ? selectedLog.workoutCompletion : 0,
            })}
          />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">完成</span>
          <SegmentedControl
            value={selectedLog.workoutCompletion === undefined ? 'unset' : String(selectedLog.workoutCompletion)}
            options={[0, 50, 80, 100].map((v) => ({ value: String(v), label: `${v}%` }))}
            onChange={(value) => onQuickAction({
              trained: Number(value) > 0 ? true : selectedLog.trained,
              workoutCompletion: Number(value),
            })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">疲劳 ≤{fatigueThreshold}</span>
          <SegmentedControl
            value={selectedLog.fatigueScore === undefined ? 'unset' : String(selectedLog.fatigueScore)}
            options={[0, 3, 5, 7, 9].map((v) => ({ value: String(v), label: String(v) }))}
            onChange={(value) => onQuickAction({ fatigueScore: Number(value) })}
          />
          {canSyncWorkoutCompletion ? (
            <Button variant="secondary" className="text-xs shadow-none" onClick={onSyncWorkoutCompletion}>同步训练 {workoutCompletionFromLog}%</Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DailyNotesSection({
  selectedLog,
  onUpdateDailyLog,
}: {
  selectedLog: Partial<DailyLog>
  onUpdateDailyLog: (patch: Partial<DailyLog>) => void
}) {
  return (
    <Field label="备注">
      <TextArea
        className="min-h-20 bg-white dark:bg-slate-900"
        value={selectedLog.notes ?? ''}
        placeholder="记录训练感受、饮食调整、身体变化..."
        onChange={(event) => onUpdateDailyLog({ notes: event.target.value })}
      />
    </Field>
  )
}

function DailyQuickTools({
  hasFillableTargetFields,
  yesterdayLog,
  onCopyYesterday,
  onFillTarget,
}: DailyCheckInPanelProps) {
  if (!yesterdayLog && !hasFillableTargetFields) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button variant="secondary" className="text-xs shadow-none" disabled={!yesterdayLog} onClick={onCopyYesterday}>沿用昨天</Button>
      <Button variant="secondary" className="text-xs shadow-none" disabled={!hasFillableTargetFields} onClick={onFillTarget}>按目标补空</Button>
    </div>
  )
}

function CompactStatusCard({ status }: { status: QuickStatus }) {
  const toneClass =
    status.tone === 'positive' ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-100'
    : status.tone === 'warning' ? 'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-600/40 dark:bg-amber-900/20 dark:text-amber-100'
    : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
  return (
    <div className={`rounded-md border px-2.5 py-2 text-center ${toneClass}`}>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{status.label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">{status.value}</p>
    </div>
  )
}

function DailyStatusGrid({ statuses }: { statuses: QuickStatus[] }) {
  const body = [statuses[0], statuses[1], statuses[2], statuses[3]]
  const state = [statuses[4], statuses[5], statuses[6], statuses[7]]
  return (
    <div className="grid gap-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">身体数据</p>
        <div className="grid grid-cols-4 gap-1.5">{body.map((s) => <CompactStatusCard key={s.label} status={s} />)}</div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">状态数据</p>
        <div className="grid grid-cols-4 gap-1.5">{state.map((s) => <CompactStatusCard key={s.label} status={s} />)}</div>
      </div>
    </div>
  )
}

export function DailyCheckInPanel(props: DailyCheckInPanelProps) {
  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_minmax(16rem,20rem)]">
      <div className="grid gap-3 sm:gap-4">
        <DailyEssentialsForm {...props} />
        <DailyNotesSection selectedLog={props.selectedLog} onUpdateDailyLog={props.onUpdateDailyLog} />
        <DailyTrainingPanel {...props} />
        <DailyStatusGrid statuses={props.quickStatuses} />
      </div>
      <div className="grid gap-3 lg:pt-0">
        <DailySummaryStrip statuses={props.quickStatuses} />
        <DailyQuickTools {...props} />
      </div>
    </div>
  )
}
