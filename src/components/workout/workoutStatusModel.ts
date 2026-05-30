import type { RecommendationTone, WorkoutLog } from '../../types'
import type { WorkoutSummary } from '../../lib/workout'

export type WorkoutStatusView = {
  title: string
  message: string
  tone: RecommendationTone
}

export type WorkoutRecordBadgeView = {
  label: string
  tone: Exclude<RecommendationTone, 'danger'>
}

export function getWorkoutStatusView({
  restDay,
  selectedWorkout,
  workoutMarkedComplete,
  workoutSummary,
}: {
  restDay: boolean
  selectedWorkout: WorkoutLog | undefined
  workoutMarkedComplete: boolean
  workoutSummary: WorkoutSummary
}): WorkoutStatusView {
  if (restDay) {
    return {
      title: '今天休息',
      message: '训练页保持安静，重点放在睡眠、步数和营养执行。',
      tone: 'neutral',
    }
  }

  if (!selectedWorkout) {
    return {
      title: '准备开始训练',
      message: '先选择计划或创建空白训练。开始后手机端会切换到当前动作优先视图。',
      tone: 'neutral',
    }
  }

  if (workoutMarkedComplete) {
    return {
      title: '训练已完成',
      message: '本次训练已同步到今日记录，可以补充备注或保存为模板。',
      tone: 'positive',
    }
  }

  if (workoutSummary.completionPercent === 100) {
    return {
      title: '动作已填满',
      message: '动作记录已经完整，点确认完成后会同步到今日记录。',
      tone: 'positive',
    }
  }

  if (workoutSummary.filledSets > 0) {
    return {
      title: '训练进行中',
      message: '继续补完未完成组；手机上建议进入训练模式，用底部操作区完成当前动作。',
      tone: 'warning',
    }
  }

  return {
    title: '训练待开始',
    message: '动作已经准备好。先进入训练模式，再沿用上一组或上次记录快速录入。',
    tone: 'neutral',
  }
}

export function getWorkoutRecordBadge({
  workoutMarkedComplete,
  workoutSummary,
  hasWorkout,
}: {
  workoutMarkedComplete: boolean
  workoutSummary: WorkoutSummary
  hasWorkout: boolean
}): WorkoutRecordBadgeView {
  if (workoutMarkedComplete) return { label: '已完成', tone: 'positive' }
  if (workoutSummary.completionPercent === 100) return { label: '动作已满', tone: 'positive' }
  if (workoutSummary.filledSets > 0) return { label: '进行中', tone: 'warning' }
  if (hasWorkout) return { label: '待开始', tone: 'neutral' }
  return { label: '未开始', tone: 'neutral' }
}

export function getWorkoutCompletionHint({
  workoutMarkedComplete,
  workoutReadyToConfirm,
  remainingSetCount,
}: {
  workoutMarkedComplete: boolean
  workoutReadyToConfirm: boolean
  remainingSetCount: number
}): string {
  if (workoutMarkedComplete) return '本次训练已同步到今日记录。'
  if (workoutReadyToConfirm) return '所有组已填完，点确认完成即可同步到今日记录。'
  if (remainingSetCount > 0) return `还剩 ${remainingSetCount} 组需填重量和次数。`
  return '先记录一组训练。'
}

export function getWorkoutPrimaryLabel({
  restDay,
  selectedWorkout,
  workoutReadyToConfirm,
  workoutMarkedComplete,
  workoutSummary,
}: {
  restDay: boolean
  selectedWorkout: WorkoutLog | undefined
  workoutReadyToConfirm: boolean
  workoutMarkedComplete: boolean
  workoutSummary: WorkoutSummary
}): string | null {
  if (restDay || !selectedWorkout) return null
  if (workoutReadyToConfirm) return '确认完成'
  if (workoutMarkedComplete) return '查看训练'
  if (workoutSummary.filledSets > 0) return '继续训练'
  return '开始训练'
}

export function getWorkoutMobilePrimaryLabel({
  workoutMarkedComplete,
  workoutSummary,
}: {
  workoutMarkedComplete: boolean
  workoutSummary: WorkoutSummary
}): string {
  if (workoutMarkedComplete) return '查看训练'
  if (workoutSummary.completionPercent === 100) return '确认完成'
  if (workoutSummary.filledSets > 0) return '继续训练'
  return '开始训练'
}
