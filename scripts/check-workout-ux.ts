import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function source(...parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), 'utf8')
}

const workoutTab = source('src', 'tabs', 'WorkoutTab.tsx')
const commandRail = source('src', 'components', 'workout', 'WorkoutDesktopCommandRail.tsx')
const sessionRail = source('src', 'components', 'workout', 'WorkoutDesktopSessionRail.tsx')
const mobileExercise = source('src', 'components', 'workout', 'MobileCurrentExerciseView.tsx')
const workoutControl = source('src', 'components', 'workout', 'WorkoutControlPanel.tsx')
const numberField = source('src', 'components', 'NumberField.tsx')
const mainNavigation = source('src', 'components', 'layout', 'MainNavigation.tsx')
const settingsTab = source('src', 'tabs', 'SettingsTab.tsx')

assert.match(workoutTab, /xl:grid-cols-\[17\.5rem_minmax\(32rem,1fr\)\]/)
assert.match(workoutTab, /2xl:grid-cols-\[17\.5rem_minmax\(32rem,1fr\)_20rem\]/)
assert.doesNotMatch(workoutTab, /lg:grid-cols-\[17\.5rem_minmax\(0,1fr\)_20rem\]/)
assert.match(workoutTab, /WorkoutSessionSummaryBar/)

assert.doesNotMatch(commandRail, /overflow-y-auto/)
assert.doesNotMatch(sessionRail, /overflow-y-auto/)
assert.doesNotMatch(commandRail, /max-h-\[calc\(100vh/)
assert.doesNotMatch(sessionRail, /max-h-\[calc\(100vh/)

assert.doesNotMatch(mobileExercise, /window\.confirm/)
assert.match(mobileExercise, /useConfirm/)
assert.match(workoutControl, /从训记导入训练/)
assert.doesNotMatch(workoutControl, />\s*同步训记\s*</)

assert.doesNotMatch(numberField, /onWheel=/)
assert.doesNotMatch(mainNavigation, /backdrop-blur|shadow-2xl|drop-shadow/)
assert.match(settingsTab, /资料与目标/)
assert.match(settingsTab, /训练计划/)
assert.match(settingsTab, /训记连接/)

console.log('Workout and core UI UX checks passed')
