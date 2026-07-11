import { Card, Button, Badge } from '../ui'
import type { WorkoutLog, ExerciseLog } from '../../types'

type WorkoutContextRailProps = {
  currentWorkout?: WorkoutLog
  currentExercise?: ExerciseLog
  previousRecord?: {
    date: string
    sets: Array<{ weight?: number; reps?: number }>
  }
  restTimer?: {
    isActive: boolean
    remainingSeconds: number
    onStart: () => void
    onStop: () => void
  }
}

export function WorkoutContextRail({
  currentWorkout,
  currentExercise,
  previousRecord,
  restTimer,
}: WorkoutContextRailProps) {
  if (!currentWorkout) {
    return (
      <Card className="elevation-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">训练助手</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          开始训练后，这里会显示实时指导和历史对比
        </p>
      </Card>
    )
  }

  const completedSets = currentWorkout.exercises
    .flatMap(ex => ex.sets)
    .filter(set => set.weight !== undefined && set.reps !== undefined).length

  const totalSets = currentWorkout.exercises
    .flatMap(ex => ex.sets).length

  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Workout Progress */}
      <Card className="elevation-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">训练进度</h3>
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {completedSets}/{totalSets}
            </span>
            <Badge tone={progress >= 80 ? 'positive' : progress >= 50 ? 'warning' : 'neutral'}>
              {Math.round(progress)}%
            </Badge>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Rest Timer */}
      {restTimer && (
        <Card className="elevation-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">休息计时</h3>
          {restTimer.isActive ? (
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {Math.floor(restTimer.remainingSeconds / 60)}:{String(restTimer.remainingSeconds % 60).padStart(2, '0')}
              </div>
              <Button variant="secondary" onClick={restTimer.onStop} className="mt-3 w-full">
                结束休息
              </Button>
            </div>
          ) : (
            <Button variant="primary" onClick={restTimer.onStart} className="w-full">
              开始休息
            </Button>
          )}
        </Card>
      )}

      {/* Current Exercise Guide */}
      {currentExercise && (
        <Card className="elevation-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            当前动作
          </h3>
          <div className="rounded-md bg-gradient-to-r from-cyan-50 to-blue-50 px-3 py-2 dark:from-cyan-950/30 dark:to-blue-950/30">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {currentExercise.name}
            </p>
            {currentExercise.notes && (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {currentExercise.notes}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Previous Record */}
      {previousRecord && (
        <Card className="elevation-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            上次记录
          </h3>
          <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
            {previousRecord.date}
          </div>
          <div className="space-y-1.5">
            {previousRecord.sets.slice(0, 5).map((set, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1.5 text-xs dark:bg-slate-800"
              >
                <span className="text-slate-500 dark:text-slate-500">组 {idx + 1}</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {set.weight}kg × {set.reps}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Tips */}
      <Card className="elevation-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">💡 提示</h3>
        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          <li>• 专注于动作质量，而非重量</li>
          <li>• 休息 2-3 分钟后再开始下组</li>
          <li>• 保持呼吸，避免憋气</li>
        </ul>
      </Card>
    </div>
  )
}
