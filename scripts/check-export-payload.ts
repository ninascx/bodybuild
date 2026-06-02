import { strict as assert } from 'node:assert'
import { buildExportCsvText, buildExportResultSummary, buildExportSummaryText, buildScopedExportPayload } from '../src/lib/exportPayload'
import type { UserExportPayload } from '../src/lib/storage'

const fixture: UserExportPayload = {
  version: 1,
  exportedAt: '2026-05-28T00:00:00.000Z',
  dailyLogs: [
    { date: '2026-05-01' },
    { date: '2026-05-20', morningWeightKg: 80, calories: 2200 },
    { date: '2026-05-28', notes: 'manual check, "ok"' },
  ],
  workoutLogs: [
    {
      date: '2026-05-20',
      workoutName: '推',
      exercises: [
        {
          exerciseId: 'bench',
          name: '卧推',
          target: '3 组 × 8-12 次',
          sets: [{ weight: 80, reps: 8 }, {}, { rir: 2 }],
        },
        {
          exerciseId: 'empty',
          name: '空动作',
          target: '3 组 × 10 次',
          sets: [{}],
        },
      ],
      cardio: [{ id: 'cardio-1', mode: '跑步机', durationMin: 25, intensity: '中', notes: '坡度 5' }],
    },
    {
      date: '2026-05-28',
      workoutName: '空训练',
      exercises: [{ exerciseId: 'empty-day', name: '空动作', target: '3 组 × 8 次', sets: [{}] }],
    },
  ],
  workoutTemplates: [
    {
      id: 'template-1',
      name: '模板',
      focus: '推',
      category: '自定义',
      exercises: [{ id: 'bench', name: '卧推', prescription: '3 组 × 8-12 次' }],
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z',
    },
  ],
  profile: { trainingDays: [] },
  planData: {
    dailyTargets: {} as UserExportPayload['planData']['dailyTargets'],
    workoutPlans: {} as UserExportPayload['planData']['workoutPlans'],
  },
  preference: {},
}

const slim = buildScopedExportPayload(
  fixture,
  {
    rangePreset: 'last30',
    startDate: '2026-05-28',
    endDate: '2026-05-28',
    includeDailyLogs: true,
    includeWorkoutLogs: true,
    includeWorkoutTemplates: false,
    includeProfile: false,
    includePlanData: false,
    includePreference: false,
    slimMode: true,
  },
  '2026-05-28',
)

assert.equal(slim.exportScope.dailyLogCount, 2)
assert.equal(slim.exportScope.workoutLogCount, 1)
assert.deepEqual(slim.dailyLogs?.map((log) => log.date), ['2026-05-20', '2026-05-28'])
assert.equal(slim.workoutLogs?.[0]?.exercises.length, 1)
assert.equal(slim.workoutLogs?.[0]?.exercises[0]?.sets.length, 2)
const summary = buildExportSummaryText(slim)
assert.match(summary, /训练饮食记录摘要/)
assert.match(summary, /内容：每日记录、训练记录/)
assert.match(summary, /2026-05-20：80kg，2200kcal/)
assert.match(summary, /卧推：1\. 80kg x 8次；2\. RIR2/)
assert.match(summary, /有氧 跑步机：25min；强度：中；备注：坡度 5/)
const csv = buildExportCsvText(slim)
assert.match(csv, /daily_logs\n/)
assert.match(csv, /date,morningWeightKg,calories,notes/)
assert.doesNotMatch(csv, /protein/)
assert.match(csv, /2026-05-28,,,"manual check, ""ok"""/)
assert.match(csv, /workout_sets\n/)
assert.match(csv, /2026-05-20,推,卧推,1,80,8,/)
assert.match(csv, /2026-05-20,推,卧推,2,,,2/)
assert.match(csv, /workout_cardio\n/)
assert.match(csv, /2026-05-20,推,跑步机,25,中,坡度 5/)
assert.equal(buildExportResultSummary(slim, 'csv'), '每日行 2 条，训练组 2 条，有氧 1 条，模板 0 个')
assert.equal(buildExportResultSummary(slim, 'summary'), '每日 2 条，训练 1 条，模板 0 个')

