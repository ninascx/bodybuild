import type { UserExportPayload } from './storage'
import { addDays, endOfWeekSaturday, isDateInRange, startOfWeekSunday } from './dates'
import type { DailyLog, ExerciseLog, ExerciseSetLog, WorkoutLog } from '../types'

export type ExportRangePreset = 'today' | 'thisWeek' | 'last7' | 'last30' | 'thisMonth' | 'all' | 'custom'
export type ExportFormat = 'json' | 'summary' | 'copySummary' | 'csv'

export type ExportOptions = {
  rangePreset: ExportRangePreset
  startDate: string
  endDate: string
  includeDailyLogs: boolean
  includeWorkoutLogs: boolean
  includeWorkoutTemplates: boolean
  includeProfile: boolean
  includePlanData: boolean
  includePreference: boolean
  slimMode: boolean
}

export type ScopedExportPayload = {
  version: 1
  exportedAt: string
  exportScope: {
    rangePreset: ExportRangePreset
    startDate?: string
    endDate?: string
    sections: string[]
    dailyLogCount: number
    workoutLogCount: number
    workoutTemplateCount: number
    slimMode: boolean
  }
  dailyLogs?: UserExportPayload['dailyLogs']
  workoutLogs?: UserExportPayload['workoutLogs']
  workoutTemplates?: NonNullable<UserExportPayload['workoutTemplates']>
  profile?: UserExportPayload['profile']
  planData?: UserExportPayload['planData']
  preference?: UserExportPayload['preference']
}

function formatNumber(value: number | undefined, suffix = ''): string | null {
  return value === undefined ? null : `${value}${suffix}`
}

function formatSectionLabel(section: string): string {
  const labels: Record<string, string> = {
    dailyLogs: '每日记录',
    workoutLogs: '训练记录',
    workoutTemplates: '训练模板',
    profile: '个人资料',
    planData: '个人计划',
    preference: '规则配置',
  }
  return labels[section] ?? section
}

function buildDailySummaryFields(log: DailyLog): string[] {
  return [
    formatNumber(log.morningWeightKg, 'kg'),
    log.waistCm !== undefined ? `腰围${log.waistCm}cm` : null,
    log.chestCm !== undefined ? `胸围${log.chestCm}cm` : null,
    log.upperArmCm !== undefined ? `上臂${log.upperArmCm}cm` : null,
    log.thighCm !== undefined ? `大腿${log.thighCm}cm` : null,
    formatNumber(log.calories, 'kcal'),
    log.protein !== undefined ? `蛋白${log.protein}g` : null,
    log.carbs !== undefined ? `碳水${log.carbs}g` : null,
    log.fat !== undefined ? `脂肪${log.fat}g` : null,
    log.steps !== undefined ? `步数${log.steps}` : null,
    log.sleepHours !== undefined ? `睡眠${log.sleepHours}h` : null,
    log.trained !== undefined ? `训练${log.trained ? '是' : '否'}` : null,
    log.workoutCompletion !== undefined ? `完成${log.workoutCompletion}%` : null,
    log.fatigueScore !== undefined ? `疲劳${log.fatigueScore}/10` : null,
    log.notes?.trim() ? `备注：${log.notes.trim()}` : null,
  ].filter((item): item is string => item !== null)
}

export function resolveExportDateRange(
  options: Pick<ExportOptions, 'rangePreset' | 'startDate' | 'endDate'>,
  today: string,
): { startDate?: string; endDate?: string } {
  if (options.rangePreset === 'all') return {}
  if (options.rangePreset === 'today') return { startDate: today, endDate: today }
  if (options.rangePreset === 'thisWeek') return { startDate: startOfWeekSunday(today), endDate: endOfWeekSaturday(today) }
  if (options.rangePreset === 'last7') return { startDate: addDays(today, -6), endDate: today }
  if (options.rangePreset === 'last30') return { startDate: addDays(today, -29), endDate: today }
  if (options.rangePreset === 'thisMonth') return { startDate: `${today.slice(0, 7)}-01`, endDate: today }
  if (options.startDate && options.endDate && options.startDate > options.endDate) {
    return {
      startDate: options.endDate,
      endDate: options.startDate,
    }
  }
  return {
    startDate: options.startDate,
    endDate: options.endDate,
  }
}

