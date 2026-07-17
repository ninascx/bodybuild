import { Badge, Button, DropdownMenu, SectionHeader, SegmentedControl } from '../ui'
import type { DropdownMenuItem } from '../ui'

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
  showTrainingModeAction = true,
  showSyncAction = true,
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
  showTrainingModeAction?: boolean
  showSyncAction?: boolean
}) {
  const moreItems: DropdownMenuItem[] = []
  if (hasWorkout) {
    moreItems.push({
      label: '新增动作',
      description: '在当天训练末尾添加一个空动作。',
      onSelect: onAddExercise,
    })
  }
  if (showSyncAction) {
    moreItems.push({
      label: xunjiSyncPending ? '正在从训记导入…' : '从训记导入当日训练',
      description: '训记是外部训练数据源。',
      onSelect: onSyncFromXunji,
      disabled: xunjiSyncPending,
    })
  }
  if (hasWorkout) {
    moreItems.push({
      label: collapseMode === 'auto' ? '折叠全部动作' : collapseMode === 'all' ? '展开全部动作' : '恢复自动折叠',
      onSelect: onCycleCollapseMode,
    })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <SectionHeader
        title="当天动作记录"
        description="先记组数和表现；动作名称、目标和备注收在每张卡的编辑区。"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={badgeTone}>{badgeLabel}</Badge>
        {hasWorkout && showTrainingModeAction ? (
          <Button variant={effectiveTrainingMode ? 'primary' : 'secondary'} className="px-3" onClick={onToggleTrainingMode}>
            {effectiveTrainingMode ? '训练模式中' : '训练模式'}
          </Button>
        ) : null}
        {hasWorkout ? (
          <SegmentedControl
            ariaLabel="动作筛选"
            value={showOnlyUnfinished ? 'unfinished' : 'all'}
            options={[
              { value: 'all', label: '全部动作' },
              { value: 'unfinished', label: '只看未完成', disabled: !hasIncompleteExercise && !showOnlyUnfinished },
            ]}
            onChange={(value) => onShowOnlyUnfinishedChange(value === 'unfinished')}
          />
        ) : null}
        {moreItems.length > 0 ? (
          <DropdownMenu label="更多" items={moreItems} triggerClassName="px-3" />
        ) : null}
      </div>
    </div>
  )
}