const repsOnlyCsv = buildExportCsvText({
  version: 1,
  exportedAt: '2026-05-28T00:00:00.000Z',
  exportScope: {
    rangePreset: 'today',
    startDate: '2026-05-28',
    endDate: '2026-05-28',
    sections: ['workoutLogs'],
    dailyLogCount: 0,
    workoutLogCount: 1,
    workoutTemplateCount: 0,
    slimMode: true,
  },
  workoutLogs: [
    {
      date: '2026-05-28',
      workoutName: '自重',
      exercises: [{ exerciseId: 'push-up', name: '俯卧撑', target: '3 组', sets: [{ reps: 20 }] }],
    },
  ],
})

assert.match(repsOnlyCsv, /date,workoutName,exerciseName,setIndex,reps/)
assert.doesNotMatch(repsOnlyCsv, /weight/)
assert.doesNotMatch(repsOnlyCsv, /rir/)
assert.match(repsOnlyCsv, /2026-05-28,自重,俯卧撑,1,20/)

const workoutOnlyCsv = buildExportCsvText({
  version: 1,
  exportedAt: '2026-05-28T00:00:00.000Z',
  exportScope: {
    rangePreset: 'today',
    startDate: '2026-05-28',
    endDate: '2026-05-28',
    sections: ['dailyLogs', 'workoutLogs'],
    dailyLogCount: 0,
    workoutLogCount: 1,
    workoutTemplateCount: 0,
    slimMode: true,
  },
  dailyLogs: [],
  workoutLogs: [
    {
      date: '2026-05-28',
      workoutName: '拉',
      exercises: [{ exerciseId: 'row', name: '划船', target: '3 组', sets: [{ weight: 60, reps: 10 }] }],
    },
  ],
})

assert.doesNotMatch(workoutOnlyCsv, /daily_logs/)
assert.match(workoutOnlyCsv, /^workout_sets\n/)

const fullWorkoutCsv = buildExportCsvText({
  version: 1,
  exportedAt: '2026-05-28T00:00:00.000Z',
  exportScope: {
    rangePreset: 'today',
    startDate: '2026-05-28',
    endDate: '2026-05-28',
    sections: ['workoutLogs'],
    dailyLogCount: 0,
    workoutLogCount: 1,
    workoutTemplateCount: 0,
    slimMode: false,
  },
  workoutLogs: [
    {
      date: '2026-05-28',
      workoutName: '完整',
      exercises: [{ exerciseId: 'bench', name: '卧推', target: '3 组', sets: [{ weight: 80 }, {}, { reps: 8 }] }],
    },
  ],
})

assert.match(fullWorkoutCsv, /2026-05-28,完整,卧推,1,80,/)
assert.match(fullWorkoutCsv, /2026-05-28,完整,卧推,3,,8/)
assert.doesNotMatch(fullWorkoutCsv, /2026-05-28,完整,卧推,2,,/)

const dateOnlyDailyCsv = buildExportCsvText({
  version: 1,
  exportedAt: '2026-05-28T00:00:00.000Z',
  exportScope: {
    rangePreset: 'today',
    startDate: '2026-05-28',
    endDate: '2026-05-28',
    sections: ['dailyLogs'],
    dailyLogCount: 1,
    workoutLogCount: 0,
    workoutTemplateCount: 0,
    slimMode: false,
  },
  dailyLogs: [{ date: '2026-05-28' }],
})

assert.equal(dateOnlyDailyCsv, '\n')

const notesOnlyWorkoutCsv = buildExportCsvText({
  version: 1,
  exportedAt: '2026-05-28T00:00:00.000Z',
  exportScope: {
    rangePreset: 'today',
    startDate: '2026-05-28',
    endDate: '2026-05-28',
    sections: ['workoutLogs'],
    dailyLogCount: 0,
    workoutLogCount: 1,
    workoutTemplateCount: 0,
    slimMode: true,
  },
  workoutLogs: [
    {
      date: '2026-05-28',
      workoutName: '备注',
      exercises: [],
      notes: '只记录感受',
    },
  ],
})

