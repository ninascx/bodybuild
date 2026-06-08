import { Badge, Button, SectionHeader, SegmentedControl } from '../ui'

export function WorkoutRecordToolbar({
  badgeLabel,
  badgeTone,
  hasWorkout,
  effectiveTrainingMode,
  showOnlyUnfinished,
  hasIncompleteExercise,
  collapseMode,
  onToggleTrainingMode,
  onAddExercise,
  onSyncFromXunji,
  xunjiSyncPending,
  onShowOnlyUnfinishedChange,
  onCycleCollapseMode,
}: {
  badgeLabel: string
  badgeTone: 'positive' | 'warning' | 'neutral'
  hasWorkout: boolean
  effectiveTrainingMode: boolean
  showOnlyUnfinished: boolean
  hasIncompleteExercise: boolean
  collapseMode: 'auto' | 'all' | 'none'
  onToggleTrainingMode: () => void
  onAddExercise: () => void
  onSyncFromXunji: () => void
  xunjiSyncPending: boolean
  onShowOnlyUnfinishedChange: (value: boolean) => void
  onCycleCollapseMode: () => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <SectionHeader
        title="当天动作记录"
        description="先记组数和表现；动作名称、目标和备注收在每张卡的编辑区。"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={badgeTone}>{badgeLabel}</Badge>
        {hasWorkout ? (
          <Button variant={effectiveTrainingMode ? 'primary' : 'secondary'} className="px-3" onClick={onToggleTrainingMode}>
            {effectiveTrainingMode ? '训练模式中' : '训练模式'}
          </Button>
        ) : null}
        {hasWorkout ? (
          <Button variant="secondary" className="px-3" onClick={onAddExercise}>
            新增动作
          </Button>
        ) : null}
        <Button variant="secondary" className="px-3" loading={xunjiSyncPending} onClick={onSyncFromXunji}>
          同步训记
        </Button>
        {hasWorkout ? (
          <SegmentedControl
            value={showOnlyUnfinished ? 'unfinished' : 'all'}
            options={[
              { value: 'all', label: '全部动作' },
              { value: 'unfinished', label: '只看未完成', disabled: !hasIncompleteExercise && !showOnlyUnfinished },
            ]}
            onChange={(value) => onShowOnlyUnfinishedChange(value === 'unfinished')}
          />
        ) : null}
        {hasWorkout ? (
          <Button variant="secondary" className="px-3 text-xs" onClick={onCycleCollapseMode}>
            {collapseMode === 'auto' ? '折叠全部' : collapseMode === 'all' ? '展开全部' : '恢复自动'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
