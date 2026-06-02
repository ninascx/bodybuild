import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { buildExportCsvText, buildExportResultSummary, buildExportSummaryText, buildScopedExportPayload } from '../src/lib/exportPayload'
import { buildTrainingPerformanceData, buildTrendData, createWeeklySummary } from '../src/lib/metrics'
import type { UserExportPayload } from '../src/lib/storage'
import type { WorkoutLog } from '../src/types'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function checkMetrics() {
  const workoutLogs: WorkoutLog[] = [
    {
      date: '2026-05-01',
      workoutName: '自定义推',
      exercises: [
        {
          exerciseId: 'custom-incline-db',
          name: '上斜哑铃推',
          target: '3 组 x 8-12 次',
          sets: [{ weight: 24, reps: 10 }],
        },
      ],
    },
    {
      date: '2026-05-08',
      workoutName: '自定义推',
      exercises: [
        {
          exerciseId: 'custom-incline-db',
          name: '上斜哑铃推 改名',
          target: '3 组 x 8-12 次',
          sets: [{ weight: 26, reps: 9 }],
        },
        {
          exerciseId: 'custom-row',
          name: '器械划船改名版',
          target: '3 组 x 10 次',
          sets: [{ weight: 55, reps: 10 }],
        },
      ],
    },
    {
      date: '2026-05-12',
      workoutName: '有氧日',
      exercises: [],
      cardio: [{ id: 'cardio-1', mode: '跑步机', durationMin: 30 }],
    },
    {
      date: '2026-05-15',
      workoutName: '缺少重量',
      exercises: [{ exerciseId: 'reps-only', name: '俯卧撑', target: '3 组', sets: [{ reps: 20 }] }],
    },
  ]

  const performance = buildTrainingPerformanceData(workoutLogs, '2026-06-02', 60)
  assert.equal(performance.series.length, 2)
  assert.equal(performance.series[0]?.label, '上斜哑铃推 改名')
  assert.equal(performance.series[0]?.count, 2)
  assert.equal(performance.series[0]?.latestValue, 33.8)
  assert.equal(performance.totalLoggedExercises, 4)
  assert.equal(performance.totalScoredExercises, 3)

  const trends = buildTrendData(
    [
      { date: '2026-05-01', morningWeightKg: 80, calories: 2200, protein: 160 },
      { date: '2026-05-02', morningWeightKg: 79.8, calories: 2100, protein: 172 },
      { date: '2026-05-03', waistCm: 87 },
    ],
    '2026-05-03',
    7,
  )
  assert.equal(trends.length, 3)
  assert.equal(trends.filter((point) => typeof point.weightAverage7 === 'number').length, 3)
  assert.equal(trends[2]?.weightAverage7, 79.9)

  const weekly = createWeeklySummary(
    [
      { date: '2026-05-31', morningWeightKg: 80, calories: 2200, trained: true, workoutCompletion: 100 },
      { date: '2026-06-01', morningWeightKg: 79.7, calories: 2100, trained: true, workoutCompletion: 80 },
    ],
    '2026-06-01',
  )
  assert.equal(weekly.weekStart, '2026-05-31')
  assert.ok(Number.isFinite(weekly.trainingCompletionRate))
}

function checkExportPayload() {
  const payload: UserExportPayload = {
    version: 1,
    exportedAt: '2026-06-02T00:00:00.000Z',
    dailyLogs: [{ date: '2026-06-01', morningWeightKg: 79.7, calories: 2100, notes: 'ok, quoted "note"' }],
    workoutLogs: [
      {
        date: '2026-06-01',
        workoutName: '拉 A',
        exercises: [{ exerciseId: 'row', name: '器械划船', target: '3 组 x 10 次', sets: [{ weight: 55, reps: 10 }] }],
        cardio: [{ id: 'cardio', mode: '椭圆机', durationMin: 20, intensity: '中' }],
      },
    ],
    workoutTemplates: [],
    profile: { trainingDays: [] },
    planData: { dailyTargets: {} as UserExportPayload['planData']['dailyTargets'], workoutPlans: {} as UserExportPayload['planData']['workoutPlans'] },
    preference: {},
  }
  const scoped = buildScopedExportPayload(
    payload,
    {
      rangePreset: 'last7',
      startDate: '2026-06-01',
      endDate: '2026-06-01',
      includeDailyLogs: true,
      includeWorkoutLogs: true,
      includeWorkoutTemplates: false,
      includeProfile: false,
      includePlanData: false,
      includePreference: false,
      slimMode: true,
    },
    '2026-06-02',
  )

  assert.equal(scoped.exportScope.dailyLogCount, 1)
  assert.equal(scoped.exportScope.workoutLogCount, 1)
  assert.match(buildExportSummaryText(scoped), /器械划船/)
  assert.match(buildExportCsvText(scoped), /workout_cardio/)
  assert.equal(buildExportResultSummary(scoped, 'csv'), '每日行 1 条，训练组 1 条，有氧 1 条，模板 0 个')
}

function checkPwaConfig() {
  const config = read('vite.config.ts')
  assert.match(config, /registerType:\s*'autoUpdate'/)
  assert.match(config, /clientsClaim:\s*true/)
  assert.match(config, /skipWaiting:\s*true/)
  assert.match(config, /cleanupOutdatedCaches:\s*true/)
  assert.match(config, /navigateFallbackDenylist:\s*\[\/\^\\\/api\\\//)
  assert.match(config, /enabled:\s*false/)
}

function checkUiConsistency() {
  const css = read('src/index.css')
  const quickJump = read('src/components/workout/ExerciseQuickJumpStrip.tsx')
  const workoutTab = read('src/tabs/WorkoutTab.tsx')
  const trainingHeader = read('src/components/workout/TrainingHeader.tsx')
  const mainNavigation = read('src/components/layout/MainNavigation.tsx')
  const mobileBottomBar = read('src/components/workout/MobileWorkoutBottomBar.tsx')
  const dropdown = read('src/components/ui/DropdownMenu.tsx')

  assert.match(css, /prefers-reduced-motion:\s*reduce/)
  assert.doesNotMatch(quickJump, /z-\[/)
  assert.doesNotMatch(workoutTab, /animate-\[/)
  assert.doesNotMatch(trainingHeader, /rest-pulse_1s_ease-in-out_infinite/)
  assert.match(mainNavigation, /env\(safe-area-inset-bottom\)/)
  assert.match(mobileBottomBar, /env\(safe-area-inset-bottom\)/)
  assert.match(dropdown, /role="menu"/)
  assert.match(dropdown, /truncate/)
}

checkMetrics()
checkExportPayload()
checkPwaConfig()
checkUiConsistency()

console.log('App health checks passed')
