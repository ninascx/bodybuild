import type { TargetRepRange } from '../../lib/workout'
import { formatTargetRepRange } from '../../lib/workout'
import type { ExerciseSetLog } from '../../types'
import { NumberField } from '../NumberField'
import { Badge, Button, Checkbox, DisclosurePanel } from '../ui'
import { RirSelector, TargetRepButtons, WEIGHT_STEP_KG, WeightQuickSelect, WeightStepControls } from './WorkoutSetQuickControls'
import { Tooltip } from '../Tooltip'

type MobileCurrentSetCardProps = {
  currentSet: ExerciseSetLog | undefined
  setIndex: number
  totalSets: number
  targetRange: TargetRepRange | null
  targetRepOptions: number[]
  previousSameSetSummary: string | null
  copyRecordSummary: string | null
  repsInTarget: boolean | null
  currentSetComplete: boolean
  currentSetActionLabel: string
  currentSetActionDisabled: boolean
  hasCopyPrevious: boolean
  hasCopyRecord: boolean
  hasEmptySet: boolean
  emptySetCount: number
  hasPreviousRecord: boolean
  hasAnotherIncompleteSet: boolean
  autoStartRest: boolean
  onUpdateSet: (patch: Partial<ExerciseSetLog>, advanceWhenComplete?: boolean) => void
  onCurrentSetAction: () => void
  onCopyPrevious: () => void
  onCopyRecord: () => void
  onAddExercise: () => void
  onAddSet: () => void
  onDeleteLastSet: () => void
  onApplyCurrentSetToEmptySets: () => void
  onApplyPreviousRecordToEmptySets: () => void
  onNextIncompleteSet: () => void
  onToggleAutoStart: () => void
}

