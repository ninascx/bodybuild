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
const planTab = source('src', 'tabs', 'PlanTab.tsx')
const workoutToolbar = source('src', 'components', 'workout', 'WorkoutRecordToolbar.tsx')
const app = source('src', 'App.tsx')
const unsavedDialog = source('src', 'components', 'UnsavedChangesDialog.tsx')
const loginScreen = source('src', 'components', 'layout', 'LoginScreen.tsx')

assert.match(workoutTab, /xl:grid-cols-\[17\.5rem_minmax\(32rem,1fr\)\]/)
assert.match(workoutTab, /2xl:grid-cols-\[17\.5rem_minmax\(32rem,1fr\)_20rem\]/)
assert.doesNotMatch(workoutTab, /lg:grid-cols-\[17\.5rem_minmax\(0,1fr\)_20rem\]/)
assert.match(workoutTab, /WorkoutSessionSummaryBar/)
assert.doesNotMatch(workoutTab, /WorkoutTemplateManager/)
assert.match(planTab, /WorkoutTemplateManager/)
assert.match(planTab, /每周关联/)
assert.match(planTab, /模板库/)
assert.match(workoutToolbar, /DropdownMenu/)
assert.doesNotMatch(workoutToolbar, />\s*新增动作\s*</)
assert.match(settingsTab, /useUnsavedChangesDialog/)
assert.match(app, /resolveSettingsChanges/)
assert.match(app, /event\.returnValue = ''/)
assert.match(unsavedDialog, /保存并离开/)
assert.match(unsavedDialog, /放弃修改/)
assert.match(unsavedDialog, /继续编辑/)
assert.match(loginScreen, /label="用户名"/)

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
