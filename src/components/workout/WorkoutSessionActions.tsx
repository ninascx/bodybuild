import type { CardioLog, WorkoutLog } from '../../types'
import { createBlankCardioLog } from '../../lib/workout'
import { Button, DisclosurePanel, Field, TextArea, TextInput } from '../ui'

function parsePositiveNumber(value: string): number | undefined {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export function WorkoutMobileActionPanel({
  primaryLabel,
  completionHint,
  onPrimaryAction,
}: {
  primaryLabel: string
  completionHint: string
  onPrimaryAction: () => void
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800 sm:hidden">
      <Button className="w-full" onClick={onPrimaryAction}>
        {primaryLabel}
      </Button>
      <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">{completionHint}</p>
    </div>
  )
}

export function WorkoutMoreActionsPanel({
  selectedWorkout,
  onUpdateWorkout,
  onAddExercise,
  onSaveAsTemplate,
  onExportSelectedWorkout,
}: {
  selectedWorkout: WorkoutLog
  onUpdateWorkout: (nextLog: WorkoutLog, immediate?: boolean, options?: { syncCompletion?: boolean }) => void
  onAddExercise: () => void
  onSaveAsTemplate: () => void
  onExportSelectedWorkout: () => void
}) {
  const updateWorkoutDraft = (patch: Partial<WorkoutLog>) => {
    onUpdateWorkout({ ...selectedWorkout, ...patch }, false, { syncCompletion: false })
  }
  const cardio = selectedWorkout.cardio ?? []
  const updateCardio = (cardioIndex: number, patch: Partial<CardioLog>) => {
    updateWorkoutDraft({
      cardio: cardio.map((item, index) => (index === cardioIndex ? { ...item, ...patch } : item)),
    })
  }
  const addCardio = () => {
    updateWorkoutDraft({
      cardio: [...cardio, createBlankCardioLog()],
    })
  }
  const deleteCardio = (cardioIndex: number) => {
    updateWorkoutDraft({
      cardio: cardio.filter((_, index) => index !== cardioIndex),
    })
  }

  return (
    <div className="grid gap-4">
      <DisclosurePanel title="更多训练操作" contentClassName="grid gap-3">
        <Field label="训练名称">
          <TextInput value={selectedWorkout.workoutName} onChange={(event) => updateWorkoutDraft({ workoutName: event.target.value })} />
        </Field>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="secondary" onClick={onAddExercise}>
            新增动作
          </Button>
          <Button variant="secondary" onClick={onSaveAsTemplate}>
            保存为模板
          </Button>
          <Button variant="secondary" onClick={onExportSelectedWorkout}>
            导出本日训练
          </Button>
        </div>
      </DisclosurePanel>
      <DisclosurePanel
        title={`有氧记录 · ${cardio.length} 项`}
        contentClassName="grid gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            记录跑步机、椭圆机、单车等有氧模式与时长。
          </p>
          <Button variant="secondary" onClick={addCardio}>添加有氧</Button>
        </div>
        {cardio.length > 0 ? (
          <div className="grid gap-2">
            {cardio.map((item, cardioIndex) => (
              <div
                key={`${item.id}-${cardioIndex}`}
                className="grid gap-2 rounded-lg border border-cyan-100 bg-cyan-50 p-3 dark:border-cyan-900/50 dark:bg-cyan-950/30 lg:grid-cols-[minmax(0,1.2fr)_8rem_minmax(0,0.9fr)_minmax(0,1fr)_2.75rem] lg:items-end"
              >
                <Field label="模式">
                  <TextInput
                    value={item.mode}
                    placeholder="跑步机 / 椭圆机 / 单车"
                    onChange={(event) => updateCardio(cardioIndex, { mode: event.target.value })}
                  />
                </Field>
                <Field label="时长 min">
                  <TextInput
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={item.durationMin ?? ''}
                    placeholder="20"
                    onChange={(event) => updateCardio(cardioIndex, { durationMin: parsePositiveNumber(event.target.value) })}
                  />
                </Field>
                <Field label="强度">
                  <TextInput
                    value={item.intensity ?? ''}
                    placeholder="低 / 中 / 高"
                    onChange={(event) => updateCardio(cardioIndex, { intensity: event.target.value || undefined })}
                  />
                </Field>
                <Field label="备注">
                  <TextInput
                    value={item.notes ?? ''}
                    placeholder="坡度、速度或心率"
                    onChange={(event) => updateCardio(cardioIndex, { notes: event.target.value || undefined })}
                  />
                </Field>
                <Button
                  variant="ghost"
                  onClick={() => deleteCardio(cardioIndex)}
                  aria-label={`删除有氧 ${item.mode || cardioIndex + 1}`}
                  title="删除有氧"
                  className="min-w-11 px-3 text-lg leading-none text-rose-700/70 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-200/80 dark:hover:bg-rose-900/30 dark:hover:text-rose-100"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </DisclosurePanel>
      <Field label="训练备注">
        <TextArea
          value={selectedWorkout.notes ?? ''}
          placeholder="记录今天的体感、疼痛、补剂或下次调整。"
          onChange={(event) => updateWorkoutDraft({ notes: event.target.value })}
        />
      </Field>
    </div>
  )
}
