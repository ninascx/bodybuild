import type { TargetRepRange } from '../../lib/workout'
import { formatTargetRepRange } from '../../lib/workout'
import type { ExerciseSetLog } from '../../types'
import { NumberField } from '../NumberField'
import { Badge, Button, Checkbox, DisclosurePanel } from '../ui'
import { RirSelector, TargetRepButtons, WEIGHT_STEP_KG, WeightQuickSelect, WeightStepControls } from './WorkoutSetQuickControls'

type MobileCurrentSetCardProps = {
  currentSet: ExerciseSetLog | undefined
  setIndex: number
  totalSets: number
  targetRange: TargetRepRange | null
  targetRepOptions: number[]
  previousSameSetSummary: string | null
  copyRecordSummary: string | null
  repsInTarget: boolean | null
  quickFillLabel: string | null
  quickFillSummary: string | null
  quickFillAvailable: boolean
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
  onQuickFill: () => void
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
  quickFillLabel,
  quickFillSummary,
  quickFillAvailable,
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
  onQuickFill,
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

      <div className="mt-1.5 flex items-center justify-between gap-2 rounded-md border border-[var(--surface-border)] bg-[var(--surface-panel)] px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
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

      {previousSameSetSummary ? (
        <div className="mt-1.5 rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-800 dark:border-emerald-700/40 dark:bg-slate-900 dark:text-emerald-200">
          上次同组：<span className="font-semibold">{previousSameSetSummary}</span>
        </div>
      ) : copyRecordSummary ? (
        <div className="mt-1.5 rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-800 dark:border-emerald-700/40 dark:bg-slate-900 dark:text-emerald-200">
          上次最佳：<span className="font-semibold">{copyRecordSummary}</span>
        </div>
      ) : null}

      {targetRange ? (
        <p className={`mt-1 text-xs ${repsInTarget ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
          {repsInTarget ? '✓ 已达标' : ''}
        </p>
      ) : null}

      {quickFillAvailable && quickFillLabel ? (
        <Button className="mt-1.5 w-full text-xs" onClick={onQuickFill}>
          {quickFillLabel}{quickFillSummary ? ` · ${quickFillSummary}` : ''}
        </Button>
      ) : null}

      <div className="mt-2 grid grid-cols-2 gap-2">
        <NumberField
          label="重量 kg"
          value={currentSet.weight}
          step="0.5"
          kind="decimal"
          range={{ min: 0, max: 500, allowZero: true }}
          onChange={(value) => onUpdateSet({ weight: value })}
          className="h-12 text-base"
        />
        <NumberField
          label="次数"
          value={currentSet.reps}
          range={{ min: 1, max: 100 }}
          onChange={(value) => onUpdateSet({ reps: value })}
          className="h-12 text-base"
        />
      </div>

      <TargetRepButtons
        className="mt-2"
        options={targetRepOptions}
        selected={currentSet.reps}
        suffix="次"
        onSelect={(reps) => onUpdateSet({ reps })}
      />

      <WeightQuickSelect
        className="mt-2"
        value={currentSet.weight}
        onSelect={(weight) => onUpdateSet({ weight })}
      />

      <div className="mt-1.5 grid grid-cols-2 gap-2">
        <WeightStepControls
          suffix="kg"
          onDecrease={() => onUpdateSet({ weight: Math.max(0, (currentSet.weight ?? 0) - WEIGHT_STEP_KG) })}
          onIncrease={() => onUpdateSet({ weight: (currentSet.weight ?? 0) + WEIGHT_STEP_KG })}
        />
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            variant="secondary"
            className="px-1.5 text-xs"
            onClick={() => onUpdateSet({ reps: Math.max(1, (currentSet.reps ?? 1) - 1) })}
          >
            -1次
          </Button>
          <Button
            variant="secondary"
            className="px-1.5 text-xs"
            onClick={() => onUpdateSet({ reps: (currentSet.reps ?? 0) + 1 })}
          >
            +1次
          </Button>
        </div>
      </div>

      <div className="mt-1.5">
        <RirSelector
          value={currentSet.rir}
          labelPrefix="RIR "
          onChange={(rir) => onUpdateSet({ rir })}
        />
      </div>

      <Button
        className="mt-2 w-full py-2.5"
        onClick={onCurrentSetAction}
        disabled={currentSetActionDisabled}
      >
        {currentSetActionLabel}
      </Button>

      <DisclosurePanel
        className="mt-2 bg-[var(--surface-panel)] dark:bg-slate-900"
        title="更多操作"
        summaryClassName="text-xs"
        contentClassName="grid gap-1.5 px-2.5 py-2"
      >
        <div className="grid grid-cols-2 gap-1.5">
          <Button variant="secondary" className="px-2 text-xs" onClick={onCopyPrevious} disabled={!hasCopyPrevious}>
            复制上一组
          </Button>
          <Button variant="secondary" className="px-2 text-xs" onClick={onCopyRecord} disabled={!hasCopyRecord}>
            套用上次
          </Button>
          <Button variant="secondary" className="px-2 text-xs" onClick={onAddExercise}>
            新增动作
          </Button>
        </div>

        {hasEmptySet ? (
          <div className="mt-1.5 grid gap-1.5">
            <Button variant="secondary" className="w-full text-xs" onClick={onApplyCurrentSetToEmptySets} disabled={!currentSetComplete}>
              复制本组到 {emptySetCount} 个空组
            </Button>
            {hasPreviousRecord ? (
              <Button variant="secondary" className="w-full text-xs" onClick={onApplyPreviousRecordToEmptySets}>
                按上次填入 {emptySetCount} 个空组
              </Button>
            ) : null}
          </div>
        ) : null}

        {hasAnotherIncompleteSet ? (
          <Button variant="secondary" className="w-full text-xs" onClick={onNextIncompleteSet}>
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