export function filterDatedItems<T extends { date: string }>(
  items: T[],
  range: { startDate?: string; endDate?: string },
): T[] {
  if (!range.startDate || !range.endDate) return items
  const [startDate, endDate] = range.startDate <= range.endDate
    ? [range.startDate, range.endDate]
    : [range.endDate, range.startDate]
  return items.filter((item) => isDateInRange(item.date, startDate, endDate))
}

export function hasDailyContent(log: DailyLog): boolean {
  return Object.entries(log).some(([key, value]) => key !== 'date' && value !== undefined && value !== '')
}

function isMeaningfulSet(set: ExerciseSetLog): boolean {
  return set.weight !== undefined || set.reps !== undefined || set.rir !== undefined
}

function compactExercise(exercise: ExerciseLog): ExerciseLog | null {
  const sets = exercise.sets.filter(isMeaningfulSet)
  const notes = exercise.notes?.trim()
  if (sets.length === 0 && !notes) return null
  return {
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    target: exercise.target,
    sets,
    ...(notes ? { notes } : {}),
  }
}

export function compactWorkoutLog(workout: WorkoutLog): WorkoutLog | null {
  const exercises = workout.exercises
    .map(compactExercise)
    .filter((exercise): exercise is ExerciseLog => exercise !== null)
  const notes = workout.notes?.trim()
  if (exercises.length === 0 && !notes) return null
  return {
    date: workout.date,
    workoutName: workout.workoutName,
    exercises,
    ...(notes ? { notes } : {}),
  }
}

export function buildScopedExportPayload(
  payload: UserExportPayload,
  options: ExportOptions,
  today: string,
): ScopedExportPayload {
  const range = resolveExportDateRange(options, today)
  const rangedDailyLogs = filterDatedItems(payload.dailyLogs, range)
  const rangedWorkoutLogs = filterDatedItems(payload.workoutLogs, range)
  const dailyLogs = options.includeDailyLogs
    ? options.slimMode
      ? rangedDailyLogs.filter(hasDailyContent)
      : rangedDailyLogs
    : []
  const workoutLogs = options.includeWorkoutLogs
    ? options.slimMode
      ? rangedWorkoutLogs
          .map(compactWorkoutLog)
          .filter((workout): workout is WorkoutLog => workout !== null)
      : rangedWorkoutLogs
    : []
  const workoutTemplates = options.includeWorkoutTemplates ? (payload.workoutTemplates ?? []) : []
  const sections: string[] = []

  if (options.includeDailyLogs) sections.push('dailyLogs')
  if (options.includeWorkoutLogs) sections.push('workoutLogs')
  if (options.includeWorkoutTemplates) sections.push('workoutTemplates')
  if (options.includeProfile) sections.push('profile')
  if (options.includePlanData) sections.push('planData')
  if (options.includePreference) sections.push('preference')

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    exportScope: {
      rangePreset: options.rangePreset,
      startDate: range.startDate,
      endDate: range.endDate,
      sections,
      dailyLogCount: dailyLogs.length,
      workoutLogCount: workoutLogs.length,
      workoutTemplateCount: workoutTemplates.length,
      slimMode: options.slimMode,
    },
    ...(options.includeDailyLogs ? { dailyLogs } : {}),
    ...(options.includeWorkoutLogs ? { workoutLogs } : {}),
    ...(options.includeWorkoutTemplates ? { workoutTemplates } : {}),
    ...(options.includeProfile ? { profile: payload.profile } : {}),
    ...(options.includePlanData ? { planData: payload.planData } : {}),
    ...(options.includePreference ? { preference: payload.preference } : {}),
  }
}