export function MobileCurrentSetCard({
  currentSet,
  setIndex,
  totalSets,
  targetRange,
  targetRepOptions,
  previousSameSetSummary,
  copyRecordSummary,
  repsInTarget,
  currentSetComplete,
  currentSetActionLabel,
  currentSetActionDisabled,
  hasCopyPrevious,
  hasCopyRecord,
  hasEmptySet,
  emptySetCount,
  hasPreviousRecord,
  hasAnotherIncompleteSet,
  autoStartRest,
  onUpdateSet,
  onCurrentSetAction,
  onCopyPrevious,
  onCopyRecord,
  onAddExercise,
  onAddSet,
  onDeleteLastSet,
  onApplyCurrentSetToEmptySets,
  onApplyPreviousRecordToEmptySets,
  onNextIncompleteSet,
  onToggleAutoStart,
}: MobileCurrentSetCardProps) {
  if (!currentSet) {
    return (
      <Button className="mt-4 w-full" onClick={onAddSet}>
        添加一组
      </Button>
    )
  }

  return (
    <div className="motion-current-set mt-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2.5 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          第 {setIndex + 1} 组 {targetRange ? `· 目标 ${formatTargetRepRange(targetRange)}` : ''}
        </p>
        {currentSetComplete ? <Badge tone="positive">已填</Badge> : <span className="text-xs font-medium text-slate-500 dark:text-slate-400">待填</span>}
      </div>

      {(previousSameSetSummary || copyRecordSummary || hasCopyPrevious) ? (
        <div className="mt-1.5 grid gap-1.5">
          {previousSameSetSummary || copyRecordSummary ? (
            <button
              type="button"
              className="flex w-full items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-left text-xs text-emerald-800 hover:bg-emerald-50 disabled:hover:bg-white dark:border-emerald-700/40 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-emerald-950/30"
              onClick={hasCopyRecord ? onCopyRecord : undefined}
              disabled={!hasCopyRecord}
            >
              <span className="shrink-0 text-slate-500 dark:text-slate-400">
                {previousSameSetSummary ? '上次' : '最佳'}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">{previousSameSetSummary ?? copyRecordSummary}</span>
              {hasCopyRecord ? <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">套用</span> : null}
            </button>
          ) : null}
          {hasCopyPrevious ? (
            <Button variant="secondary" className="min-h-8 w-full px-2 text-xs" onClick={onCopyPrevious}>
              复制上一组
            </Button>
          ) : null}
        </div>
      ) : null}

      {targetRange && repsInTarget ? (
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
          ✓ 已达标
        </p>
      ) : null}

      <div className="mt-2 grid grid-cols-2 gap-2" data-coach="workout-input">
        <NumberField
          label="重量 kg"
          value={currentSet.weight}
          step="0.5"
          kind="decimal"
          range={{ min: 0, max: 500, allowZero: true }}
          onChange={(value) => onUpdateSet({ weight: value })}
          className="h-9 text-base"
        />
        <NumberField
          label="次数"
          value={currentSet.reps}
          range={{ min: 1, max: 100 }}
          onChange={(value) => onUpdateSet({ reps: value })}
          className="h-9 text-base"
        />
      </div>

      <TargetRepButtons
        className="mt-2"
        options={targetRepOptions}
        selected={currentSet.reps}
        suffix="次"
        onSelect={(reps) => onUpdateSet({ reps })}
      />

      <div className="mt-2">
        <div className="mb-1 flex items-center gap-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">RIR</span>
          <Tooltip content="Reps in Reserve: 完成后还能做几次">
            <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">?</span>
          </Tooltip>
        </div>
        <RirSelector
          value={currentSet.rir}
          labelPrefix=""
          onChange={(rir) => onUpdateSet({ rir })}
        />
      </div>

      <DisclosurePanel
        className="mt-2 bg-[var(--surface-panel)] dark:bg-slate-900"
        title="快速调整重量 / 次数"
        summaryClassName="text-xs"
        contentClassName="grid gap-2 px-2.5 py-2"
        defaultOpen
      >
        <WeightQuickSelect
          value={currentSet.weight}
          onSelect={(weight) => onUpdateSet({ weight })}
        />

        <div className="grid grid-cols-2 gap-2">
          <WeightStepControls
            suffix="kg"
            onDecrease={() => onUpdateSet({ weight: Math.max(0, (currentSet.weight ?? 0) - WEIGHT_STEP_KG) })}
            onIncrease={() => onUpdateSet({ weight: (currentSet.weight ?? 0) + WEIGHT_STEP_KG })}
          />
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              variant="secondary"
              className="min-h-9 whitespace-nowrap px-1.5 py-0 text-xs"
              onClick={() => onUpdateSet({ reps: Math.max(1, (currentSet.reps ?? 1) - 1) })}
            >
              -1次
            </Button>
            <Button
              variant="secondary"
              className="min-h-9 whitespace-nowrap px-1.5 py-0 text-xs"
              onClick={() => onUpdateSet({ reps: (currentSet.reps ?? 0) + 1 })}
            >
              +1次
            </Button>
          </div>
        </div>
      </DisclosurePanel>

      <Button
        className="mt-2 min-h-10 w-full py-0 text-sm"
        onClick={onCurrentSetAction}
        disabled={currentSetActionDisabled}
        title={!currentSetActionDisabled ? "快捷键: Enter" : undefined}
      >
        {currentSetActionLabel}
      </Button>

      <DisclosurePanel
        className="mt-2 bg-[var(--surface-panel)] dark:bg-slate-900"
        title="组操作"
        summaryClassName="text-xs"
        contentClassName="grid gap-1.5 px-2.5 py-2"
      >
        <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)] px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">共 {totalSets} 组</span>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button variant="secondary" className="min-h-9 px-2 text-xs" onClick={onDeleteLastSet} disabled={totalSets <= 1}>
              -组
            </Button>
            <Button variant="secondary" className="min-h-9 px-2 text-xs" onClick={onAddSet}>
              +组
            </Button>
          </div>
        </div>
        <Button variant="secondary" className="min-h-9 w-full px-2 py-0 text-xs" onClick={onAddExercise}>
          新增动作
        </Button>

        {hasEmptySet ? (
          <div className="mt-1.5 grid gap-1.5">
            <Button variant="secondary" className="min-h-9 w-full py-0 text-xs" onClick={onApplyCurrentSetToEmptySets} disabled={!currentSetComplete}>
              复制本组到 {emptySetCount} 个空组
            </Button>
            {hasPreviousRecord ? (
              <Button variant="secondary" className="min-h-9 w-full py-0 text-xs" onClick={onApplyPreviousRecordToEmptySets}>
                按上次填入 {emptySetCount} 个空组
              </Button>
            ) : null}
          </div>
        ) : null}

        {hasAnotherIncompleteSet ? (
          <Button variant="secondary" className="min-h-9 w-full py-0 text-xs" onClick={onNextIncompleteSet}>
            下一未填组
          </Button>
        ) : null}

        <Checkbox
          checked={autoStartRest}
          onChange={onToggleAutoStart}
          label="完成组后自动休息"
          className="h-5 w-5"
        />
      </DisclosurePanel>
    </div>
  )
}
