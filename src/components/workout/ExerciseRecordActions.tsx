import type { ExerciseLog } from '../../types'
import { Button, DisclosurePanel, Field, TextInput } from '../ui'

export function ExerciseBulkActions({
  emptySetCount,
  hasEmptySet,
  hasFilledSet,
  hasPreviousRecord,
  canDeleteLastSet,
  onAddSet,
  onDeleteLastSet,
  onApplyPreviousToEmpty,
  onFillEmptySets,
}: {
  emptySetCount: number
  hasEmptySet: boolean
  hasFilledSet: boolean
  hasPreviousRecord: boolean
  canDeleteLastSet: boolean
  onAddSet: () => void
  onDeleteLastSet: () => void
  onApplyPreviousToEmpty: () => void
  onFillEmptySets: () => void
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <Button variant="secondary" className="px-2" onClick={onAddSet}>加一组</Button>
      <Button variant="secondary" className="px-2" onClick={onDeleteLastSet} disabled={!canDeleteLastSet}>删最后组</Button>
      {hasPreviousRecord && hasEmptySet ? (
        <Button variant="secondary" className="px-2" onClick={onApplyPreviousToEmpty}>
          按上次补 {emptySetCount} 个空组
        </Button>
      ) : null}
      {hasFilledSet && hasEmptySet ? (
        <Button variant="secondary" className="px-2" onClick={onFillEmptySets}>
          复制已填到 {emptySetCount} 个空组
        </Button>
      ) : null}
    </div>
  )
}

export function ExerciseEditPanel({
  exercise,
  onUpdateExercise,
  onMoveUp,
  onMoveDown,
  onRebuildSets,
  onDelete,
}: {
  exercise: ExerciseLog
  onUpdateExercise: (patch: Partial<ExerciseLog>) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRebuildSets: () => void
  onDelete: () => void
}) {
  return (
    <DisclosurePanel
      className="mt-3 rounded-md"
      title="编辑动作"
      contentClassName="grid gap-3"
    >
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <Field label="动作名称">
          <TextInput value={exercise.name} onChange={(event) => onUpdateExercise({ name: event.target.value })} />
        </Field>
        <Field label="目标组次">
          <TextInput value={exercise.target} onChange={(event) => onUpdateExercise({ target: event.target.value })} />
        </Field>
      </div>
      <div>
        <Field label="动作备注">
          <TextInput value={exercise.notes ?? ''} onChange={(event) => onUpdateExercise({ notes: event.target.value })} />
        </Field>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" onClick={onMoveUp}>上移动作</Button>
        <Button variant="secondary" onClick={onMoveDown}>下移动作</Button>
        <Button variant="secondary" onClick={onRebuildSets}>按目标重建组</Button>
        <Button variant="danger" onClick={onDelete}>删除动作</Button>
      </div>
    </DisclosurePanel>
  )
}