export function buildExportSummaryText(payload: ScopedExportPayload): string {
  const scope = payload.exportScope
  const lines: string[] = []
  const rangeLabel = scope.startDate && scope.endDate ? `${scope.startDate} 至 ${scope.endDate}` : '全部日期'

  lines.push('训练饮食记录摘要')
  lines.push(`导出时间：${payload.exportedAt}`)
  lines.push(`范围：${rangeLabel}`)
  lines.push(`内容：${scope.sections.map(formatSectionLabel).join('、') || '无'}`)
  lines.push(`模式：${scope.slimMode ? '精简' : '完整'}`)

  const summaryDailyLogs = payload.dailyLogs
    ?.map((log) => ({ log, fields: buildDailySummaryFields(log) }))
    .filter(({ fields }) => fields.length > 0) ?? []
  if (summaryDailyLogs.length) {
    lines.push('', '每日记录')
    for (const { log, fields } of summaryDailyLogs) {
      lines.push(`- ${log.date}${fields.length ? `：${fields.join('，')}` : ''}`)
    }
  }

  if (payload.workoutLogs?.length) {
    const workoutLines: string[] = []
    for (const workout of payload.workoutLogs) {
      const currentWorkoutLines: string[] = []
      for (const exercise of workout.exercises) {
        const sets = exercise.sets
          .map((set, index) => {
            const parts = [
              set.weight !== undefined ? `${set.weight}kg` : null,
              set.reps !== undefined ? `${set.reps}次` : null,
              set.rir !== undefined ? `RIR${set.rir}` : null,
            ].filter((item): item is string => item !== null)
            return parts.length ? `${index + 1}. ${parts.join(' x ')}` : null
          })
          .filter((item): item is string => item !== null)
        const exerciseNotes = exercise.notes?.trim()
        if (sets.length || exerciseNotes) {
          const parts = [sets.length ? sets.join('；') : null, exerciseNotes ? `备注：${exerciseNotes}` : null]
            .filter((item): item is string => item !== null)
          currentWorkoutLines.push(`  - ${exercise.name}：${parts.join('；')}`)
        }
      }
      const workoutNotes = workout.notes?.trim()
      if (currentWorkoutLines.length || workoutNotes) {
        workoutLines.push(`- ${workout.date}：${workout.workoutName}`)
        workoutLines.push(...currentWorkoutLines)
        if (workoutNotes) workoutLines.push(`  备注：${workoutNotes}`)
      }
    }
    if (workoutLines.length) {
      lines.push('', '训练记录')
      lines.push(...workoutLines)
    }
  }

  if (payload.workoutTemplates?.length) {
    lines.push('', '训练模板')
    for (const template of payload.workoutTemplates) {
      lines.push(`- ${template.name}：${template.exercises.length} 个动作`)
    }
  }

  const extraSections = [
    payload.profile ? '个人资料已包含' : null,
    payload.planData ? '个人计划已包含' : null,
    payload.preference ? '规则配置已包含' : null,
  ].filter((item): item is string => item !== null)
  if (extraSections.length) {
    lines.push('', '其他')
    lines.push(extraSections.join('；'))
  }

  return `${lines.join('\n')}\n`
}

