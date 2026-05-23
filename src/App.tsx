import { type ReactElement, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { dailyTargets, dayNames, shoulderProtectionTips, userProfile, weeklyCalorieTarget, workoutPlans } from './data/plans'
import { formatDateInput, getDayKey, isValidDateInput } from './lib/dates'
import { calculateDashboardStats, buildTrainingPerformanceData, buildTrendData, createWeeklySummary, logsForWeek, roundMetric } from './lib/metrics'
import {
  getDailyRecommendations,
  getPushDayShoulderRecommendation,
  getTwoWeekAdjustment,
  getWeekendRiskRecommendation,
} from './lib/recommendations'
import {
  type AppData,
  type SyncState,
  cacheData,
  createBackup,
  downloadBackup,
  loadAppData,
  loadCachedData,
  parseBackup,
  saveAppData,
} from './lib/storage'
import { createId } from './lib/ids'
import type { DailyLog, ExerciseLog, ExercisePlan, ExerciseSetLog, TaskChecks, WorkoutLog, WorkoutTemplate } from './types'
import { Badge, Button, Card, Field, ProgressBar, RecommendationBox, StatCard, TextArea, TextInput } from './components/ui'

type TabKey = 'today' | 'daily' | 'workout' | 'dashboard' | 'weekly'
type WorkoutTemplateOption = {
  id: string
  name: string
  focus: string
  source: 'builtin' | 'custom'
  exercises: ExercisePlan[]
}
type WorkoutSummary = {
  exerciseCount: number
  filledSets: number
  totalSets: number
  completionPercent: number
}

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'today', label: '今日' },
  { key: 'daily', label: '记录' },
  { key: 'workout', label: '训练' },
  { key: 'dashboard', label: '仪表盘' },
  { key: 'weekly', label: '周报' },
]

const ACTIVE_TAB_KEY = 'bodybuild:v1:activeTab'

function isTabKey(value: string | null): value is TabKey {
  return tabs.some((tab) => tab.key === value)
}

function readInitialTab(): TabKey {
  try {
    const saved = window.sessionStorage.getItem(ACTIVE_TAB_KEY)
    return isTabKey(saved) ? saved : 'today'
  } catch {
    return 'today'
  }
}

const defaultChecks: TaskChecks = {
  diet: false,
  workout: false,
  steps: false,
  sleep: false,
}

type NumberRange = {
  min?: number
  max?: number
  allowZero?: boolean
}

function numberValue(value: string, range?: NumberRange): number | undefined {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  if (range) {
    if (!range.allowZero && parsed === 0 && range.min !== undefined && range.min > 0) {
      return undefined
    }
    if (range.min !== undefined && parsed < range.min) return undefined
    if (range.max !== undefined && parsed > range.max) return undefined
  }
  return parsed
}

function displayNumber(value: number | undefined): string {
  return value === undefined ? '' : String(value)
}

function signedRemaining(targetValue: number | undefined, actualValue: number | undefined): string {
  if (targetValue === undefined) return '无固定目标'
  if (actualValue === undefined) return '未记录'
  const diff = targetValue - actualValue
  return diff >= 0 ? `还差 ${Math.round(diff)}` : `超出 ${Math.abs(Math.round(diff))}`
}

function remainingTone(targetValue: number | undefined, actualValue: number | undefined): 'positive' | 'warning' | 'neutral' {
  if (targetValue === undefined || actualValue === undefined) return 'neutral'
  return actualValue <= targetValue ? 'positive' : 'warning'
}

function valueText(value: number | undefined, unit = ''): string {
  return value === undefined ? '未记录' : `${value}${unit}`
}

function yesNoText(value: boolean | undefined): string {
  if (value === undefined) return '未记录'
  return value ? '是' : '否'
}

function checkText(value: boolean): string {
  return value ? '已完成' : '未完成'
}

function upsertByDate<T extends { date: string }>(items: T[], date: string, patch: Partial<T>): T[] {
  const existing = items.find((item) => item.date === date)
  if (existing) {
    return items.map((item) => (item.date === date ? { ...item, ...patch } : item))
  }
  return [...items, { date, ...patch } as T]
}

function estimateSetCount(target: string): number {
  if (typeof target !== 'string') return 3
  const cnMatch = target.match(/(\d+)(?:-\d+)?\s*组/)
  if (cnMatch) return Number(cnMatch[1])
  const enMatch = target.match(/(\d+)\s*(?:sets?|×|x|\*)/i)
  if (enMatch) return Number(enMatch[1])
  return 3
}

function createWorkoutFromPlan(date: string): WorkoutLog {
  const plan = workoutPlans[getDayKey(date)]
  return createWorkoutFromTemplate(date, {
    id: `builtin-${plan.day}`,
    name: plan.name,
    focus: plan.focus,
    source: 'builtin',
    exercises: plan.exercises,
  })
}

function createWorkoutFromTemplate(date: string, template: WorkoutTemplateOption): WorkoutLog {
  return {
    date,
    workoutName: template.name,
    exercises: template.exercises.map((exercise) => {
      const setCount = estimateSetCount(exercise.prescription)
      return {
        exerciseId: exercise.id,
        name: exercise.name,
        target: exercise.note ? `${exercise.prescription}，${exercise.note}` : exercise.prescription,
        completedSets: 0,
        sets: Array.from({ length: setCount }, () => ({})),
      }
    }),
  }
}

function builtinTemplateOptions(): WorkoutTemplateOption[] {
  return Object.values(workoutPlans).map((plan) => ({
    id: `builtin-${plan.day}`,
    name: plan.name,
    focus: plan.focus,
    source: 'builtin',
    exercises: plan.exercises,
  }))
}

function customTemplateToOption(template: WorkoutTemplate): WorkoutTemplateOption {
  return {
    id: template.id,
    name: template.name,
    focus: template.focus,
    source: 'custom',
    exercises: template.exercises,
  }
}

function hasWorkoutContent(workout: WorkoutLog | undefined): boolean {
  if (!workout) return false
  if (workout.notes?.trim()) return true
  return workout.exercises.some(
    (exercise) =>
      exercise.name.trim() ||
      exercise.target.trim() ||
      exercise.notes?.trim() ||
      exercise.sets.some((set) => set.weight !== undefined || set.reps !== undefined || set.rir !== undefined),
  )
}

function createBlankExercise(): ExerciseLog {
  return {
    exerciseId: createId('custom-exercise'),
    name: '新动作',
    target: '3 组 × 8-12 次',
    completedSets: 0,
    sets: Array.from({ length: 3 }, () => ({})),
  }
}

function newTemplateFromWorkout(workout: WorkoutLog): WorkoutTemplate {
  const now = new Date().toISOString()
  return {
    id: createId('template'),
    name: `${workout.workoutName || '自定义训练'} 模板`,
    focus: '自定义',
    category: '自定义',
    exercises: workout.exercises.length
      ? workout.exercises.map((exercise, index) => ({
          id: exercise.exerciseId || createId('template-exercise'),
          name: exercise.name || `动作 ${index + 1}`,
          prescription: exercise.target || '3 组 × 8-12 次',
          note: exercise.notes,
        }))
      : [{ id: createId('template-exercise'), name: '新动作', prescription: '3 组 × 8-12 次' }],
    createdAt: now,
    updatedAt: now,
  }
}

function summarizeWorkout(workout: WorkoutLog | undefined): WorkoutSummary {
  if (!workout) {
    return {
      exerciseCount: 0,
      filledSets: 0,
      totalSets: 0,
      completionPercent: 0,
    }
  }

  const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
  const filledSets = workout.exercises.reduce(
    (sum, exercise) =>
      sum + exercise.sets.filter((set) => set.weight !== undefined || set.reps !== undefined || set.rir !== undefined).length,
    0,
  )

  return {
    exerciseCount: workout.exercises.length,
    filledSets,
    totalSets,
    completionPercent: totalSets ? Math.round((filledSets / totalSets) * 100) : 0,
  }
}

function isExerciseFilled(exercise: ExerciseLog): boolean {
  return exercise.sets.some((set) => set.weight !== undefined || set.reps !== undefined || set.rir !== undefined)
}

function hasChartData<T extends object>(data: T[], keys: Array<keyof T>, minPoints = 2): boolean {
  return data.filter((point) => keys.some((key) => typeof point[key] === 'number')).length >= minPoints
}

