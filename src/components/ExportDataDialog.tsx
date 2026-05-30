import { useEffect, useId, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import type { DailyLog, WorkoutLog, WorkoutTemplate } from '../types'
import { buildExportContentStats, buildExportCsvText, buildExportSummaryText, compactWorkoutLog, filterDatedItems, hasDailyContent, resolveExportDateRange, type ExportFormat, type ExportOptions, type ExportRangePreset, type ScopedExportPayload } from '../lib/exportPayload'
import { Badge, Button, Checkbox, DisclosurePanel, Field, SegmentedControl, StatusMessage, TextInput } from './ui'

const presets: Array<{ value: ExportRangePreset; label: string }> = [
  { value: 'last30', label: '近 30 天' },
  { value: 'last7', label: '近 7 天' },
  { value: 'thisWeek', label: '本周' },
  { value: 'today', label: '当天' },
  { value: 'thisMonth', label: '本月' },
  { value: 'all', label: '全部' },
  { value: 'custom', label: '自定义' },
]

const exportFormats: Array<{ value: ExportFormat; label: string }> = [
  { value: 'json', label: 'JSON 备份' },
  { value: 'summary', label: '文本摘要' },
  { value: 'csv', label: 'CSV 表格' },
  { value: 'copySummary', label: '复制摘要' },
]

const dailyFieldLabels: Partial<Record<keyof DailyLog, string>> = {
  morningWeightKg: '体重',
  waistCm: '腰围',
  chestCm: '胸围',
  upperArmCm: '上臂',
  thighCm: '大腿',
  calories: '热量',
  protein: '蛋白',
  carbs: '碳水',
  fat: '脂肪',
  steps: '步数',
  sleepHours: '睡眠',
  trained: '训练',
  workoutCompletion: '完成度',
  fatigueScore: '疲劳',
  notes: '备注',
}

function defaultOptions(today: string, rangePreset: ExportRangePreset = 'last30'): ExportOptions {
  return {
    rangePreset,
    startDate: today,
    endDate: today,
    includeDailyLogs: true,
    includeWorkoutLogs: true,
    includeWorkoutTemplates: false,
    includeProfile: false,
    includePlanData: false,
    includePreference: false,
    slimMode: true,
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function hasSetContent(set: { weight?: number; reps?: number; rir?: number }): boolean {
  return set.weight !== undefined || set.reps !== undefined || set.rir !== undefined
}

function hasSummaryWorkoutContent(workout: WorkoutLog): boolean {
  return Boolean(workout.notes?.trim()) || workout.exercises.some(
    (exercise) => Boolean(exercise.notes?.trim()) || exercise.sets.some(hasSetContent),
  )
}

function hasCsvWorkoutContent(workout: WorkoutLog): boolean {
  return workout.exercises.some((exercise) => exercise.sets.some(hasSetContent))
}

function countPreviewSets(workout: WorkoutLog, format: ExportFormat): number {
  if (format === 'json') {
    return workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
  }
  return workout.exercises.reduce((sum, exercise) => sum + exercise.sets.filter(hasSetContent).length, 0)
}

export function ExportDataDialog({
  title = '导出数据',
  description = '默认以当前日期为结束日，只导出近期记录，减少文件里的无关信息。',
  today,
  dailyLogs,
  workoutLogs,
  workoutTemplates,
  initialRangePreset = 'last30',
  initialOptions,
  initialOutputFormat = 'summary',
  pending,
  onClose,
  onExport,
}: {
  title?: string
  description?: string
  today: string
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  workoutTemplates: WorkoutTemplate[]
  initialRangePreset?: ExportRangePreset
  initialOptions?: Partial<ExportOptions>
  initialOutputFormat?: ExportFormat
  pending?: boolean
  onClose: () => void
  onExport: (options: ExportOptions, format: ExportFormat) => void
}) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const closeRef = useRef(onClose)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const initialSlimOptions = useMemo<ExportOptions>(
    () => ({
      ...defaultOptions(today, initialRangePreset),
      ...initialOptions,
    }),
    [initialOptions, initialRangePreset, today],
  )
  const [options, setOptions] = useState<ExportOptions>(() => ({
    ...initialSlimOptions,
  }))
  const [outputFormat, setOutputFormat] = useState<ExportFormat>(initialOutputFormat)
  const [advancedContentExpanded, setAdvancedContentExpanded] = useState(() =>
    Boolean(initialOptions?.includeProfile || initialOptions?.includePlanData || initialOptions?.includePreference),
  )

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!dialog.open) {
      dialog.showModal()
      window.requestAnimationFrame(() => {
        closeButtonRef.current?.focus()
      })
    }
    const onCancel = (event: Event) => {
      event.preventDefault()
      closeRef.current()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      if (dialog.open) dialog.close()
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [])

  const range = useMemo(
    () => resolveExportDateRange(options, today),
    [options, today],
  )
  const exportDailyLogs = useMemo(
    () =>
      options.includeDailyLogs
        ? filterDatedItems(dailyLogs, range).filter((log) => !options.slimMode || hasDailyContent(log))
        : [],
    [dailyLogs, options.includeDailyLogs, options.slimMode, range],
  )
  const exportWorkoutLogs = useMemo(
    () =>
      options.includeWorkoutLogs
        ? filterDatedItems(workoutLogs, range)
            .map((workout) => (options.slimMode ? compactWorkoutLog(workout) : workout))
            .filter((workout): workout is WorkoutLog => workout !== null)
        : [],
    [options.includeWorkoutLogs, options.slimMode, range, workoutLogs],
  )
  const dailyCount = exportDailyLogs.length
  const workoutCount = exportWorkoutLogs.length
  const selectedSections = [
    options.includeDailyLogs,
    options.includeWorkoutLogs,
    options.includeWorkoutTemplates,
    options.includeProfile,
    options.includePlanData,
    options.includePreference,
  ].filter(Boolean).length
  const exportWorkoutTemplates = options.includeWorkoutTemplates ? workoutTemplates : []
  const resolvedTemplateCount = exportWorkoutTemplates.length
  const selectedRecordCount = dailyCount + workoutCount + resolvedTemplateCount
  const customRangeIncomplete = options.rangePreset === 'custom' && (!options.startDate || !options.endDate)
  const rangeLabel = customRangeIncomplete
    ? '请选择日期'
    : range.startDate && range.endDate
      ? `${range.startDate} 至 ${range.endDate}`
      : '全部日期'
  const selectedNonRecordSections = [
    options.includeProfile,
    options.includePlanData,
    options.includePreference,
  ].filter(Boolean).length
  const selectedContentLabels = [
    options.includeDailyLogs ? '每日记录' : null,
    options.includeWorkoutLogs ? '训练记录' : null,
    options.includeWorkoutTemplates ? '训练模板' : null,
    options.includeProfile ? '个人资料' : null,
    options.includePlanData ? '个人计划' : null,
    options.includePreference ? '规则配置' : null,
  ].filter((label): label is string => label !== null)
  const estimatedPayload: ScopedExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exportScope: {
      rangePreset: options.rangePreset,
      startDate: range.startDate,
      endDate: range.endDate,
      sections: selectedContentLabels,
      dailyLogCount: dailyCount,
      workoutLogCount: workoutCount,
      workoutTemplateCount: resolvedTemplateCount,
      slimMode: options.slimMode,
    },
    ...(options.includeDailyLogs ? { dailyLogs: exportDailyLogs } : {}),
    ...(options.includeWorkoutLogs ? { workoutLogs: exportWorkoutLogs } : {}),
    ...(options.includeWorkoutTemplates ? { workoutTemplates: exportWorkoutTemplates } : {}),
  }
  const exportStats = buildExportContentStats(estimatedPayload, selectedNonRecordSections)
  const advancedContentOpen = selectedNonRecordSections > 0
  const activeOutputFormat =
    outputFormat === 'csv' && !exportStats.csvAvailable
      ? exportStats.summaryAvailable ? 'summary' : 'json'
      : (outputFormat === 'summary' || outputFormat === 'copySummary') && !exportStats.summaryAvailable
        ? 'json'
        : outputFormat
  const exportDisabled =
    pending ||
    selectedSections === 0 ||
    (selectedRecordCount === 0 && selectedNonRecordSections === 0) ||
    customRangeIncomplete ||
    (activeOutputFormat === 'csv' && !exportStats.csvAvailable)
  const exportActionLabel =
    activeOutputFormat === 'copySummary'
      ? '复制摘要'
      : activeOutputFormat === 'summary'
        ? '下载摘要'
        : activeOutputFormat === 'csv'
          ? '下载 CSV'
          : '下载 JSON'
  const activeOutputLabel = exportFormats.find((format) => format.value === activeOutputFormat)?.label ?? 'JSON 备份'
  const countBadges = activeOutputFormat === 'csv'
    ? [
        { label: `每日行 ${exportStats.csvDailyRows}`, active: exportStats.csvDailyRows > 0 },
        { label: `训练组 ${exportStats.csvWorkoutSets}`, active: exportStats.csvWorkoutSets > 0 },
        { label: `模板 ${exportStats.workoutTemplates}`, active: exportStats.workoutTemplates > 0 },
      ]
    : [
        { label: `每日 ${dailyCount}`, active: dailyCount > 0 },
        { label: `训练 ${workoutCount}`, active: workoutCount > 0 },
        { label: `模板 ${resolvedTemplateCount}`, active: resolvedTemplateCount > 0 },
      ]
  const previewDailySource = activeOutputFormat === 'json'
    ? exportDailyLogs
    : exportDailyLogs.filter(hasDailyContent)
  const previewWorkoutSource = activeOutputFormat === 'json'
    ? exportWorkoutLogs
    : activeOutputFormat === 'csv'
      ? exportWorkoutLogs.filter(hasCsvWorkoutContent)
      : exportWorkoutLogs.filter(hasSummaryWorkoutContent)
  const previewDailyLogs = previewDailySource.slice(0, 5)
  const previewWorkoutLogs = previewWorkoutSource.slice(0, 5)
  const estimatedContent =
    activeOutputFormat === 'summary' || activeOutputFormat === 'copySummary'
      ? buildExportSummaryText(estimatedPayload)
      : activeOutputFormat === 'csv'
        ? buildExportCsvText(estimatedPayload)
        : JSON.stringify(estimatedPayload)
  const estimatedSize = formatBytes(new Blob([estimatedContent]).size)

  const patchOptions = (patch: Partial<ExportOptions>) => {
    setOptions((current) => ({ ...current, ...patch }))
  }

  const setPreset = (rangePreset: ExportRangePreset) => {
    patchOptions({ rangePreset })
  }

  const setFullBackup = () => {
    setOptions({
      rangePreset: 'all',
      startDate: today,
      endDate: today,
      includeDailyLogs: true,
      includeWorkoutLogs: true,
      includeWorkoutTemplates: true,
      includeProfile: true,
      includePlanData: true,
      includePreference: true,
      slimMode: false,
    })
    setOutputFormat('json')
  }

  const setDefaultSlimExport = () => {
    setOptions(initialSlimOptions)
    setOutputFormat(initialOutputFormat)
  }

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  const formatDailyFields = (log: DailyLog) => {
    const labels = (Object.entries(log) as Array<[keyof DailyLog, unknown]>)
      .filter(([key, value]) => key !== 'date' && value !== undefined && value !== '')
      .map(([key]) => dailyFieldLabels[key] ?? String(key))
    return labels.length > 0 ? labels.join('、') : '无记录字段'
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="m-auto max-h-[calc(100vh-2rem)] w-[min(640px,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:backdrop:bg-black/60"
    >
      <div className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
            <p id={descriptionId} className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={setDefaultSlimExport}>
              精简默认
            </Button>
            <Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={setFullBackup}>
              完整备份
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">范围</p>
              <p className={`text-xs ${customRangeIncomplete ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>
                {rangeLabel}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <SegmentedControl value={options.rangePreset} options={presets} onChange={setPreset} />
            </div>
            {options.rangePreset === 'custom' ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="开始日期">
                  <TextInput type="date" value={options.startDate} onChange={(event) => patchOptions({ startDate: event.target.value })} />
                </Field>
                <Field label="结束日期">
                  <TextInput type="date" value={options.endDate} onChange={(event) => patchOptions({ endDate: event.target.value })} />
                </Field>
              </div>
            ) : null}
          </section>

          <section>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">内容</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([
                ['includeDailyLogs', '每日记录'],
                ['includeWorkoutLogs', '训练记录'],
                ['includeWorkoutTemplates', '训练模板'],
              ] as const).map(([key, label]) => (
                <Checkbox
                  key={key}
                  label={label}
                  checked={options[key]}
                  onChange={(event) => patchOptions({ [key]: event.target.checked })}
                />
              ))}
            </div>
            <DisclosurePanel
              open={advancedContentOpen || advancedContentExpanded}
              onOpenChange={setAdvancedContentExpanded}
              className="mt-2 rounded-md bg-white dark:bg-slate-900"
              title={`更多内容${selectedNonRecordSections > 0 ? `（已选 ${selectedNonRecordSections}）` : ''}`}
              summaryClassName="text-sm font-medium"
              contentClassName="py-3"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ['includeProfile', '个人资料'],
                  ['includePlanData', '个人计划'],
                  ['includePreference', '规则配置'],
                ] as const).map(([key, label]) => (
                    <Checkbox
                      key={key}
                      label={label}
                      checked={options[key]}
                      onChange={(event) => patchOptions({ [key]: event.target.checked })}
                    />
                  ))}
              </div>
            </DisclosurePanel>
            <div className="mt-3">
              <Checkbox
                label="精简记录，去掉空日期、空动作和空组"
                checked={options.slimMode}
                onChange={(event) => patchOptions({ slimMode: event.target.checked })}
              />
            </div>
          </section>

          <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{activeOutputLabel}</span>
            {countBadges.map((badge) => (
              badge.active ? <Badge key={badge.label} tone="positive">{badge.label}</Badge> : <span key={badge.label} className="text-xs font-medium text-slate-500 dark:text-slate-400">{badge.label}</span>
            ))}
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{options.slimMode ? '精简' : '完整'}</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">约 {estimatedSize}</span>
          </div>
          {selectedContentLabels.length > 0 ? (
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              内容：{selectedContentLabels.join('、')}
            </p>
          ) : null}
          {selectedSections > 0 && selectedRecordCount === 0 && selectedNonRecordSections === 0 ? (
            <StatusMessage tone="warning">
              当前范围内没有记录。可以换范围，或勾选个人资料、计划等非记录内容。
            </StatusMessage>
          ) : null}
          {customRangeIncomplete ? (
            <StatusMessage tone="warning">
              自定义范围需要填写开始日期和结束日期。
            </StatusMessage>
          ) : null}

          <section>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">输出</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <SegmentedControl
                value={activeOutputFormat}
                options={exportFormats.map((format) => ({
                  ...format,
                  disabled:
                    (format.value === 'csv' && !exportStats.csvAvailable) ||
                    ((format.value === 'summary' || format.value === 'copySummary') && !exportStats.summaryAvailable),
                }))}
                onChange={setOutputFormat}
              />
            </div>
          </section>

          {selectedRecordCount > 0 || selectedNonRecordSections > 0 ? (
            <DisclosurePanel className="bg-white dark:bg-slate-900" title="预览导出内容" contentClassName="grid gap-3 text-sm">
                {previewDailyLogs.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">每日记录</p>
                    <div className="mt-2 grid gap-1.5">
                      {previewDailyLogs.map((log) => (
                        <p key={`daily-${log.date}`} className="rounded-md bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {log.date} · {formatDailyFields(log)}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
                {previewWorkoutLogs.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">训练记录</p>
                    <div className="mt-2 grid gap-1.5">
                      {previewWorkoutLogs.map((workout) => {
                        const setCount = countPreviewSets(workout, activeOutputFormat)
                        return (
                          <p key={`workout-${workout.date}`} className="rounded-md bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {workout.date} · {workout.workoutName} · {workout.exercises.length} 动作 · {setCount} 组
                          </p>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
                {selectedNonRecordSections > 0 ? (
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    还会包含：{[
                      options.includeProfile ? '个人资料' : null,
                      options.includePlanData ? '个人计划' : null,
                      options.includePreference ? '规则配置' : null,
                    ].filter(Boolean).join('、')}
                  </p>
                ) : null}
                {previewDailySource.length + previewWorkoutSource.length > previewDailyLogs.length + previewWorkoutLogs.length ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">这里只显示前 5 条每日记录和前 5 条训练记录。</p>
                ) : null}
            </DisclosurePanel>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button ref={closeButtonRef} variant="secondary" onClick={onClose} disabled={pending}>
            取消
          </Button>
          <Button onClick={() => onExport(options, activeOutputFormat)} disabled={exportDisabled} loading={pending}>
            {exportActionLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
