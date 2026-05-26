import { Button, Card } from '../ui'
import type { WorkoutSummary } from '../../lib/workout'

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function TrainingHeader({
  workoutName,
  workoutSummary,
  elapsedSeconds,
  restSeconds,
  restActive,
  restDefaultDuration,
  onExitTrainingMode,
  onSkipRest,
  onAdjustRestDuration,
  onStartRest,
}: {
  workoutName: string
  workoutSummary: WorkoutSummary
  elapsedSeconds: number
  restSeconds: number
  restActive: boolean
  restDefaultDuration: number
  onExitTrainingMode: () => void
  onSkipRest: () => void
  onAdjustRestDuration: (delta: number) => void
  onStartRest: () => void
}) {
  return (
    <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-700/40 dark:bg-emerald-900/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            训练模式
            {workoutSummary.completionPercent === 100 ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white dark:bg-emerald-400 dark:text-emerald-950">
                ✓ 全部完成
              </span>
            ) : null}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-emerald-950 dark:text-emerald-100">{workoutName}</h2>
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
            训练时长 {formatTime(elapsedSeconds)}
          </p>
        </div>
        <Button variant="secondary" className="px-3" onClick={onExitTrainingMode}>
          退出训练模式
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-white p-2 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">已填组数</p>
          <p className="mt-0.5 font-semibold text-slate-950 dark:text-slate-50">
            {workoutSummary.filledSets}/{workoutSummary.totalSets}
          </p>
        </div>
        <div className="rounded-md bg-white p-2 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">完成率</p>
          <p className="mt-0.5 font-semibold text-slate-950 dark:text-slate-50">
            {workoutSummary.completionPercent}%
          </p>
        </div>
        <div className="rounded-md bg-white p-2 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">训练量</p>
          <p className="mt-0.5 font-semibold text-slate-950 dark:text-slate-50">
            {Math.round(workoutSummary.totalVolume)} kg
          </p>
        </div>
      </div>

      {restActive ? (
        <div
          className={`mt-4 rounded-lg border p-4 text-center ${
            restSeconds === 0
              ? 'border-amber-400 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-900/30 [animation:rest-pulse_1s_ease-in-out_infinite]'
              : 'border-emerald-300 bg-emerald-50 dark:border-emerald-600/40 dark:bg-emerald-900/20'
          }`}
        >
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {restSeconds === 0 ? '休息时间到！' : '组间休息'}
          </p>
          <p
            className={`mt-1 text-4xl font-bold tabular-nums ${
              restSeconds === 0
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {formatTime(restSeconds)}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => onAdjustRestDuration(-15)}
              className="min-h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              -15s
            </button>
            <button
              type="button"
              onClick={onSkipRest}
              className="min-h-9 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              跳过休息
            </button>
            <button
              type="button"
              onClick={() => onAdjustRestDuration(15)}
              className="min-h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              +15s
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            默认休息 {restDefaultDuration}s
          </p>
        </div>
      ) : (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onStartRest}
            className="min-h-9 rounded-md border border-emerald-300 bg-white px-4 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-600/40 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
          >
            开始组间休息 ({restDefaultDuration}s)
          </button>
        </div>
      )}
    </Card>
  )
}