assert.equal(notesOnlyWorkoutCsv, '\n')

const compactSummary = buildExportSummaryText({
  version: 1,
  exportedAt: '2026-05-28T00:00:00.000Z',
  exportScope: {
    rangePreset: 'all',
    sections: ['dailyLogs', 'workoutLogs'],
    dailyLogCount: 2,
    workoutLogCount: 2,
    workoutTemplateCount: 0,
    slimMode: false,
  },
  dailyLogs: [{ date: '2026-05-01' }, { date: '2026-05-02', calories: 2100 }],
  workoutLogs: [
    {
      date: '2026-05-01',
      workoutName: '空训练',
      exercises: [{ exerciseId: 'empty', name: '空动作', target: '3 组', sets: [{}] }],
    },
    {
      date: '2026-05-02',
      workoutName: '备注训练',
      exercises: [{ exerciseId: 'note', name: '动作感受', target: '3 组', sets: [{}], notes: '肩舒服' }],
      notes: '整体轻松',
    },
  ],
})

assert.doesNotMatch(compactSummary, /2026-05-01/)
assert.doesNotMatch(compactSummary, /空动作/)
assert.match(compactSummary, /2026-05-02：2100kcal/)
assert.match(compactSummary, /动作感受：备注：肩舒服/)
assert.match(compactSummary, /整体轻松/)

const full = buildScopedExportPayload(
  fixture,
  {
    rangePreset: 'all',
    startDate: '2026-05-28',
    endDate: '2026-05-28',
    includeDailyLogs: true,
    includeWorkoutLogs: true,
    includeWorkoutTemplates: true,
    includeProfile: true,
    includePlanData: true,
    includePreference: true,
    slimMode: false,
  },
  '2026-05-28',
)

assert.equal(full.exportScope.dailyLogCount, 3)
assert.equal(full.exportScope.workoutLogCount, 2)
assert.equal(full.exportScope.workoutTemplateCount, 1)
assert.equal(full.workoutLogs?.[0]?.exercises[0]?.sets.length, 3)
assert.ok(full.profile)
assert.ok(full.planData)
assert.ok(full.preference)
assert.equal(buildExportResultSummary(full, 'json'), '每日 3 条，训练 2 条，模板 1 个，其他 3 项')
assert.equal(buildExportResultSummary(full, 'summary'), '每日 2 条，训练 1 条，模板 1 个，其他 3 项')

const reversedCustom = buildScopedExportPayload(
  fixture,
  {
    rangePreset: 'custom',
    startDate: '2026-05-28',
    endDate: '2026-05-20',
    includeDailyLogs: true,
    includeWorkoutLogs: false,
    includeWorkoutTemplates: false,
    includeProfile: false,
    includePlanData: false,
    includePreference: false,
    slimMode: true,
  },
  '2026-05-28',
)

assert.equal(reversedCustom.exportScope.startDate, '2026-05-20')
assert.equal(reversedCustom.exportScope.endDate, '2026-05-28')
assert.deepEqual(reversedCustom.dailyLogs?.map((log) => log.date), ['2026-05-20', '2026-05-28'])

const selectedWeek = buildScopedExportPayload(
  fixture,
  {
    rangePreset: 'thisWeek',
    startDate: '2026-05-28',
    endDate: '2026-05-28',
    includeDailyLogs: true,
    includeWorkoutLogs: false,
    includeWorkoutTemplates: false,
    includeProfile: false,
    includePlanData: false,
    includePreference: false,
    slimMode: true,
  },
  '2026-05-20',
)

assert.equal(selectedWeek.exportScope.startDate, '2026-05-17')
assert.equal(selectedWeek.exportScope.endDate, '2026-05-23')
assert.deepEqual(selectedWeek.dailyLogs?.map((log) => log.date), ['2026-05-20'])

console.log('Export payload checks passed')
