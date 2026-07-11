/* eslint-disable react-refresh/only-export-components */
import { Button } from './ui'
import { EmptyState } from './ui'
import type { IconBadgeIcon } from './ui/IconBadge'

type EmptyStateAction = {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

type CommonEmptyStateProps = {
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
}

// No workout history
export function NoWorkoutHistory({ action, secondaryAction }: CommonEmptyStateProps) {
  return (
    <EmptyState
      icon="dumbbell"
      title="还没有训练记录"
      message="开始你的第一次训练，记录每一次进步。每一组都是向目标迈进的一步。"
      tone="neutral"
    >
      {action && (
        <div className="mt-4 flex gap-2">
          <Button variant={action.variant ?? 'primary'} onClick={action.onClick}>
            {action.label}
          </Button>
          {secondaryAction && (
            <Button variant={secondaryAction.variant ?? 'secondary'} onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </EmptyState>
  )
}

// No daily records
export function NoDailyRecords({ action }: CommonEmptyStateProps) {
  return (
    <EmptyState
      icon="target"
      title="暂无每日记录"
      message="记录你的体重、饮食和活动，了解身体的变化规律。"
      tone="neutral"
    >
      {action && (
        <Button variant={action.variant ?? 'primary'} onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </EmptyState>
  )
}

// Insufficient data for analytics
export function InsufficientDataForAnalytics({ action, secondaryAction }: CommonEmptyStateProps) {
  return (
    <EmptyState
      icon="chart"
      title="数据还不够"
      message="至少需要 7 天的完整记录才能生成有意义的趋势分析。继续记录，数据会自动汇总。"
      tone="neutral"
    >
      {action && (
        <div className="mt-4 flex gap-2">
          <Button variant={action.variant ?? 'primary'} onClick={action.onClick}>
            {action.label}
          </Button>
          {secondaryAction && (
            <Button variant={secondaryAction.variant ?? 'secondary'} onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </EmptyState>
  )
}

// No workout templates
export function NoWorkoutTemplates({ action }: CommonEmptyStateProps) {
  return (
    <EmptyState
      icon="star"
      title="还没有训练模板"
      message="创建训练模板可以快速开始每次训练，无需重复输入动作。"
      tone="neutral"
    >
      {action && (
        <Button variant={action.variant ?? 'primary'} onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </EmptyState>
  )
}

// Search no results
export function NoSearchResults({ query, onClear }: { query: string; onClear?: () => void }) {
  return (
    <EmptyState
      title="没有找到结果"
      message={`找不到包含 "${query}" 的内容。试试其他关键词？`}
      tone="neutral"
    >
      {onClear && (
        <Button variant="secondary" onClick={onClear} className="mt-4">
          清除搜索
        </Button>
      )}
    </EmptyState>
  )
}

// No achievements yet
export function NoAchievements() {
  return (
    <EmptyState
      icon="trophy"
      title="还没有成就"
      message="坚持训练和记录，你会解锁各种成就徽章。第一个成就往往比你想象的更近。"
      tone="positive"
    />
  )
}

// Connection error
export function ConnectionError({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      title="连接失败"
      message="无法连接到服务器。请检查网络连接后重试。"
      tone="danger"
    >
      {onRetry && (
        <Button variant="primary" onClick={onRetry} className="mt-4">
          重新连接
        </Button>
      )}
    </EmptyState>
  )
}

// Generic empty state creator
export function createEmptyState(
  icon: IconBadgeIcon,
  title: string,
  message: string,
  action?: EmptyStateAction
) {
  return function CustomEmptyState() {
    return (
      <EmptyState icon={icon} title={title} message={message} tone="neutral">
        {action && (
          <Button variant={action.variant ?? 'primary'} onClick={action.onClick} className="mt-4">
            {action.label}
          </Button>
        )}
      </EmptyState>
    )
  }
}