function weeklyConclusion(summary: ReturnType<typeof createWeeklySummary>, twoWeekTitle: string) {
  if (summary.weekendOverLimit) {
    return {
      title: '周末优先控制',
      message: '周末平均热量已经偏高，下周先把周五周六拉回 2600-3000 kcal，不建议极端压低工作日热量。',
      tone: 'danger' as const,
    }
  }
  if (summary.calorieStatus === 'unknown') {
    return {
      title: '记录还不够完整',
      message: '本周热量记录不足，先把体重、热量、蛋白质和步数连续记满，再判断是否需要调整。',
      tone: 'neutral' as const,
    }
  }
  if (summary.calorieStatus === 'high') {
    return {
      title: '本周热量偏高',
      message: '优先检查周五周六自由饮食和零食化进食，不要用大幅压低训练日热量来补偿。',
      tone: 'warning' as const,
    }
  }
  if (summary.calorieStatus === 'low') {
    return {
      title: '热量可能偏低',
      message: '留意训练状态、睡眠和疲劳，先保证主项表现，不需要继续扩大赤字。',
      tone: 'warning' as const,
    }
  }
  return {
    title: twoWeekTitle || '继续当前方案',
    message: '本周热量接近目标区间，继续保持记录、训练完成度和周末活动量。',
    tone: 'positive' as const,
  }
}

function buildDailyCopyText({
  date,
  dayName,
  target,
  log,
  workout,
  checks,
  completion,
}: {
  date: string
  dayName: string
  target: typeof dailyTargets[keyof typeof dailyTargets]
  log: DailyLog | undefined
  workout: WorkoutLog | undefined
  checks: TaskChecks
  completion: number
}): string {
  const calorieTarget = target.calories ? `${target.calories} kcal` : `${target.calorieRange?.[0]}-${target.calorieRange?.[1]} kcal`
  const workoutLines = workout?.exercises.length
    ? workout.exercises.map((exercise, index) => {
        const sets = exercise.sets
          .map((set, setIndex) => `第${setIndex + 1}组 ${valueText(set.weight, 'kg')} × ${valueText(set.reps, '次')} RIR ${valueText(set.rir)}`)
          .join('；')
        return `${index + 1}. ${exercise.name}：${sets || '未记录'}`
      })
    : ['暂无训练记录']

  return [
    `【${date} ${dayName} 健身记录】`,
    '',
    '今日目标',
    `训练：${target.workoutName}`,
    `热量：${calorieTarget}`,
    `蛋白质：${target.protein} g`,
    `碳水：${target.carbs ?? '无固定目标'}${target.carbs ? ' g' : ''}`,
    `脂肪：${target.fat ?? '无固定目标'}${target.fat ? ' g' : ''}`,
    `步数：${target.stepTarget} 步`,
    '',
    '实际记录',
    `体重：${valueText(log?.morningWeightKg, ' kg')}`,
    `腰围：${valueText(log?.waistCm, ' cm')}`,
    `热量：${valueText(log?.calories, ' kcal')}`,
    `蛋白质：${valueText(log?.protein, ' g')}`,
    `碳水：${valueText(log?.carbs, ' g')}`,
    `脂肪：${valueText(log?.fat, ' g')}`,
    `步数：${valueText(log?.steps, ' 步')}`,
    `睡眠：${valueText(log?.sleepHours, ' h')}`,
    `是否训练：${yesNoText(log?.trained)}`,
    `训练完成度：${valueText(log?.workoutCompletion, '%')}`,
    `肩痛评分：${valueText(log?.shoulderPainScore, '/10')}`,
    `疲劳评分：${valueText(log?.fatigueScore, '/10')}`,
    `备注：${log?.notes || '无'}`,
    '',
    '任务完成',
    `饮食：${checkText(checks.diet)}`,
    `训练：${checkText(checks.workout)}`,
    `步数：${checkText(checks.steps)}`,
    `睡眠：${checkText(checks.sleep)}`,
    `总完成度：${Math.round(completion)}%`,
    '',
    '训练记录',
    `训练名称：${workout?.workoutName || '未记录'}`,
    ...workoutLines,
  ].join('\n')
}

function TipsDetails({
  defaultOpen,
  summary,
  children,
}: {
  defaultOpen: boolean
  summary: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <details
      open={open}
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <summary className="cursor-pointer text-lg font-semibold text-slate-950">{summary}</summary>
      {children}
    </details>
  )
}

