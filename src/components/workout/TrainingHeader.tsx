import { Button, Card } from '../ui'
import type { WorkoutSummary } from '../../lib/workout'
import { formatTime } from '../../lib/workout'
import { useState } from 'react'

export function TrainingHeader({
  workoutName,
  workoutSummary,
  workoutMarkedComplete,
  onExitTrainingMode,
}: {
  workoutName: string
  workoutSummary: WorkoutSummary
  workoutMarkedComplete: boolean
  onExitTrainingMode: () => void
}) {
  return (
    <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-700/40 dark:bg-emerald-900/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            训练模式
            {workoutMarkedComplete || workoutSummary.completionPercent === 100 ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white dark:bg-emerald-400 dark:text-emerald-950">
                {workoutMarkedComplete ? '✓ 已完成' : '动作已满'}
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
  workoutMarkedComplete,
  workoutReadyToConfirm,
  canFinishWorkout,
  remainingSetCount,
  onExitTrainingMode,
  onSkipRest,
  onAdjustRestDuration,
  onStartRest,
  onToggleAutoStart,
  onFinishWorkout,
}: {
  elapsedSeconds: number
  restSeconds: number
  restActive: boolean
  restDefaultDuration: number
  autoStartRest: boolean
  workoutMarkedComplete: boolean
  workoutReadyToConfirm: boolean
  canFinishWorkout: boolean
  remainingSetCount: number
  onExitTrainingMode: () => void
  onSkipRest: () => void
  onAdjustRestDuration: (delta: number) => void
  onStartRest: () => void
  onToggleAutoStart: () => void
  onFinishWorkout: () => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-lg transition hover:shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <svg className="h-4 w-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">{formatTime(elapsedSeconds)}</span>
        </div>
        {restActive && (
          <>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${restSeconds === 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                <svg className={`h-4 w-4 ${restSeconds === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className={`text-sm font-semibold tabular-nums ${restSeconds === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatTime(restSeconds)}
              </span>
            </div>
          </>
        )}
        <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">训练计时</span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label="收起"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
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
              结束休息
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
      {workoutMarkedComplete ? (
        <button
          type="button"
          onClick={onExitTrainingMode}
          className="mt-2 min-h-9 w-full rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          返回记录
        </button>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <button
              type="button"
              onClick={onFinishWorkout}
              disabled={!canFinishWorkout}
              title={workoutReadyToConfirm ? '所有组已填完，确认后同步到今日记录' : '现在结束本次训练，已记录的组会保留，今日记录会标记训练完成'}
              className="min-h-9 w-full rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              {workoutReadyToConfirm ? '确认完成' : '结束训练'}
            </button>
            <p className="mt-1 text-center text-[11px] text-slate-500 dark:text-slate-400">
              {workoutReadyToConfirm ? '可同步完成' : remainingSetCount > 0 ? `剩 ${remainingSetCount} 组，可结束` : '可结束训练'}
            </p>
          </div>
          <button
            type="button"
            onClick={onExitTrainingMode}
            className="min-h-9 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            退出训练模式
          </button>
        </div>
      )}
    </div>
  )
}
