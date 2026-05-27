import { Button, Card } from '../ui'
import type { WorkoutSummary } from '../../lib/workout'
import { formatTime } from '../../lib/workout'
import { useState } from 'react'

export function TrainingHeader({
  workoutName,
  workoutSummary,
  onExitTrainingMode,
}: {
  workoutName: string
  workoutSummary: WorkoutSummary
  onExitTrainingMode: () => void
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
    </Card>
  )
}

export function TrainingTimerFloat({
  elapsedSeconds,
  restSeconds,
  restActive,
  restDefaultDuration,
  autoStartRest,
  onExitTrainingMode,
  onSkipRest,
  onAdjustRestDuration,
  onStartRest,
  onToggleAutoStart,
}: {
  elapsedSeconds: number
  restSeconds: number
  restActive: boolean
  restDefaultDuration: number
  autoStartRest: boolean
  onExitTrainingMode: () => void
  onSkipRest: () => void
  onAdjustRestDuration: (delta: number) => void
  onStartRest: () => void
  onToggleAutoStart: () => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-40 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 p-2 text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          <span className="tabular-nums">{formatTime(elapsedSeconds)}</span>
          {restActive && (
            <>
              <span className="text-slate-400">·</span>
              <span className={`tabular-nums ${restSeconds === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatTime(restSeconds)}
              </span>
            </>
          )}
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">训练计时</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label="收起"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">训练时长</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-950 dark:text-slate-50">{formatTime(elapsedSeconds)}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">{restActive ? '组间休息' : '休息默认'}</p>
          <p className={`mt-0.5 text-xl font-bold tabular-nums ${restSeconds === 0 && restActive ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
            {restActive ? formatTime(restSeconds) : `${restDefaultDuration}s`}
          </p>
        </div>
      </div>

      {restActive ? (
        <div
          className={`mt-3 rounded-lg border p-3 text-center ${
            restSeconds === 0
              ? 'border-amber-400 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-900/30 [animation:rest-pulse_1s_ease-in-out_infinite]'
              : 'border-emerald-300 bg-emerald-50 dark:border-emerald-600/40 dark:bg-emerald-900/20'
          }`}
        >
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {restSeconds === 0 ? '休息时间到！' : '组间休息'}
          </p>
          <p
            className={`mt-1 text-3xl font-bold tabular-nums ${
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
              完成休息
            </button>
            <button
              type="button"
              onClick={() => onAdjustRestDuration(15)}
              className="min-h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              +15s
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={onStartRest}
            className="min-h-10 rounded-md border border-emerald-300 bg-white px-4 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-600/40 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
          >
            开始组间休息 ({restDefaultDuration}s)
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
            <input
              type="checkbox"
              checked={autoStartRest}
              onChange={onToggleAutoStart}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700"
            />
            <span>完成组后自动开始休息</span>
          </label>
        </div>
      )}
      <button
        type="button"
        onClick={onExitTrainingMode}
        className="mt-2 min-h-9 w-full rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        退出训练模式
      </button>
    </div>
  )
}