function App() {
  const [today, setToday] = useState<string>(() => formatDateInput())
  const cachedData = useMemo(() => loadCachedData(), [])
  const [activeTab, setActiveTab] = useState<TabKey>(() => readInitialTab())
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateInput())
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(cachedData.dailyLogs)
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>(cachedData.workoutLogs)
  const [taskChecks, setTaskChecks] = useState<Record<string, TaskChecks>>(cachedData.taskChecks)
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>(cachedData.workoutTemplates)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(`builtin-${getDayKey(formatDateInput())}`)
  const [syncState, setSyncState] = useState<SyncState>('loading')
  const [syncMessage, setSyncMessage] = useState('正在连接服务器数据文件...')
  const [importMessage, setImportMessage] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [showOnlyUnfinishedExercises, setShowOnlyUnfinishedExercises] = useState(false)
  const [showAllPerformanceLines, setShowAllPerformanceLines] = useState(false)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const saveVersionRef = useRef(0)
  const localEditsRef = useRef(false)
  const pendingDataRef = useRef<AppData | null>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const initialLoadedRef = useRef(false)

  useEffect(() => {
    const tick = () => {
      const current = formatDateInput()
      setToday((prev) => (prev === current ? prev : current))
    }
    const interval = window.setInterval(tick, 60_000)
    const onVisibility = () => {
      if (!document.hidden) tick()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const todayKey = getDayKey(today)
  const target = dailyTargets[todayKey]
  const plan = workoutPlans[todayKey]
  const todayLog = useMemo(() => dailyLogs.find((log) => log.date === today), [dailyLogs, today])
  const todayWorkout = useMemo(() => workoutLogs.find((log) => log.date === today), [workoutLogs, today])
  const selectedLog = useMemo(
    () => dailyLogs.find((log) => log.date === selectedDate) ?? { date: selectedDate },
    [dailyLogs, selectedDate],
  )
  const selectedTarget = dailyTargets[getDayKey(selectedDate)]
  const selectedWorkout = useMemo(
    () => workoutLogs.find((log) => log.date === selectedDate),
    [workoutLogs, selectedDate],
  )
  const workoutSummary = useMemo(() => summarizeWorkout(selectedWorkout), [selectedWorkout])
  const templateOptions = useMemo(
    () => [...builtinTemplateOptions(), ...workoutTemplates.map(customTemplateToOption)],
    [workoutTemplates],
  )
  const selectedTemplate = templateOptions.find((template) => template.id === selectedTemplateId) ?? templateOptions[0]
  const checks = taskChecks[today] ?? defaultChecks
  const completion = (Object.values(checks).filter(Boolean).length / Object.keys(defaultChecks).length) * 100
  const dashboardStats = useMemo(() => calculateDashboardStats(dailyLogs, today), [dailyLogs, today])
  const trendData = useMemo(() => buildTrendData(dailyLogs, today), [dailyLogs, today])
  const trainingPerformanceData = useMemo(
    () => buildTrainingPerformanceData(workoutLogs, today),
    [workoutLogs, today],
  )
  const weeklySummary = useMemo(() => createWeeklySummary(dailyLogs, today), [dailyLogs, today])
  const dailyRecommendations = useMemo(
    () => getDailyRecommendations(todayLog, dailyLogs, today),
    [todayLog, dailyLogs, today],
  )
  const twoWeekAdjustment = useMemo(() => getTwoWeekAdjustment(dailyLogs, today), [dailyLogs, today])
  const weekendRisk = useMemo(() => getWeekendRiskRecommendation(dailyLogs, today), [dailyLogs, today])
  const pushShoulderRisk = useMemo(
    () => getPushDayShoulderRecommendation(dailyLogs, today),
    [dailyLogs, today],
  )
  const todayCalorieTarget = target.calories ?? target.calorieRange?.[1]
  const currentWeekLogs = useMemo(() => logsForWeek(dailyLogs, today), [dailyLogs, today])
  const hasWeeklyCalorieLogs = currentWeekLogs.some((log) => log.calories !== undefined)
  const weeklyConclusionCard = useMemo(
    () => weeklyConclusion(weeklySummary, twoWeekAdjustment.title),
    [weeklySummary, twoWeekAdjustment.title],
  )
  const visibleWorkoutExercises = selectedWorkout?.exercises
    .map((exercise, exerciseIndex) => ({ exercise, exerciseIndex }))
    .filter(({ exercise }) => !showOnlyUnfinishedExercises || !isExerciseFilled(exercise)) ?? []

  const applyData = useCallback((nextData: AppData) => {
    setDailyLogs(nextData.dailyLogs)
    setWorkoutLogs(nextData.workoutLogs)
    setTaskChecks(nextData.taskChecks)
    setWorkoutTemplates(nextData.workoutTemplates)
    cacheData(nextData)
  }, [])

  const persistData = useCallback(
    async (nextData: AppData) => {
      localEditsRef.current = true
      const saveVersion = saveVersionRef.current + 1
      saveVersionRef.current = saveVersion
      applyData(nextData)
      setSyncState('saving')
      setSyncMessage('正在保存到服务器数据文件...')
      const saveTask = saveQueueRef.current.then(() => saveAppData(nextData))
      saveQueueRef.current = saveTask.then(
        () => undefined,
        () => undefined,
      )

      try {
        const saved = await saveTask
        if (saveVersion === saveVersionRef.current) {
          applyData(saved)
          setSyncState('synced')
          setSyncMessage('已同步到服务器数据文件。')
        }
      } catch (error) {
        if (saveVersion === saveVersionRef.current) {
          setSyncState('offline')
          const message =
            error instanceof Error && error.message
              ? `${error.message}（已先保存在浏览器缓存）`
              : '服务器保存失败，已先保存在浏览器缓存；恢复连接后请再次保存。'
          setSyncMessage(message)
        }
      }
    },
    [applyData],
  )

  const flushPending = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    const data = pendingDataRef.current
    pendingDataRef.current = null
    if (data) {
      void persistData(data)
    }
  }, [persistData])

  const schedulePersist = useCallback(
    (nextData: AppData, immediate = false) => {
      localEditsRef.current = true
      applyData(nextData)
      pendingDataRef.current = nextData
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      if (immediate) {
        flushPending()
      } else {
        debounceTimerRef.current = window.setTimeout(flushPending, 400)
      }
    },
    [applyData, flushPending],
  )

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
        const data = pendingDataRef.current
        pendingDataRef.current = null
        if (data) {
          void saveAppData(data).catch(() => {
            /* best-effort flush on unmount */
          })
        }
      }
    }
  }, [])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (debounceTimerRef.current !== null && pendingDataRef.current) {
        const data = pendingDataRef.current
        try {
          cacheData(data)
        } catch {
          /* ignore */
        }
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  useEffect(() => {
    let canceled = false

    void loadAppData().then((result) => {
      if (canceled) return
      initialLoadedRef.current = true
      if (localEditsRef.current) {
        // 本地已开始编辑，保留本地数据，避免服务器响应覆盖用户输入
        setSyncState((prev) => (prev === 'saving' ? prev : 'synced'))
        setSyncMessage('服务器已连接，但加载期间检测到本地编辑，已保留本地数据。')
        return
      }
      if (result.serverEmptyButLocalHasData) {
        setSyncState('offline')
        setSyncMessage(
          '检测到服务器数据为空，当前显示本地浏览器缓存。请先点击"导出 JSON"备份，再决定是否手动覆盖服务器。',
        )
        return
      }
      setDailyLogs(result.data.dailyLogs)
      setWorkoutLogs(result.data.workoutLogs)
      setTaskChecks(result.data.taskChecks)
      setWorkoutTemplates(result.data.workoutTemplates)
      if (result.source === 'server') {
        setSyncState('synced')
        setSyncMessage('已同步到服务器数据文件。')
      } else {
        setSyncState('offline')
        setSyncMessage('服务器连接失败，当前使用浏览器缓存；恢复连接后请再次保存。')
      }
    })

    return () => {
      canceled = true
    }
  }, [])

  function changeTab(tabKey: TabKey) {
    setActiveTab(tabKey)
    try {
      window.sessionStorage.setItem(ACTIVE_TAB_KEY, tabKey)
    } catch {
      // Ignore private browsing or storage restrictions; tab state is only a convenience.
    }
  }

  function handleDateChange(nextDate: string) {
    if (nextDate === '') {
      setSelectedDate(today)
      return
    }
    if (!isValidDateInput(nextDate)) {
      setSelectedDate(today)
      return
    }
    setSelectedDate(nextDate)
  }

  function updateDailyLog(patch: Partial<DailyLog>) {
    const nextLogs = upsertByDate(dailyLogs, selectedDate, patch)
    schedulePersist({ dailyLogs: nextLogs, workoutLogs, taskChecks, workoutTemplates })
  }

  function quickDailyAction(patch: Partial<DailyLog>) {
    const nextLogs = upsertByDate(dailyLogs, selectedDate, patch)
    schedulePersist({ dailyLogs: nextLogs, workoutLogs, taskChecks, workoutTemplates }, true)
  }

  function updateWorkoutLog(nextLog: WorkoutLog, immediate = false) {
    const nextLogs = upsertByDate(workoutLogs, nextLog.date, nextLog)
    schedulePersist({ dailyLogs, workoutLogs: nextLogs, taskChecks, workoutTemplates }, immediate)
  }

  function updateExercise(index: number, patch: Partial<ExerciseLog>) {
    const base = selectedWorkout ?? createWorkoutFromPlan(selectedDate)
    const exercises = base.exercises.map((exercise, exerciseIndex) => (exerciseIndex === index ? { ...exercise, ...patch } : exercise))
    updateWorkoutLog({ ...base, exercises })
  }

  function updateExerciseSet(exerciseIndex: number, setIndex: number, patch: Partial<ExerciseSetLog>) {
    const base = selectedWorkout ?? createWorkoutFromPlan(selectedDate)
    const exercises = base.exercises.map((exercise, currentExerciseIndex) => {
      if (currentExerciseIndex !== exerciseIndex) return exercise
      const sets = exercise.sets.map((set, currentSetIndex) => (currentSetIndex === setIndex ? { ...set, ...patch } : set))
      return { ...exercise, sets }
    })
    updateWorkoutLog({ ...base, exercises })
  }

  function replaceWorkoutFromTemplate(template: WorkoutTemplateOption | undefined) {
    if (!template) return
    if (hasWorkoutContent(selectedWorkout) && !window.confirm('当天已有训练记录，切换计划会覆盖当前动作和组数据。确定覆盖吗？')) {
      return
    }
    updateWorkoutLog(createWorkoutFromTemplate(selectedDate, template), true)
  }

  function currentWorkoutOrBlank(): WorkoutLog {
    return selectedWorkout ?? {
      date: selectedDate,
      workoutName: '自定义训练',
      exercises: [],
    }
  }

  function addExerciseToWorkout() {
    const base = currentWorkoutOrBlank()
    updateWorkoutLog(
      {
        ...base,
        exercises: [...base.exercises, createBlankExercise()],
      },
      true,
    )
  }

  function deleteExerciseFromWorkout(exerciseIndex: number) {
    const base = currentWorkoutOrBlank()
    if (!window.confirm('确定删除这个动作吗？')) return
    updateWorkoutLog(
      {
        ...base,
        exercises: base.exercises.filter((_, index) => index !== exerciseIndex),
      },
      true,
    )
  }

  function addSetToExercise(exerciseIndex: number) {
    const base = currentWorkoutOrBlank()
    const exercises = base.exercises.map((exercise, index) =>
      index === exerciseIndex
        ? {
            ...exercise,
            sets: [...exercise.sets, {}],
          }
        : exercise,
    )
    updateWorkoutLog({ ...base, exercises }, true)
  }

  function deleteLastSetFromExercise(exerciseIndex: number) {
    const base = currentWorkoutOrBlank()
    const exercises = base.exercises.map((exercise, index) => {
      if (index !== exerciseIndex || exercise.sets.length <= 1) return exercise
      return {
        ...exercise,
        sets: exercise.sets.slice(0, -1),
      }
    })
    updateWorkoutLog({ ...base, exercises }, true)
  }

  function rebuildSetsFromTarget(exerciseIndex: number) {
    const base = currentWorkoutOrBlank()
    const exercise = base.exercises[exerciseIndex]
    if (!exercise || !window.confirm('按目标组数重建会清空这个动作已有的每组重量、次数和 RIR。确定继续吗？')) return
    const setCount = estimateSetCount(exercise.target)
    const exercises = base.exercises.map((item, index) =>
      index === exerciseIndex
        ? {
            ...item,
            completedSets: 0,
            sets: Array.from({ length: setCount }, () => ({})),
          }
        : item,
    )
    updateWorkoutLog({ ...base, exercises }, true)
  }

  function persistTemplates(nextTemplates: WorkoutTemplate[], immediate = false) {
    schedulePersist({ dailyLogs, workoutLogs, taskChecks, workoutTemplates: nextTemplates }, immediate)
  }

  function createCustomTemplate() {
    const now = new Date().toISOString()
    const nextTemplate: WorkoutTemplate = {
      id: createId('template'),
      name: '新训练模板',
      focus: '自定义',
      category: '自定义',
      exercises: [{ id: createId('template-exercise'), name: '新动作', prescription: '3 组 × 8-12 次' }],
      createdAt: now,
      updatedAt: now,
    }
    persistTemplates([...workoutTemplates, nextTemplate], true)
  }

  function updateTemplate(templateId: string, patch: Partial<WorkoutTemplate>) {
    const now = new Date().toISOString()
    const nextTemplates = workoutTemplates.map((template) =>
      template.id === templateId
        ? {
            ...template,
            ...patch,
            name: patch.name !== undefined && !patch.name.trim() ? template.name : patch.name ?? template.name,
            updatedAt: now,
          }
        : template,
    )
    persistTemplates(nextTemplates)
  }

  function updateTemplateExercise(templateId: string, exerciseIndex: number, patch: Partial<ExercisePlan>) {
    const nextTemplates = workoutTemplates.map((template) => {
      if (template.id !== templateId) return template
      return {
        ...template,
        exercises: template.exercises.map((exercise, index) => (index === exerciseIndex ? { ...exercise, ...patch } : exercise)),
        updatedAt: new Date().toISOString(),
      }
    })
    persistTemplates(nextTemplates)
  }

  function addTemplateExercise(templateId: string) {
    const nextTemplates = workoutTemplates.map((template) =>
      template.id === templateId
        ? {
            ...template,
            exercises: [
              ...template.exercises,
              { id: createId('template-exercise'), name: '新动作', prescription: '3 组 × 8-12 次' },
            ],
            updatedAt: new Date().toISOString(),
          }
        : template,
    )
    persistTemplates(nextTemplates, true)
  }

  function deleteTemplateExercise(templateId: string, exerciseIndex: number) {
    if (!window.confirm('确定删除这个模板动作吗？')) return
    const nextTemplates = workoutTemplates.map((template) => {
      if (template.id !== templateId || template.exercises.length <= 1) return template
      return {
        ...template,
        exercises: template.exercises.filter((_, index) => index !== exerciseIndex),
        updatedAt: new Date().toISOString(),
      }
    })
    persistTemplates(nextTemplates, true)
  }

  function deleteTemplate(templateId: string) {
    if (!window.confirm('确定删除这个自定义模板吗？历史训练记录不会被删除。')) return
    persistTemplates(
      workoutTemplates.filter((template) => template.id !== templateId),
      true,
    )
  }

  function saveCurrentWorkoutAsTemplate() {
    if (!selectedWorkout || selectedWorkout.exercises.length === 0) {
      window.alert('当前没有可保存的训练动作。')
      return
    }
    persistTemplates([...workoutTemplates, newTemplateFromWorkout(selectedWorkout)], true)
  }

  function toggleTask(key: keyof TaskChecks) {
    const nextChecks = {
      ...taskChecks,
      [today]: {
        ...defaultChecks,
        ...checks,
        [key]: !checks[key],
      },
    }
    schedulePersist({ dailyLogs, workoutLogs, taskChecks: nextChecks, workoutTemplates }, true)
  }

  function exportData() {
    downloadBackup(createBackup(dailyLogs, workoutLogs, taskChecks, workoutTemplates))
  }

  async function importData(file: File | undefined) {
    if (!file) return
    try {
      const payload = parseBackup(await file.text())
      const templateCount = payload.workoutTemplates?.length ?? 0
      const confirmMessage =
        `准备导入：\n` +
        `· ${payload.dailyLogs.length} 条每日记录\n` +
        `· ${payload.workoutLogs.length} 条训练记录\n` +
        `· ${templateCount} 个训练模板\n\n` +
        '这会覆盖当前所有数据。是否继续？'
      if (!window.confirm(confirmMessage)) {
        setImportMessage('已取消导入。')
        return
      }
      try {
        downloadBackup(createBackup(dailyLogs, workoutLogs, taskChecks, workoutTemplates))
      } catch (backupError) {
        console.warn('导入前自动备份失败：', backupError)
      }
      flushPending()
      await persistData({
        dailyLogs: payload.dailyLogs,
        workoutLogs: payload.workoutLogs,
        taskChecks: payload.taskChecks,
        workoutTemplates: payload.workoutTemplates ?? [],
      })
      setImportMessage('导入成功，已自动把原数据备份到下载目录。')
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : '导入失败。')
    }
  }

  async function copyTodayData() {
    const text = buildDailyCopyText({
      date: today,
      dayName: dayNames[todayKey],
      target,
      log: todayLog,
      workout: todayWorkout,
      checks,
      completion,
    })

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', 'true')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
      }
      setCopyMessage('已复制今天的数据。')
    } catch {
      setCopyMessage('复制失败，请检查浏览器剪贴板权限。')
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">本地优先个人工具</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">减脂增肌追踪</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {userProfile.heightCm} cm · 初始 {userProfile.initialWeightKg} kg · 目标周期 {userProfile.targetWeeks} · 数据保存到服务器目录
              </p>
              <div
                className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                  syncState === 'synced'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : syncState === 'saving' || syncState === 'loading'
                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                      : 'border-rose-200 bg-rose-50 text-rose-900'
                }`}
              >
                {syncState === 'synced' ? '已同步' : syncState === 'saving' ? '保存中' : syncState === 'loading' ? '连接中' : '服务器连接失败'}
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <Button className="col-span-2 sm:col-span-1" onClick={() => void copyTodayData()}>
                复制今日数据
              </Button>
              <Button className="w-full sm:w-auto" variant="secondary" onClick={exportData}>
                导出 JSON
              </Button>
              <label className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 transition hover:bg-slate-50 sm:w-auto">
                导入 JSON
                <input
                  type="file"
                  accept="application/json"
                  className="sr-only"
                  onChange={(event) => {
                    void importData(event.target.files?.[0])
                    event.currentTarget.value = ''
                  }}
                />
              </label>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600">{syncMessage}</p>
          {importMessage ? <p className="mt-3 text-sm text-slate-600">{importMessage}</p> : null}
          {copyMessage ? <p className="mt-2 text-sm text-emerald-700">{copyMessage}</p> : null}
        </header>

        <nav className="sticky top-0 z-10 mb-4 overflow-x-auto border-y border-slate-200 bg-slate-50/95 py-2 backdrop-blur">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => changeTab(tab.key)}
                className={`h-10 rounded-md px-4 text-sm font-medium transition ${
                  activeTab === tab.key ? 'bg-slate-950 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {activeTab === 'today' ? (
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="bg-slate-950 text-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-emerald-200">{today} · {dayNames[todayKey]}</p>
                  <h2 className="mt-2 text-3xl font-semibold">{target.workoutName}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{plan.focus}</p>
                </div>
                <Badge tone={target.isTrainingDay ? 'positive' : 'neutral'}>{target.isTrainingDay ? '训练日' : '休息日'}</Badge>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-lg bg-white/10 p-3">
                  <p className="text-xs text-slate-300">热量</p>
                  <p className="mt-1 text-xl font-semibold">{target.calories ?? `${target.calorieRange?.[0]}-${target.calorieRange?.[1]}`}</p>
                  <p className="text-xs text-slate-300">kcal</p>
                </div>
                <div className="rounded-lg bg-white/10 p-3">
                  <p className="text-xs text-slate-300">蛋白质</p>
                  <p className="mt-1 text-xl font-semibold">{target.protein}</p>
                  <p className="text-xs text-slate-300">g</p>
                </div>
                <div className="rounded-lg bg-white/10 p-3">
                  <p className="text-xs text-slate-300">步数</p>
                  <p className="mt-1 text-xl font-semibold">{target.stepTarget}</p>
                  <p className="text-xs text-slate-300">步</p>
                </div>
              </div>
              <div className="mt-5">
                <div className="flex items-center justify-between text-sm">
                  <span>今日完成度</span>
                  <span>{Math.round(completion)}%</span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={completion} />
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-slate-950">一键勾选</h2>
              <div className="mt-4 grid gap-2">
                {[
                  ['diet', '饮食记录完成'],
                  ['workout', target.isTrainingDay ? '训练完成' : '休息日任务完成'],
                  ['steps', `步数完成 · ${target.stepTarget} 步`],
                  ['sleep', '睡眠记录完成'],
                ].map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3">
                    <input
                      type="checkbox"
                      checked={checks[key as keyof TaskChecks]}
                      onChange={() => toggleTask(key as keyof TaskChecks)}
                      className="h-5 w-5 rounded border-slate-300 text-emerald-600"
                    />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-slate-950">本周热量预算</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <BudgetTile label="已摄入" value={`${dashboardStats.calorieBudget.consumed} kcal`} />
                <BudgetTile
                  label="剩余额度"
                  value={`${dashboardStats.calorieBudget.remaining} kcal`}
                  danger={dashboardStats.calorieBudget.remaining < 0}
                />
                <BudgetTile label="剩余天数" value={`${dashboardStats.calorieBudget.remainingDays} 天`} />
                <BudgetTile
                  label="平均还能吃"
                  value={hasWeeklyCalorieLogs ? `${dashboardStats.calorieBudget.averagePerRemainingDay} kcal/天` : '本周暂无摄入记录'}
                  danger={hasWeeklyCalorieLogs && dashboardStats.calorieBudget.averagePerRemainingDay < 1500}
                />
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                {hasWeeklyCalorieLogs
                  ? `预算按周日到周六、约 ${weeklyCalorieTarget} kcal 计算；如果周末偏高，优先控制周末自由饮食，不建议极端压低工作日热量。`
                  : '先记录今天热量后，这里会开始计算本周剩余额度和剩余天数平均值。'}
              </p>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-slate-950">今日宏量营养剩余额度</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MacroTile label="热量" value={signedRemaining(todayCalorieTarget, todayLog?.calories)} unit="kcal" tone={remainingTone(todayCalorieTarget, todayLog?.calories)} />
                <MacroTile label="蛋白质" value={signedRemaining(target.protein, todayLog?.protein)} unit="g" tone={remainingTone(target.protein, todayLog?.protein)} />
                <MacroTile label="碳水" value={signedRemaining(target.carbs, todayLog?.carbs)} unit="g" tone={remainingTone(target.carbs, todayLog?.carbs)} />
                <MacroTile label="脂肪" value={signedRemaining(target.fat, todayLog?.fat)} unit="g" tone={remainingTone(target.fat, todayLog?.fat)} />
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">在“每日记录”输入已吃数据后，这里会自动更新。</p>
            </Card>

            <Card className="lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-950">今日训练动作</h2>
                <Badge tone="neutral">{plan.name}</Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {plan.exercises.map((exercise, index) => (
                  <div key={exercise.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-950">{index + 1}. {exercise.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{exercise.prescription}</p>
                    {exercise.note ? <p className="mt-1 text-xs text-amber-700">{exercise.note}</p> : null}
                  </div>
                ))}
              </div>
            </Card>

            <TipsDetails defaultOpen={false} summary="肩部保护提醒">
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
                {shoulderProtectionTips.map((tip) => (
                  <li key={tip} className="rounded-md bg-slate-50 px-3 py-2">{tip}</li>
                ))}
              </ul>
            </TipsDetails>

            <TipsDetails defaultOpen={weekendRisk.tone !== 'positive'} summary="今日提示">
              <div className="mt-3 grid gap-2">
                <RecommendationBox title={weekendRisk.title} message={weekendRisk.message} tone={weekendRisk.tone} />
                <RecommendationBox title={pushShoulderRisk.title} message={pushShoulderRisk.message} tone={pushShoulderRisk.tone} />
                {dailyRecommendations.map((item) => (
                  <RecommendationBox key={item.title} title={item.title} message={item.message} tone={item.tone} />
                ))}
              </div>
            </TipsDetails>
          </div>
        ) : null}

        {activeTab === 'daily' ? (
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">每日记录</h2>
                <p className="mt-1 text-sm text-slate-500">手机端先填快捷项，完整围度和备注有时间再补。</p>
              </div>
              <Field label="日期">
                <TextInput type="date" value={selectedDate} onChange={(event) => handleDateChange(event.target.value)} />
              </Field>
            </div>

            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-emerald-950">1 分钟快捷记录</h3>
                  <p className="mt-1 text-xs text-emerald-800">优先填这些字段，足够支撑今日预算、周报和趋势判断。</p>
                </div>
                <Badge tone="positive">快捷</Badge>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <NumberField label="体重 kg" value={selectedLog.morningWeightKg} step="0.1" kind="decimal" range={{ min: 20, max: 300 }} onChange={(value) => updateDailyLog({ morningWeightKg: value })} />
                <NumberField label="热量 kcal" value={selectedLog.calories} range={{ min: 0, max: 10000, allowZero: true }} onChange={(value) => updateDailyLog({ calories: value })} />
                <NumberField label="蛋白质 g" value={selectedLog.protein} range={{ min: 0, max: 500, allowZero: true }} onChange={(value) => updateDailyLog({ protein: value })} />
                <NumberField label="步数" value={selectedLog.steps} range={{ min: 0, max: 100000, allowZero: true }} onChange={(value) => updateDailyLog({ steps: value })} />
                <NumberField label="睡眠 h" value={selectedLog.sleepHours} step="0.1" kind="decimal" range={{ min: 0, max: 24, allowZero: true }} onChange={(value) => updateDailyLog({ sleepHours: value })} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" className="px-3" onClick={() => quickDailyAction({ sleepHours: 7 })}>睡眠 7h</Button>
                <Button variant="secondary" className="px-3" onClick={() => quickDailyAction({ trained: true, workoutCompletion: 100 })}>训练 100%</Button>
                <Button variant="secondary" className="px-3" onClick={() => quickDailyAction({ steps: selectedTarget.stepTarget })}>步数达标</Button>
                <span className="self-center text-xs text-emerald-800">
                  {syncState === 'synced' ? '已保存到服务器' : syncState === 'saving' ? '保存中...' : '离线缓存中'}
                </span>
              </div>
            </div>

            <details className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-amber-950">身体状态</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <NumberField label="训练完成度 %" value={selectedLog.workoutCompletion} range={{ min: 0, max: 100, allowZero: true }} onChange={(value) => updateDailyLog({ workoutCompletion: value })} />
                <NumberField label="肩痛评分 0-10（可选）" value={selectedLog.shoulderPainScore} range={{ min: 0, max: 10, allowZero: true }} onChange={(value) => updateDailyLog({ shoulderPainScore: value })} />
                <NumberField label="疲劳评分 0-10（可选）" value={selectedLog.fatigueScore} range={{ min: 0, max: 10, allowZero: true }} onChange={(value) => updateDailyLog({ fatigueScore: value })} />
              </div>
            </details>

            <details className="mt-5 rounded-lg border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">更多记录</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <NumberField label="腰围 cm" value={selectedLog.waistCm} step="0.1" kind="decimal" range={{ min: 30, max: 200 }} onChange={(value) => updateDailyLog({ waistCm: value })} />
                <NumberField label="胸围 cm（可选）" value={selectedLog.chestCm} step="0.1" kind="decimal" range={{ min: 30, max: 200 }} onChange={(value) => updateDailyLog({ chestCm: value })} />
                <NumberField label="上臂围 cm（可选）" value={selectedLog.upperArmCm} step="0.1" kind="decimal" range={{ min: 30, max: 200 }} onChange={(value) => updateDailyLog({ upperArmCm: value })} />
                <NumberField label="大腿围 cm（可选）" value={selectedLog.thighCm} step="0.1" kind="decimal" range={{ min: 30, max: 200 }} onChange={(value) => updateDailyLog({ thighCm: value })} />
                <NumberField label="实际碳水 g" value={selectedLog.carbs} range={{ min: 0, max: 1000, allowZero: true }} onChange={(value) => updateDailyLog({ carbs: value })} />
                <NumberField label="实际脂肪 g" value={selectedLog.fat} range={{ min: 0, max: 500, allowZero: true }} onChange={(value) => updateDailyLog({ fat: value })} />
                <Field label="是否训练">
                  <select
                    value={selectedLog.trained === undefined ? '' : selectedLog.trained ? 'yes' : 'no'}
                    onChange={(event) => updateDailyLog({ trained: event.target.value === '' ? undefined : event.target.value === 'yes' })}
                    className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="">未填写</option>
                    <option value="yes">是</option>
                    <option value="no">否</option>
                  </select>
                </Field>
              </div>
              <div className="mt-4">
                <Field label="备注">
                  <TextArea value={selectedLog.notes ?? ''} onChange={(event) => updateDailyLog({ notes: event.target.value })} />
                </Field>
              </div>
            </details>
          </Card>
        ) : null}

        {activeTab === 'workout' ? (
          <div className="grid gap-4">
            <WorkoutControlPanel
              selectedDate={selectedDate}
              selectedWorkout={selectedWorkout}
              workoutSummary={workoutSummary}
              selectedTemplate={selectedTemplate}
              onDateChange={handleDateChange}
              onPrimaryAction={() => {
                if (selectedWorkout) addExerciseToWorkout()
                else replaceWorkoutFromTemplate(selectedTemplate)
              }}
              onBlankWorkout={addExerciseToWorkout}
            />

            <WorkoutPlanPicker
              selectedDate={selectedDate}
              selectedTemplateId={selectedTemplateId}
              selectedTemplate={selectedTemplate}
              templateOptions={templateOptions}
              onTemplateChange={setSelectedTemplateId}
              onApplySelected={() => replaceWorkoutFromTemplate(selectedTemplate)}
              onApplyRecommended={() => replaceWorkoutFromTemplate(templateOptions.find((template) => template.id === `builtin-${getDayKey(selectedDate)}`))}
            />

            <Card>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">当天动作记录</h2>
                  <p className="mt-1 text-sm text-slate-500">先记组数和表现；动作名称、目标和备注放在每张卡的编辑区。</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedWorkout ? <Badge tone="positive">已记录</Badge> : <Badge tone="neutral">未开始</Badge>}
                  {selectedWorkout ? (
                    <button
                      type="button"
                      onClick={() => setShowOnlyUnfinishedExercises((value) => !value)}
                      className={`min-h-10 rounded-md border px-3 text-sm font-medium transition ${
                        showOnlyUnfinishedExercises
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {showOnlyUnfinishedExercises ? '显示全部动作' : '只看未填写'}
                    </button>
                  ) : null}
                </div>
              </div>

              {selectedWorkout ? (
                <div className="mt-5 grid gap-4">
                  <Field label="训练名称">
                    <TextInput value={selectedWorkout.workoutName} onChange={(event) => updateWorkoutLog({ ...selectedWorkout, workoutName: event.target.value })} />
                  </Field>

                  {visibleWorkoutExercises.map(({ exercise, exerciseIndex }) => (
                    <ExerciseRecordCard
                      key={`${exercise.exerciseId}-${exerciseIndex}`}
                      exercise={exercise}
                      exerciseIndex={exerciseIndex}
                      onUpdateExercise={updateExercise}
                      onUpdateSet={updateExerciseSet}
                      onAddSet={addSetToExercise}
                      onDeleteLastSet={deleteLastSetFromExercise}
                      onRebuildSets={rebuildSetsFromTarget}
                      onDeleteExercise={deleteExerciseFromWorkout}
                    />
                  ))}

                  {visibleWorkoutExercises.length === 0 ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                      当前筛选下没有未填写动作。可以切回“显示全部动作”继续查看或修改。
                    </div>
                  ) : null}

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">训练操作</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Button onClick={addExerciseToWorkout}>新增当天动作</Button>
                      <Button variant="secondary" onClick={saveCurrentWorkoutAsTemplate}>保存为模板</Button>
                    </div>
                  </div>
                  <Field label="训练备注">
                    <TextArea value={selectedWorkout.notes ?? ''} onChange={(event) => updateWorkoutLog({ ...selectedWorkout, notes: event.target.value })} />
                  </Field>
                </div>
              ) : (
                <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-base font-semibold text-slate-900">还没有这一天的训练记录</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">选择计划开始会生成完整动作列表；临时改练也可以直接新增空白动作。</p>
                  <div className="mt-4 grid gap-2 sm:mx-auto sm:max-w-md sm:grid-cols-2">
                    <Button onClick={() => replaceWorkoutFromTemplate(selectedTemplate)}>选择计划开始</Button>
                    <Button variant="secondary" onClick={addExerciseToWorkout}>新增空白训练</Button>
                  </div>
                </div>
              )}
            </Card>

            <WorkoutTemplateManager
              templates={workoutTemplates}
              selectedWorkout={selectedWorkout}
              onCreateTemplate={createCustomTemplate}
              onSaveCurrent={saveCurrentWorkoutAsTemplate}
              onUpdateTemplate={updateTemplate}
              onUpdateTemplateExercise={updateTemplateExercise}
              onAddTemplateExercise={addTemplateExercise}
              onDeleteTemplateExercise={deleteTemplateExercise}
              onApplyTemplate={(template) => replaceWorkoutFromTemplate(customTemplateToOption(template))}
              onDeleteTemplate={deleteTemplate}
            />
          </div>
        ) : null}

        {activeTab === 'dashboard' ? (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="当前体重" value={`${roundMetric(dashboardStats.currentWeight)} kg`} />
              <StatCard label="7 日平均体重" value={`${roundMetric(dashboardStats.averageWeight7)} kg`} />
              <StatCard label="本周平均热量" value={`${roundMetric(dashboardStats.weekAverageCalories, 0)} kcal`} />
              <StatCard label="蛋白质达标天数" value={`${dashboardStats.proteinMetDays} 天`} helper="按每天目标判断" />
              <StatCard label="训练完成率" value={`${dashboardStats.trainingCompletionRate}%`} />
              <StatCard label="本周平均步数" value={`${roundMetric(dashboardStats.averageSteps, 0)} 步`} />
              <StatCard label="肩痛平均分" value={`${roundMetric(dashboardStats.averageShoulderPain)} / 10`} helper="只统计已填写日期" />
              <StatCard label="周总热量进度" value={`${dashboardStats.weekTotalCalories} kcal`} helper={`目标约 ${weeklyCalorieTarget} kcal`} />
              <Card>
                <p className="text-sm text-slate-500">两周建议</p>
                <p className="mt-2 font-semibold text-slate-950">{twoWeekAdjustment.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{twoWeekAdjustment.message}</p>
              </Card>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="体重趋势" isEmpty={!hasChartData(trendData, ['weight', 'weightAverage7'])}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip />
                  <Line type="monotone" name="每日体重" dataKey="weight" stroke="#059669" strokeWidth={2} dot={false} />
                  <Line type="monotone" name="7 日均重" dataKey="weightAverage7" stroke="#0f172a" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ChartCard>
              <ChartCard title="腰围趋势" isEmpty={!hasChartData(trendData, ['waist'])}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="waist" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartCard>
              <ChartCard title="热量摄入趋势" isEmpty={!hasChartData(trendData, ['calories'])}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="calories" stroke="#ea580c" fill="#fed7aa" />
                </AreaChart>
              </ChartCard>
              <ChartCard title="蛋白质达标趋势" isEmpty={!hasChartData(trendData, ['proteinMet'])}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis ticks={[0, 1]} />
                  <Tooltip />
                  <Bar dataKey="proteinMet" fill="#10b981" />
                </BarChart>
              </ChartCard>
              <ChartCard title="肩痛趋势" isEmpty={!hasChartData(trendData, ['shoulderPain'])}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line type="monotone" name="肩痛评分" dataKey="shoulderPain" stroke="#e11d48" strokeWidth={2} dot />
                </LineChart>
              </ChartCard>
              <ChartCard
                title="训练表现趋势（估算最佳工作组）"
                isEmpty={!hasChartData(trainingPerformanceData, ['benchPress', 'chestPress', 'pulldown', 'row', 'squatOrLegPress', 'romanianDeadlift'])}
                action={
                  <button
                    type="button"
                    onClick={() => setShowAllPerformanceLines((value) => !value)}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {showAllPerformanceLines ? '只看主要动作' : '显示全部动作'}
                  </button>
                }
              >
                <LineChart data={trainingPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" name="卧推" dataKey="benchPress" stroke="#059669" strokeWidth={2} dot={false} />
                  <Line type="monotone" name="胸推" dataKey="chestPress" stroke="#2563eb" strokeWidth={2} dot={false} />
                  {showAllPerformanceLines ? <Line type="monotone" name="下拉" dataKey="pulldown" stroke="#7c3aed" strokeWidth={2} dot={false} /> : null}
                  {showAllPerformanceLines ? <Line type="monotone" name="划船" dataKey="row" stroke="#ea580c" strokeWidth={2} dot={false} /> : null}
                  {showAllPerformanceLines ? <Line type="monotone" name="深蹲/腿举" dataKey="squatOrLegPress" stroke="#0f766e" strokeWidth={2} dot={false} /> : null}
                  {showAllPerformanceLines ? <Line type="monotone" name="罗马尼亚硬拉" dataKey="romanianDeadlift" stroke="#be123c" strokeWidth={2} dot={false} /> : null}
                </LineChart>
              </ChartCard>
            </div>
          </div>
        ) : null}

        {activeTab === 'weekly' ? (
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="lg:col-span-2">
              <RecommendationBox title={weeklyConclusionCard.title} message={weeklyConclusionCard.message} tone={weeklyConclusionCard.tone} />
            </div>
            <Card>
              <h2 className="text-xl font-semibold text-slate-950">本周总结</h2>
              <p className="mt-1 text-sm text-slate-500">{weeklySummary.weekStart} 至 {weeklySummary.weekEnd}</p>
              <div className="mt-5 grid gap-3">
                <SummaryRow label="本周平均体重" value={`${roundMetric(weeklySummary.averageWeight)} kg`} />
                <SummaryRow label="较上周 7 日均值" value={weeklySummary.weightDelta === undefined ? '暂无' : `${weeklySummary.weightDelta > 0 ? '+' : ''}${weeklySummary.weightDelta} kg`} />
                <SummaryRow label="本周腰围变化" value={weeklySummary.waistDelta === undefined ? '暂无' : `${weeklySummary.waistDelta > 0 ? '+' : ''}${weeklySummary.waistDelta} cm`} />
                <SummaryRow label="训练完成率" value={`${weeklySummary.trainingCompletionRate}%`} />
                <SummaryRow label="本周总热量" value={`${weeklySummary.totalCalories} kcal`} />
                <SummaryRow label="周末平均热量" value={weeklySummary.weekendAverageCalories === undefined ? '暂无' : `${weeklySummary.weekendAverageCalories} kcal`} danger={weeklySummary.weekendOverLimit} />
              </div>
            </Card>
            <div className="grid gap-4">
              <RecommendationBox title={twoWeekAdjustment.title} message={twoWeekAdjustment.message} tone={twoWeekAdjustment.tone} />
              <RecommendationBox title={weekendRisk.title} message={weekendRisk.message} tone={weekendRisk.tone} />
              <RecommendationBox title={pushShoulderRisk.title} message={pushShoulderRisk.message} tone={pushShoulderRisk.tone} />
              <Card>
                <h2 className="text-lg font-semibold text-slate-950">下一周建议</h2>
                <div className="mt-3 grid gap-2">
                  {weeklySummary.suggestions.map((suggestion) => (
                    <div
                      key={suggestion}
                      className={`rounded-lg border p-3 text-sm leading-6 ${
                        weeklySummary.weekendOverLimit && suggestion.includes('周末')
                          ? 'border-rose-200 bg-rose-50 text-rose-900'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <h2 className="text-lg font-semibold text-slate-950">周末规则检查</h2>
                <div className="mt-3 grid gap-2">
                  {dailyLogs
                    .filter((log) => log.date >= weeklySummary.weekStart && log.date <= weeklySummary.weekEnd && [5, 6].includes(getDayKey(log.date)))
                    .map((log) => (
                      <div key={log.date} className="rounded-lg border border-slate-200 p-3 text-sm">
                        <p className="font-medium text-slate-950">{log.date} · {dayNames[getDayKey(log.date)]}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge tone={(log.calories ?? 0) > 3000 ? 'danger' : 'positive'}>热量 {log.calories ?? '未填'} kcal</Badge>
                          <Badge tone={log.protein !== undefined && log.protein < 160 ? 'warning' : 'positive'}>蛋白质 {log.protein ?? '未填'} g</Badge>
                          <Badge tone={log.steps !== undefined && log.steps < 8000 ? 'warning' : 'positive'}>步数 {log.steps ?? '未填'}</Badge>
                        </div>
                      </div>
                    ))}
                  {dailyLogs.filter((log) => log.date >= weeklySummary.weekStart && log.date <= weeklySummary.weekEnd && [5, 6].includes(getDayKey(log.date))).length === 0 ? (
                    <p className="text-sm text-slate-500">本周还没有周五/周六记录。</p>
                  ) : null}
                </div>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}

function WorkoutControlPanel({
  selectedDate,
  selectedWorkout,
  workoutSummary,
  selectedTemplate,
  onDateChange,
  onPrimaryAction,
  onBlankWorkout,
}: {
  selectedDate: string
  selectedWorkout: WorkoutLog | undefined
  workoutSummary: WorkoutSummary
  selectedTemplate: WorkoutTemplateOption | undefined
  onDateChange: (date: string) => void
  onPrimaryAction: () => void
  onBlankWorkout: () => void
}) {
  return (
    <Card className="border-slate-300">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={selectedWorkout ? 'positive' : 'neutral'}>{selectedWorkout ? '已记录' : '未开始'}</Badge>
            <Badge tone={selectedTemplate?.source === 'custom' ? 'warning' : 'neutral'}>
              {selectedTemplate?.source === 'custom' ? '自定义模板' : '内置计划'}
            </Badge>
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">{selectedWorkout?.workoutName ?? selectedTemplate?.name ?? '选择今天的训练'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            今日训练优先：先确定练什么，再记录每组表现；模板管理放在页面底部。
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:w-80">
          <Field label="训练日期">
            <TextInput type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            <Button onClick={onPrimaryAction}>{selectedWorkout ? '新增动作' : '选择计划开始'}</Button>
            <Button variant="secondary" onClick={onBlankWorkout}>空白训练</Button>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <WorkoutMetric label="动作数" value={`${workoutSummary.exerciseCount}`} />
        <WorkoutMetric label="已填组数" value={`${workoutSummary.filledSets}/${workoutSummary.totalSets}`} />
        <WorkoutMetric label="记录进度" value={`${workoutSummary.completionPercent}%`} />
      </div>
    </Card>
  )
}

function WorkoutMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function WorkoutPlanPicker({
  selectedDate,
  selectedTemplateId,
  selectedTemplate,
  templateOptions,
  onTemplateChange,
  onApplySelected,
  onApplyRecommended,
}: {
  selectedDate: string
  selectedTemplateId: string
  selectedTemplate: WorkoutTemplateOption | undefined
  templateOptions: WorkoutTemplateOption[]
  onTemplateChange: (templateId: string) => void
  onApplySelected: () => void
  onApplyRecommended: () => void
}) {
  const recommendedId = `builtin-${getDayKey(selectedDate)}`
  const previewExercises = selectedTemplate?.exercises.slice(0, 3) ?? []

  return (
    <details className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">选择 / 切换训练计划</summary>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
        <Field label={`训练计划（今日推荐：${workoutPlans[getDayKey(selectedDate)].name}）`}>
          <select
            value={selectedTemplateId}
            onChange={(event) => onTemplateChange(event.target.value)}
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <optgroup label="内置计划">
              {templateOptions
                .filter((template) => template.source === 'builtin')
                .map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.id === recommendedId ? '今日推荐 · ' : ''}
                    {template.name} · {template.focus}
                  </option>
                ))}
            </optgroup>
            <optgroup label="自定义模板">
              {templateOptions
                .filter((template) => template.source === 'custom')
                .map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.focus}
                  </option>
                ))}
            </optgroup>
          </select>
        </Field>
        <Button onClick={onApplySelected}>填入所选计划</Button>
        <Button variant="secondary" onClick={onApplyRecommended}>填入今日推荐</Button>
      </div>

      {selectedTemplate ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-950">{selectedTemplate.name}</p>
              <p className="mt-1 text-sm text-slate-500">{selectedTemplate.focus} · {selectedTemplate.exercises.length} 个动作</p>
            </div>
            <Badge tone={selectedTemplate.id === recommendedId ? 'positive' : selectedTemplate.source === 'custom' ? 'warning' : 'neutral'}>
              {selectedTemplate.id === recommendedId ? '今日推荐' : selectedTemplate.source === 'custom' ? '自定义模板' : '内置计划'}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {previewExercises.map((exercise) => (
              <div key={exercise.id} className="rounded-md bg-white px-3 py-2 text-sm">
                <p className="font-medium text-slate-800">{exercise.name}</p>
                <p className="mt-1 text-xs text-slate-500">{exercise.prescription}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </details>
  )
}

function ExerciseRecordCard({
  exercise,
  exerciseIndex,
  onUpdateExercise,
  onUpdateSet,
  onAddSet,
  onDeleteLastSet,
  onRebuildSets,
  onDeleteExercise,
}: {
  exercise: ExerciseLog
  exerciseIndex: number
  onUpdateExercise: (index: number, patch: Partial<ExerciseLog>) => void
  onUpdateSet: (exerciseIndex: number, setIndex: number, patch: Partial<ExerciseSetLog>) => void
  onAddSet: (exerciseIndex: number) => void
  onDeleteLastSet: (exerciseIndex: number) => void
  onRebuildSets: (exerciseIndex: number) => void
  onDeleteExercise: (exerciseIndex: number) => void
}) {
  const filledSets = exercise.sets.filter((set) => set.weight !== undefined || set.reps !== undefined || set.rir !== undefined).length

  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-950">{exerciseIndex + 1}. {exercise.name}</p>
          <p className="mt-1 text-sm text-slate-500">{exercise.target}</p>
        </div>
        <Badge tone={filledSets > 0 ? 'positive' : 'neutral'}>{filledSets}/{exercise.sets.length} 组</Badge>
      </div>

      <div className="mt-3 grid gap-2">
        {exercise.sets.map((set, setIndex) => (
          <div key={setIndex} className="grid min-w-0 grid-cols-3 gap-2 rounded-md bg-slate-50 p-2">
            <NumberField label={`${setIndex + 1}组 kg`} value={set.weight} step="0.5" kind="decimal" range={{ min: 0, max: 500, allowZero: true }} onChange={(value) => onUpdateSet(exerciseIndex, setIndex, { weight: value })} />
            <NumberField label="次数" value={set.reps} range={{ min: 1, max: 100 }} onChange={(value) => onUpdateSet(exerciseIndex, setIndex, { reps: value })} />
            <NumberField label="RIR" value={set.rir} range={{ min: 0, max: 10, allowZero: true }} onChange={(value) => onUpdateSet(exerciseIndex, setIndex, { rir: value })} />
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button variant="secondary" className="px-2" onClick={() => onAddSet(exerciseIndex)}>加一组</Button>
        <Button variant="secondary" className="px-2" onClick={() => onDeleteLastSet(exerciseIndex)} disabled={exercise.sets.length <= 1}>删最后组</Button>
      </div>

      <details className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">编辑动作</summary>
        <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
          <Field label="动作名称">
            <TextInput value={exercise.name} onChange={(event) => onUpdateExercise(exerciseIndex, { name: event.target.value })} />
          </Field>
          <Field label="目标组次">
            <TextInput value={exercise.target} onChange={(event) => onUpdateExercise(exerciseIndex, { target: event.target.value })} />
          </Field>
          <NumberField
            label="完成组数"
            value={exercise.completedSets}
            min={0}
            onChange={(value) => onUpdateExercise(exerciseIndex, { completedSets: value })}
          />
        </div>
        <div className="mt-3">
          <Field label="动作备注">
            <TextInput value={exercise.notes ?? ''} onChange={(event) => onUpdateExercise(exerciseIndex, { notes: event.target.value })} />
          </Field>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => onRebuildSets(exerciseIndex)}>按目标重建组</Button>
          <Button variant="ghost" onClick={() => onDeleteExercise(exerciseIndex)}>删除动作</Button>
        </div>
      </details>
    </div>
  )
}

function WorkoutTemplateManager({
  templates,
  selectedWorkout,
  onCreateTemplate,
  onSaveCurrent,
  onUpdateTemplate,
  onUpdateTemplateExercise,
  onAddTemplateExercise,
  onDeleteTemplateExercise,
  onApplyTemplate,
  onDeleteTemplate,
}: {
  templates: WorkoutTemplate[]
  selectedWorkout: WorkoutLog | undefined
  onCreateTemplate: () => void
  onSaveCurrent: () => void
  onUpdateTemplate: (templateId: string, patch: Partial<WorkoutTemplate>) => void
  onUpdateTemplateExercise: (templateId: string, exerciseIndex: number, patch: Partial<ExercisePlan>) => void
  onAddTemplateExercise: (templateId: string) => void
  onDeleteTemplateExercise: (templateId: string, exerciseIndex: number) => void
  onApplyTemplate: (template: WorkoutTemplate) => void
  onDeleteTemplate: (templateId: string) => void
}) {
  return (
    <details className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">模板管理 · {templates.length} 个自定义模板</summary>
      <div className="mt-4 grid gap-4">
        <div className="grid gap-2 sm:grid-cols-[auto_auto] sm:justify-start">
          <Button onClick={onCreateTemplate}>新建模板</Button>
          <Button variant="secondary" onClick={onSaveCurrent} disabled={!selectedWorkout || selectedWorkout.exercises.length === 0}>
            从当前训练保存为模板
          </Button>
        </div>

        {templates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">还没有自定义模板。</p>
        ) : null}

        {templates.map((template) => (
          <div key={template.id} className="rounded-lg border border-slate-200 p-3">
            <div className="grid gap-3 lg:grid-cols-3">
              <Field label="模板名称">
                <TextInput value={template.name} onChange={(event) => onUpdateTemplate(template.id, { name: event.target.value })} />
              </Field>
              <Field label="重点">
                <TextInput value={template.focus} onChange={(event) => onUpdateTemplate(template.id, { focus: event.target.value })} />
              </Field>
              <Field label="分类">
                <TextInput value={template.category} onChange={(event) => onUpdateTemplate(template.id, { category: event.target.value })} />
              </Field>
            </div>

            <div className="mt-3 grid gap-2">
              {template.exercises.map((exercise, exerciseIndex) => (
                <div key={`${template.id}-${exercise.id}-${exerciseIndex}`} className="grid gap-2 rounded-md bg-slate-50 p-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
                  <Field label="动作名称">
                    <TextInput value={exercise.name} onChange={(event) => onUpdateTemplateExercise(template.id, exerciseIndex, { name: event.target.value })} />
                  </Field>
                  <Field label="目标组次">
                    <TextInput value={exercise.prescription} onChange={(event) => onUpdateTemplateExercise(template.id, exerciseIndex, { prescription: event.target.value })} />
                  </Field>
                  <Field label="备注">
                    <TextInput value={exercise.note ?? ''} onChange={(event) => onUpdateTemplateExercise(template.id, exerciseIndex, { note: event.target.value })} />
                  </Field>
                  <Button variant="ghost" onClick={() => onDeleteTemplateExercise(template.id, exerciseIndex)} disabled={template.exercises.length <= 1}>
                    删除
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
              <Button variant="secondary" onClick={() => onAddTemplateExercise(template.id)}>添加模板动作</Button>
              <Button variant="secondary" onClick={() => onApplyTemplate(template)}>填入当天</Button>
              <Button variant="ghost" onClick={() => onDeleteTemplate(template.id)}>删除模板</Button>
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = '1',
  range,
  kind = 'integer',
}: {
  label: string
  value?: number
  onChange: (value: number | undefined) => void
  min?: number
  max?: number
  step?: string
  range?: NumberRange
  kind?: 'decimal' | 'integer'
}) {
  const effectiveRange: NumberRange | undefined =
    range ?? (min !== undefined || max !== undefined ? { min, max, allowZero: min === 0 } : undefined)
  const inputMode = kind === 'decimal' ? 'decimal' : 'numeric'
  const pattern = kind === 'decimal' ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'
  return (
    <Field label={label}>
      <TextInput
        type="text"
        inputMode={inputMode}
        pattern={pattern}
        value={displayNumber(value)}
        data-min={min}
        data-max={max}
        data-step={step}
        onChange={(event) => onChange(numberValue(event.target.value, effectiveRange))}
      />
    </Field>
  )
}

function BudgetTile({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${danger ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${danger ? 'text-rose-700' : 'text-slate-950'}`}>{value}</p>
    </div>
  )
}

function MacroTile({
  label,
  value,
  unit,
  tone,
}: {
  label: string
  value: string
  unit: string
  tone: 'positive' | 'warning' | 'neutral'
}) {
  const classes = {
    positive: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  }

  return (
    <div className={`rounded-lg border p-3 ${classes[tone]}`}>
      <p className="text-xs opacity-75">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className="text-xs opacity-75">{unit}</p>
    </div>
  )
}

function ChartCard({
  title,
  children,
  isEmpty = false,
  action,
}: {
  title: string
  children: ReactElement
  isEmpty?: boolean
  action?: ReactNode
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {action}
      </div>
      <div className="mt-4 h-56 sm:h-64">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm leading-6 text-slate-500">
            连续记录两天以上后，这里会显示趋势。
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}

function SummaryRow({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${danger ? 'text-rose-700' : 'text-slate-950'}`}>{value}</span>
    </div>
  )
}

export default App
