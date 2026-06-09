import { formatTargetRepRange, isSetEmpty, parseTargetRepRange, targetRepQuickOptions } from '../../lib/workout'
import type { ExerciseSetLog } from '../../types'
import { NumberField } from '../NumberField'
import { Button } from '../ui'
import { RirSelector, TargetRepButtons, WEIGHT_STEP_KG, WeightQuickSelect, WeightStepControls } from './WorkoutSetQuickControls'

export function ExerciseSetEditor({
  set,
  setIndex,
  exerciseTarget,
  previousHintLabel,
  previousHintSummary,
  previousPatch,
  canCopyPrevious,
  compact,
  inputRef,
  onUpdateSet,
  onApplyPreviousPatch,
  onCopyPrevious,
}: {
  set: ExerciseSetLog
  setIndex: number
  exerciseTarget: string
  previousHintLabel: string | null
  previousHintSummary: string | null
  previousPatch: Partial<ExerciseSetLog> | null
  canCopyPrevious: boolean
  compact: boolean
  inputRef?: (el: HTMLInputElement | null) => void
  onUpdateSet: (patch: Partial<ExerciseSetLog>) => void
  onApplyPreviousPatch: () => void
  onCopyPrevious: () => void
}) {
  const targetRange = parseTargetRepRange(exerciseTarget)
  const targetRepOptions = targetRepQuickOptions(targetRange)
  const targetHint = targetRange && set.reps !== undefined
    ? set.reps >= targetRange.min && set.reps <= targetRange.max
      ? <span className="text-emerald-600 dark:text-emerald-400">✓ 达标</span>
      : <span className="text-amber-600 dark:text-amber-400">目标 {formatTargetRepRange(targetRange)}</span>
    : null

  return (
    <div
      data-workout-set-row
      data-set-index={setIndex}
      className="grid min-w-0 gap-2 rounded-md bg-slate-50 p-2 dark:bg-slate-800 lg:grid-cols-[3.25rem_minmax(8rem,1fr)_7rem_minmax(11rem,auto)_minmax(10rem,1fr)_auto] lg:items-start lg:gap-3"
    >
      <div className="hidden h-11 items-center rounded-md border border-[var(--surface-border)] bg-white px-2 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 lg:flex">
        第 {setIndex + 1} 组
      </div>

      {previousHintSummary ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-100 bg-white px-2.5 py-1.5 text-xs text-emerald-800 dark:border-emerald-700/40 dark:bg-slate-900 dark:text-emerald-200 lg:hidden">
          <span>
            {previousHintLabel}：<span className="font-semibold">{previousHintSummary}</span>
          </span>
          <Button
            variant="secondary"
            className="min-h-11 px-2 text-xs text-emerald-800 dark:text-emerald-100"
            onClick={onApplyPreviousPatch}
            disabled={!previousPatch}
          >
            {isSetEmpty(set) ? '套用' : '覆盖'}
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:contents lg:contents">
        <div className="space-y-1">
          <NumberField
            label={`${setIndex + 1}组 kg`}
            value={set.weight}
            step="0.5"
            kind="decimal"
            range={{ min: 0, max: 500, allowZero: true }}
            onChange={(value) => onUpdateSet({ weight: value })}
            inputRef={inputRef}
            className={compact ? 'h-14 text-base' : undefined}
          />
          <div className="lg:hidden">
            <WeightStepControls
              onDecrease={() => onUpdateSet({ weight: Math.max(0, (set.weight ?? 0) - WEIGHT_STEP_KG) })}
              onIncrease={() => onUpdateSet({ weight: (set.weight ?? 0) + WEIGHT_STEP_KG })}
            />
          </div>
          <WeightQuickSelect
            className="mt-2 lg:hidden"
            value={set.weight}
            onSelect={(weight) => onUpdateSet({ weight })}
          />
        </div>

        <div className="space-y-1">
          <NumberField
            label="次数"
            value={set.reps}
            range={{ min: 1, max: 100 }}
            onChange={(value) => onUpdateSet({ reps: value })}
            className={compact ? 'h-14 text-base' : undefined}
          />
          {targetHint ? <div className="text-xs">{targetHint}</div> : null}
          <TargetRepButtons
            className="sm:hidden"
            options={targetRepOptions}
            selected={set.reps}
            onSelect={(reps) => onUpdateSet({ reps })}
          />
        </div>
      </div>

      <RirSelector
        value={set.rir}
        compact={compact}
        onChange={(rir) => onUpdateSet({ rir })}
      />

      <div className="hidden min-h-11 rounded-md border border-emerald-100 bg-white px-2.5 py-2 text-xs text-emerald-800 dark:border-emerald-700/40 dark:bg-slate-900 dark:text-emerald-200 lg:block">
        {previousHintSummary ? (
          <>
            <span className="text-slate-500 dark:text-slate-400">{previousHintLabel}</span>
            <p className="mt-0.5 font-semibold">{previousHintSummary}</p>
            <button
              type="button"
              className="mt-1 text-xs font-semibold underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onApplyPreviousPatch}
              disabled={!previousPatch}
            >
              {isSetEmpty(set) ? '套用' : '覆盖'}
            </button>
          </>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">无上次记录</span>
        )}
      </div>

      {setIndex > 0 ? (
        <Button
          variant="secondary"
          className="self-start px-2 text-xs lg:min-h-11 lg:whitespace-nowrap"
          onClick={onCopyPrevious}
          disabled={!canCopyPrevious}
        >
          复制上一组
        </Button>
      ) : null}
    </div>
  )
}
