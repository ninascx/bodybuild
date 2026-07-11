import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dailyTargets } from '../src/data/plans'
import {
  buildCopyYesterdayPatch,
  keyRecordCompletion,
  keyRecordState,
} from '../src/components/daily/dailyRecordActions'
import { buildDailyRecordStatus } from '../src/components/daily/dailyRecordStatus'
import { buildTodayChecklist } from '../src/lib/productFlow'

const copyResult = buildCopyYesterdayPatch(
  { calories: 2300, sleepHours: 7.5 },
  { calories: 2100, protein: 170, steps: 8000, sleepHours: 8, fatigueScore: 4 },
)
assert.deepEqual(copyResult.patch, { protein: 170, steps: 8000, fatigueScore: 4 })
assert.equal(copyResult.filledCount, 3)
assert.equal(copyResult.preservedCount, 2)

assert.deepEqual(
  keyRecordCompletion({ weight: 72.4, calories: 2100, protein: undefined }),
  { completed: 2, total: 3 },
)

const missingWeight = keyRecordState({ calories: 2100, protein: 170 })
assert.equal(missingWeight.title, '还差：体重')
assert.equal(missingWeight.firstMissing?.key, 'weight')

const missingStatus = buildDailyRecordStatus({
  log: { calories: 2100, protein: 170 },
  target: dailyTargets[1],
})
assert.deepEqual(missingStatus.primaryAction, { kind: 'focus', label: '填写体重', focusKey: 'weight' })

const readyToTrain = buildDailyRecordStatus({
  weight: 72.4,
  log: { calories: 2100, protein: 170 },
  target: dailyTargets[1],
})
assert.deepEqual(readyToTrain.primaryAction, { kind: 'workout', label: '记录当日训练' })

const existingWorkout = buildDailyRecordStatus({
  weight: 72.4,
  log: { calories: 2100, protein: 170 },
  target: dailyTargets[1],
  workout: { date: '2026-07-10', workoutName: '拉 A', exercises: [] },
})
assert.deepEqual(existingWorkout.primaryAction, { kind: 'workout', label: '查看训练记录' })

const restDayComplete = buildDailyRecordStatus({
  weight: 72.4,
  log: { calories: 2800, protein: 160 },
  target: dailyTargets[5],
})
assert.equal(restDayComplete.primaryAction, undefined)

const bodyOnlyChecklist = buildTodayChecklist(undefined, dailyTargets[1], 72.4)
assert.equal(bodyOnlyChecklist.find((item) => item.key === 'weight')?.done, true)
assert.equal(bodyOnlyChecklist.find((item) => item.key === 'calories')?.done, false)

const legacyOnlyChecklist = buildTodayChecklist({ morningWeightKg: 80 }, dailyTargets[1])
assert.equal(
  legacyOnlyChecklist.find((item) => item.key === 'weight')?.done,
  false,
  'today checklist must read weight from BodyRecord input instead of legacy DailyLog fields',
)

const recordTabSource = readFileSync(
  join(process.cwd(), 'src', 'tabs', 'DailyRecordTab.tsx'),
  'utf8',
)
assert.match(recordTabSource, /max-w-\[73\.75rem\]/)
assert.match(recordTabSource, /xl:grid-cols-\[minmax\(0,1fr\)_18rem\]/)
assert.match(recordTabSource, /DailyHistoryDialog/)
assert.doesNotMatch(recordTabSource, /DailyRecordDesktopDateRail/)
assert.doesNotMatch(recordTabSource, /DailyRecordDesktopAside/)
assert.doesNotMatch(recordTabSource, /2xl:grid-cols/)
assert.doesNotMatch(recordTabSource, /<main/)

const numberFieldSource = readFileSync(
  join(process.cwd(), 'src', 'components', 'NumberField.tsx'),
  'utf8',
)
assert.match(numberFieldSource, /controlPlacement\?: 'footer' \| 'inline'/)
assert.match(numberFieldSource, /value === undefined \? null/)

const calendarSource = readFileSync(
  join(process.cwd(), 'src', 'components', 'MiniCalendar.tsx'),
  'utf8',
)
assert.match(calendarSource, /tabIndex=\{!cell\.isFuture && cell\.date === tabStopDate \? 0 : -1\}/)
assert.match(calendarSource, /ArrowLeft/)

const toolbarSource = readFileSync(
  join(process.cwd(), 'src', 'components', 'daily', 'DailyRecordToolbar.tsx'),
  'utf8',
)
assert.match(toolbarSource, /density="toolbar"/)
assert.match(toolbarSource, /getLiftLogSaveLabel/)

const historyDialogSource = readFileSync(
  join(process.cwd(), 'src', 'components', 'daily', 'DailyHistoryDialog.tsx'),
  'utf8',
)
assert.match(historyDialogSource, /event\.key !== 'Escape'/)
assert.match(historyDialogSource, /hasHistoryContent/)
assert.doesNotMatch(historyDialogSource, /最近趋势/)

const essentialsSource = readFileSync(
  join(process.cwd(), 'src', 'components', 'daily', 'DailyEssentialsForm.tsx'),
  'utf8',
)
assert.match(essentialsSource, /controlPlacement="inline"/)
assert.match(essentialsSource, /props\.hasCopyableYesterdayFields \? \(/)
assert.doesNotMatch(essentialsSource, /disabled=\{!props\.hasCopyableYesterdayFields\}/)

console.log('Daily record UX checks passed')