function csvValue(value: string | number | boolean | undefined): string {
  if (value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function csvRow(values: Array<string | number | boolean | undefined>): string {
  return values.map(csvValue).join(',')
}

type DailyCsvField = Exclude<keyof DailyLog, 'date'>
type WorkoutSetCsvField = keyof ExerciseSetLog
type WorkoutSetCsvRow = {
  workout: WorkoutLog
  exercise: ExerciseLog
  set: ExerciseSetLog
  index: number
}

export type ExportContentStats = {
  csvDailyRows: number
  csvWorkoutSets: number
  summaryDailyLogs: number
  summaryWorkoutLogs: number
  workoutTemplates: number
  nonRecordSections: number
  csvAvailable: boolean
  summaryAvailable: boolean
}

const dailyCsvFields: DailyCsvField[] = [
  'morningWeightKg',
  'waistCm',
  'chestCm',
  'upperArmCm',
  'thighCm',
  'calories',
  'protein',
  'carbs',
  'fat',
  'steps',
  'sleepHours',
  'trained',
  'workoutCompletion',
  'fatigueScore',
  'notes',
]

const workoutSetCsvFields: WorkoutSetCsvField[] = ['weight', 'reps', 'rir']

function hasCsvValue(value: string | number | boolean | undefined): boolean {
  return value !== undefined && value !== ''
}

function getCsvDailyRows(logs: ScopedExportPayload['dailyLogs']): DailyLog[] {
  return logs?.filter((log) =>
    dailyCsvFields.some((field) => hasCsvValue(log[field])),
  ) ?? []
}

function getCsvWorkoutSetRows(logs: ScopedExportPayload['workoutLogs']): WorkoutSetCsvRow[] {
  return logs?.flatMap((workout) =>
    workout.exercises.flatMap((exercise) =>
      exercise.sets
        .map((set, index) => ({
          workout,
          exercise,
          set,
          index,
        }))
        .filter((row) => workoutSetCsvFields.some((field) => hasCsvValue(row.set[field]))),
    ),
  ) ?? []
}

function getSummaryDailyCount(logs: ScopedExportPayload['dailyLogs']): number {
  return logs?.filter((log) => buildDailySummaryFields(log).length > 0).length ?? 0
}

function getSummaryWorkoutCount(logs: ScopedExportPayload['workoutLogs']): number {
  return logs?.filter(
    (workout) =>
      Boolean(workout.notes?.trim()) ||
      workout.exercises.some(
        (exercise) =>
          Boolean(exercise.notes?.trim()) ||
          exercise.sets.some((set) => workoutSetCsvFields.some((field) => hasCsvValue(set[field]))),
      ),
  ).length ?? 0
}

function countNonRecordSections(payload: ScopedExportPayload): number {
  return [payload.profile, payload.planData, payload.preference].filter(Boolean).length
}

export function buildExportContentStats(
  payload: ScopedExportPayload,
  nonRecordSectionCount = countNonRecordSections(payload),
): ExportContentStats {
  const csvDailyRows = getCsvDailyRows(payload.dailyLogs).length
  const csvWorkoutSets = getCsvWorkoutSetRows(payload.workoutLogs).length
  const workoutTemplates = payload.exportScope.workoutTemplateCount
  const summaryDailyLogs = getSummaryDailyCount(payload.dailyLogs)
  const summaryWorkoutLogs = getSummaryWorkoutCount(payload.workoutLogs)
  return {
    csvDailyRows,
    csvWorkoutSets,
    summaryDailyLogs,
    summaryWorkoutLogs,
    workoutTemplates,
    nonRecordSections: nonRecordSectionCount,
    csvAvailable: csvDailyRows > 0 || csvWorkoutSets > 0 || workoutTemplates > 0,
    summaryAvailable: summaryDailyLogs > 0 || summaryWorkoutLogs > 0 || workoutTemplates > 0 || nonRecordSectionCount > 0,
  }
}

export function buildExportResultSummary(payload: ScopedExportPayload, format: ExportFormat): string {
  const stats = buildExportContentStats(payload)
  const extra = stats.nonRecordSections > 0 ? `，其他 ${stats.nonRecordSections} 项` : ''
  if (format === 'csv') {
    return `每日行 ${stats.csvDailyRows} 条，训练组 ${stats.csvWorkoutSets} 条，模板 ${stats.workoutTemplates} 个`
  }
  if (format === 'summary' || format === 'copySummary') {
    return `每日 ${stats.summaryDailyLogs} 条，训练 ${stats.summaryWorkoutLogs} 条，模板 ${stats.workoutTemplates} 个${extra}`
  }
  return `每日 ${payload.exportScope.dailyLogCount} 条，训练 ${payload.exportScope.workoutLogCount} 条，模板 ${payload.exportScope.workoutTemplateCount} 个${extra}`
}

export function buildExportCsvText(payload: ScopedExportPayload): string {
  const lines: string[] = []

  if (payload.dailyLogs?.length) {
    const dailyRows = getCsvDailyRows(payload.dailyLogs)
    const activeDailyFields = dailyCsvFields.filter((field) =>
      dailyRows.some((log) => hasCsvValue(log[field])),
    )
    if (dailyRows.length > 0 && activeDailyFields.length > 0) {
      lines.push('daily_logs')
      lines.push(csvRow(['date', ...activeDailyFields]))
      for (const log of dailyRows) {
        lines.push(csvRow([log.date, ...activeDailyFields.map((field) => log[field])]))
      }
    }
  }

  if (payload.workoutLogs?.length) {
    const setRows = getCsvWorkoutSetRows(payload.workoutLogs)
    const activeSetFields = workoutSetCsvFields.filter((field) =>
      setRows.some((row) => hasCsvValue(row.set[field])),
    )
    if (setRows.length > 0 && activeSetFields.length > 0) {
      if (lines.length) lines.push('')
      lines.push('workout_sets')
      lines.push(csvRow(['date', 'workoutName', 'exerciseName', 'setIndex', ...activeSetFields]))
      for (const row of setRows) {
        lines.push(csvRow([
          row.workout.date,
          row.workout.workoutName,
          row.exercise.name,
          row.index + 1,
          ...activeSetFields.map((field) => row.set[field]),
        ]))
      }
    }
  }

  if (payload.workoutTemplates?.length) {
    if (lines.length) lines.push('')
    lines.push('workout_templates')
    lines.push(csvRow(['templateName', 'focus', 'exerciseCount']))
    for (const template of payload.workoutTemplates) {
      lines.push(csvRow([template.name, template.focus, template.exercises.length]))
    }
  }

  return `${lines.join('\n')}\n`
}
