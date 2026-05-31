import type { WorkoutLog } from '../../types'
import { Button, DisclosurePanel, Field, TextArea, TextInput } from '../ui'

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
