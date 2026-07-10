import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dailyTargets } from '../src/data/plans'
import {
  buildCopyYesterdayPatch,
  keyRecordCompletion,
} from '../src/components/daily/dailyRecordActions'
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
assert.match(recordTabSource, /xl:grid-cols-\[17\.5rem_minmax\(0,1fr\)\]/)
assert.match(recordTabSource, /2xl:grid-cols-\[17\.5rem_minmax\(32rem,1fr\)_19rem\]/)
assert.doesNotMatch(recordTabSource, /lg:grid-cols-\[17\.5rem_minmax\(0,1fr\)_19rem\]/)

console.log('Daily record UX checks passed')
