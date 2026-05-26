import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { dailyTargets, dayNames, weeklyCalorieTarget, workoutPlans } from './data/plans'
import { formatDateInput, getDayKey, isValidDateInput } from './lib/dates'
import { calculateDashboardStats, buildTrainingPerformanceData, buildTrendData, createWeeklySummary, findPreviousExerciseRecord, logsForWeek } from './lib/metrics'
import type { PreviousExerciseRecord, TrendPoint, TrainingPerformancePoint } from './lib/metrics'
import {
  buildDailyCopyText,
  builtinTemplateOptions,
  createBlankExercise,
  createWorkoutFromPlan,
  createWorkoutFromTemplate,
  customTemplateToOption,
  estimateSetCount,
  hasWorkoutContent,
  isExerciseFilled,
  newTemplateFromWorkout,
  summarizeWorkout,
  upsertByDate,
  type WorkoutTemplateOption,
} from './lib/workout'
import {
  getDailyRecommendations,
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
  saveAppData,
} from './lib/storage'
import { createId } from './lib/ids'
import { getBuiltinTemplates } from './data/plans'
import type { AdjustmentRecommendation, DailyLog, ExerciseLog, ExercisePlan, ExerciseSetLog, WeeklySummary, WorkoutLog, WorkoutTemplate } from './types'
import { Button } from './components/ui'
import { useColorScheme } from './hooks/useColorScheme'
import { useConfirm } from './components/ConfirmDialog'
import { ThemeToggle } from './components/ThemeToggle'
import { CopyPreviewDialog } from './components/CopyPreviewDialog'
import { TodayTab } from './tabs/TodayTab'
import { DailyRecordTab } from './tabs/DailyRecordTab'
import { WorkoutTab } from './tabs/WorkoutTab'
const DashboardTab = lazy(() => import('./tabs/DashboardTab').then((mod) => ({ default: mod.DashboardTab })))
import { WeeklyTab } from './tabs/WeeklyTab'

type TabKey = 'today' | 'daily' | 'workout' | 'dashboard' | 'weekly'

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
  } catch (error) {
    console.warn('读取上次激活的标签失败（sessionStorage 不可用）：', error)
    return 'today'
  }
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

function App() {
  const { preference: colorPreference, resolved: resolvedColorScheme, cycle: cycleColorScheme } = useColorScheme()
  const { confirm, dialog: confirmDialog } = useConfirm()
  const [today, setToday] = useState<string>(() => formatDateInput())
  const cachedData = useMemo(() => loadCachedData(), [])
  const [activeTab, setActiveTab] = useState<TabKey>(() => readInitialTab())
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateInput())
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(cachedData.dailyLogs)
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>(cachedData.workoutLogs)
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>(cachedData.workoutTemplates)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(`builtin-${getDayKey(formatDateInput())}`)
  const [syncState, setSyncState] = useState<SyncState>('loading')
  const [syncMessage, setSyncMessage] = useState('正在连接服务器数据文件...')
  const [savePending, setSavePending] = useState(false)
  const [slowSave, setSlowSave] = useState(false)
  const [noticeMessage, setNoticeMessage] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [showOnlyUnfinishedExercises, setShowOnlyUnfinishedExercises] = useState(false)
  const [showAllPerformanceLines, setShowAllPerformanceLines] = useState(false)
  const [trendDays, setTrendDays] = useState<7 | 14 | 30 | 90>(30)
  const [weeklyAnchorDate, setWeeklyAnchorDate] = useState<string>(() => formatDateInput())
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const saveVersionRef = useRef(0)
  const localEditsRef = useRef(false)
  const pendingDataRef = useRef<AppData | null>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const [initialLoaded, setInitialLoaded] = useState(false)

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
  const restDay = selectedLog.trained === false
  const workoutSummary = useMemo(() => summarizeWorkout(selectedWorkout), [selectedWorkout])
  const templateOptions = useMemo(
    () => [...builtinTemplateOptions(), ...workoutTemplates.filter((t) => !t.isBuiltin).map(customTemplateToOption)],
    [workoutTemplates],
  )
  const selectedTemplate = useMemo(
    () => templateOptions.find((template) => template.id === selectedTemplateId) ?? templateOptions[0],
    [templateOptions, selectedTemplateId],
  )
  const dashboardStats = useMemo(() => calculateDashboardStats(dailyLogs, today), [dailyLogs, today])
  const trendData = useMemo(
    () => (activeTab === 'dashboard' ? buildTrendData(dailyLogs, today, trendDays) : ([] as TrendPoint[])),
    [dailyLogs, today, trendDays, activeTab],
  )
  const trainingPerformanceData = useMemo(
    () => (activeTab === 'dashboard' ? buildTrainingPerformanceData(workoutLogs, today, Math.max(60, trendDays)) : ([] as TrainingPerformancePoint[])),
    [workoutLogs, today, trendDays, activeTab],
  )
  const weeklySummary = useMemo(
    () => (activeTab === 'weekly' ? createWeeklySummary(dailyLogs, weeklyAnchorDate) : ({} as WeeklySummary)),
    [dailyLogs, weeklyAnchorDate, activeTab],
  )
  const dailyRecommendations = useMemo(
    () => (activeTab === 'today' ? getDailyRecommendations(todayLog, dailyLogs, today) : ([] as AdjustmentRecommendation[])),
    [todayLog, dailyLogs, today, activeTab],
  )
  const twoWeekAdjustment = useMemo(() => getTwoWeekAdjustment(dailyLogs, today), [dailyLogs, today])
  const weekendRisk = useMemo(() => getWeekendRiskRecommendation(dailyLogs, today), [dailyLogs, today])
  const todayCalorieTarget = target.calories ?? target.calorieRange?.[1]
  const currentWeekLogs = useMemo(() => logsForWeek(dailyLogs, today), [dailyLogs, today])
  const hasWeeklyCalorieLogs = useMemo(
    () => currentWeekLogs.some((log) => log.calories !== undefined),
    [currentWeekLogs],
  )
  const weeklyConclusionCard = useMemo(
    () => weeklyConclusion(weeklySummary, twoWeekAdjustment.title),
    [weeklySummary, twoWeekAdjustment.title],
  )
  const visibleWorkoutExercises = useMemo(
    () =>
      selectedWorkout?.exercises
        .map((exercise, exerciseIndex) => ({ exercise, exerciseIndex }))
        .filter(({ exercise }) => !showOnlyUnfinishedExercises || !isExerciseFilled(exercise)) ?? [],
    [selectedWorkout, showOnlyUnfinishedExercises],
  )
  // 对当前所选训练每个动作预计算上次记录，避免列表渲染中重复 sortByDateDesc。
  const previousRecordsByExerciseKey = useMemo(() => {
    const map = new Map<string, PreviousExerciseRecord | undefined>()
    if (!selectedWorkout) return map
    selectedWorkout.exercises.forEach((exercise) => {
      const key = `${exercise.exerciseId}::${exercise.name.trim()}`
      if (map.has(key)) return
      map.set(key, findPreviousExerciseRecord(workoutLogs, exercise.exerciseId, exercise.name, selectedDate))
    })
    return map
  }, [selectedWorkout, workoutLogs, selectedDate])

  const applyData = useCallback((nextData: AppData) => {
    setDailyLogs(nextData.dailyLogs)
    setWorkoutLogs(nextData.workoutLogs)
    setWorkoutTemplates(nextData.workoutTemplates)
    cacheData(nextData)
  }, [])

  const persistData = useCallback(
    async (nextData: AppData) => {
      localEditsRef.current = true
      const saveVersion = saveVersionRef.current + 1
      saveVersionRef.current = saveVersion
      applyData(nextData)
      setSavePending(false)
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
          setSavePending(false)
          setSyncState('synced')
          setSyncMessage('已同步到服务器数据文件。')
        }
      } catch (error) {
        if (saveVersion === saveVersionRef.current) {
          setSyncState('offline')
          setSavePending(false)
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
      setSavePending(!immediate)
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      if (immediate) {
        flushPending()
      } else {
        setSyncMessage('已在页面记录，稍后保存到服务器数据文件。')
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
        } catch (error) {
          console.warn('页面关闭前刷新缓存失败：', error)
        }
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  useEffect(() => {
    if (!noticeMessage) return
    const timer = window.setTimeout(() => setNoticeMessage(''), 4000)
    return () => window.clearTimeout(timer)
  }, [noticeMessage])

  useEffect(() => {
    if (!copyMessage) return
    const timer = window.setTimeout(() => setCopyMessage(''), 3000)
    return () => window.clearTimeout(timer)
  }, [copyMessage])

  useEffect(() => {
    if (copyStatus === 'idle') return
    const timer = window.setTimeout(() => setCopyStatus('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [copyStatus])

  // 保存 / 加载超过 3 秒还没结束，提示用户网络较慢，避免无声卡住的体验。
  useEffect(() => {
    if (syncState !== 'saving' && syncState !== 'loading') {
      return
    }
    const timer = window.setTimeout(() => setSlowSave(true), 3000)
    return () => {
      window.clearTimeout(timer)
      setSlowSave(false)
    }
  }, [syncState])

  useEffect(() => {
    let canceled = false

    void loadAppData().then((result) => {
      if (canceled) return
      setInitialLoaded(true)
      if (localEditsRef.current) {
        // 本地已开始编辑，保留本地数据，避免服务器响应覆盖用户输入
        setSyncState((prev) => (prev === 'saving' ? prev : 'synced'))
        setSavePending(false)
        setSyncMessage('服务器已连接，但加载期间检测到本地编辑，已保留本地数据。')
        return
      }
      if (result.serverEmptyButLocalHasData) {
        setSyncState('offline')
        setSavePending(false)
        setSyncMessage(
          '检测到服务器数据为空，当前显示本地浏览器缓存。请先点击"导出 JSON"备份，再决定是否手动覆盖服务器。',
        )
        return
      }
      setDailyLogs(result.data.dailyLogs)
      setWorkoutLogs(result.data.workoutLogs)
      setWorkoutTemplates(result.data.workoutTemplates)
      if (result.source === 'server') {
        setSyncState('synced')
        setSavePending(false)
        setSyncMessage('已同步到服务器数据文件。')
      } else {
        setSyncState('offline')
        setSavePending(false)
        setSyncMessage('服务器连接失败，当前使用浏览器缓存；恢复连接后请再次保存。')
      }
    })

    return () => {
      canceled = true
    }
  }, [])

  function changeTab(tabKey: TabKey) {
    setActiveTab(tabKey)
    // 跨 tab 切换重置滚动位置，避免上一个 tab 滚到很远的状态残留。
    if (typeof window !== 'undefined' && tabKey !== activeTab) {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
    try {
      window.sessionStorage.setItem(ACTIVE_TAB_KEY, tabKey)
    } catch (error) {
      console.warn('保存激活标签失败（sessionStorage 不可用），下次刷新会回到默认页：', error)
    }
  }

  function openTodayRecord() {
    setSelectedDate(today)
    changeTab('daily')
  }

  function openTodayWorkout() {
    setSelectedDate(today)
    changeTab('workout')
  }

  async function retrySync() {
    setSyncState('saving')
    setSavePending(false)
    setSyncMessage('正在重新同步...')
    flushPending()
    try {
      const saved = await saveAppData({ dailyLogs, workoutLogs, workoutTemplates })
      applyData(saved)
      setSyncState('synced')
      setSavePending(false)
      setSyncMessage('已同步到服务器数据文件。')
    } catch (error) {
      setSyncState('offline')
      setSavePending(false)
      const message =
        error instanceof Error && error.message
          ? `${error.message}（已先保存在浏览器缓存）`
          : '服务器仍然无法保存，请稍后再试。'
      setSyncMessage(message)
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
    schedulePersist({ dailyLogs: nextLogs, workoutLogs, workoutTemplates })
  }

  function quickDailyAction(patch: Partial<DailyLog>) {
    const nextLogs = upsertByDate(dailyLogs, selectedDate, patch)
    schedulePersist({ dailyLogs: nextLogs, workoutLogs, workoutTemplates }, true)
  }

  function updateWorkoutLog(nextLog: WorkoutLog, immediate = false) {
    const nextLogs = upsertByDate(workoutLogs, nextLog.date, nextLog)
    schedulePersist({ dailyLogs, workoutLogs: nextLogs, workoutTemplates }, immediate)
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

  async function replaceWorkoutFromTemplate(template: WorkoutTemplateOption | undefined) {
    if (!template) return
    if (template.exercises.length === 0) {
      setNoticeMessage('这是休息日模板，没有训练动作可填入。如需自由训练，请点"空白训练"。')
      return
    }
    if (hasWorkoutContent(selectedWorkout)) {
      const ok = await confirm({
        title: '覆盖当天训练？',
        message: '当天已有训练记录，切换计划会覆盖当前动作和组数据。',
        confirmLabel: '覆盖',
        tone: 'danger',
      })
      if (!ok) return
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

  async function deleteExerciseFromWorkout(exerciseIndex: number) {
    const base = currentWorkoutOrBlank()
    const ok = await confirm({
      title: '删除当天动作？',
      message: '该动作的所有组将一并删除。模板不受影响。',
      confirmLabel: '删除',
      tone: 'danger',
    })
    if (!ok) return
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

  async function rebuildSetsFromTarget(exerciseIndex: number) {
    const base = currentWorkoutOrBlank()
    const exercise = base.exercises[exerciseIndex]
    if (!exercise) return
    const ok = await confirm({
      title: '按目标重建组？',
      message: '将清空当前动作每组的重量、次数和 RIR，按目标组数重新生成空白组。',
      confirmLabel: '重建',
      tone: 'danger',
    })
    if (!ok) return
    const setCount = estimateSetCount(exercise.target)
    const exercises = base.exercises.map((item, index) =>
      index === exerciseIndex
        ? {
            ...item,
            sets: Array.from({ length: setCount }, () => ({})),
          }
        : item,
    )
    updateWorkoutLog({ ...base, exercises }, true)
  }

  function fillEmptySetsFromLast(exerciseIndex: number) {
    const base = currentWorkoutOrBlank()
    const exercise = base.exercises[exerciseIndex]
    if (!exercise) return
    const lastFilled = [...exercise.sets].reverse().find(
      (set) => set.weight !== undefined || set.reps !== undefined || set.rir !== undefined,
    )
    if (!lastFilled) return
    const exercises = base.exercises.map((ex, i) => {
      if (i !== exerciseIndex) return ex
      return {
        ...ex,
        sets: ex.sets.map((set) => {
          const isEmpty = set.weight === undefined && set.reps === undefined && set.rir === undefined
          return isEmpty ? { ...lastFilled } : set
        }),
      }
    })
    updateWorkoutLog({ ...base, exercises }, true)
  }

  function applyPreviousSetsByIndex(exerciseIndex: number) {
    const base = currentWorkoutOrBlank()
    const exercise = base.exercises[exerciseIndex]
    if (!exercise) return
    // 找上一次同动作的完整组数据
    const sortedLogs = [...workoutLogs]
      .filter((log) => log.date < selectedDate)
      .sort((a, b) => b.date.localeCompare(a.date))
    let previousSets: ExerciseSetLog[] | undefined
    for (const log of sortedLogs) {
      const match = log.exercises.find(
        (e) => e.exerciseId === exercise.exerciseId || e.name.trim() === exercise.name.trim(),
      )
      if (match && match.sets.some((s) => s.weight !== undefined || s.reps !== undefined || s.rir !== undefined)) {
        previousSets = match.sets
        break
      }
    }
    if (!previousSets) return
    const exercises = base.exercises.map((ex, i) => {
      if (i !== exerciseIndex) return ex
      return {
        ...ex,
        sets: ex.sets.map((set, setIndex) => {
          const isEmpty = set.weight === undefined && set.reps === undefined && set.rir === undefined
          const prev = previousSets?.[setIndex]
          if (isEmpty && prev && (prev.weight !== undefined || prev.reps !== undefined || prev.rir !== undefined)) {
            return { ...prev }
          }
          return set
        }),
      }
    })
    updateWorkoutLog({ ...base, exercises }, true)
  }

  function persistTemplates(nextTemplates: WorkoutTemplate[], immediate = false) {
    const allTemplates = [...getBuiltinTemplates(), ...nextTemplates.filter((t) => !t.isBuiltin)]
    schedulePersist({ dailyLogs, workoutLogs, workoutTemplates: allTemplates }, immediate)
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
      isBuiltin: false,
    }
    const nextTemplates = [...workoutTemplates.filter((t) => !t.isBuiltin), nextTemplate]
    setWorkoutTemplates([...getBuiltinTemplates(), ...nextTemplates])
    persistTemplates(nextTemplates, true)
  }

  function updateTemplate(templateId: string, patch: Partial<WorkoutTemplate>) {
    const target = workoutTemplates.find((template) => template.id === templateId)
    if (!target || target.isBuiltin) return
    const now = new Date().toISOString()
    const nextTemplates = workoutTemplates.map((template) => {
      if (template.id === templateId) {
        return {
          ...template,
          ...patch,
          name: patch.name !== undefined && !patch.name.trim() ? template.name : patch.name ?? template.name,
          updatedAt: now,
        }
      }
      return template
    })
    setWorkoutTemplates(nextTemplates)
    persistTemplates(nextTemplates)
  }

  function updateTemplateExercise(templateId: string, exerciseIndex: number, patch: Partial<ExercisePlan>) {
    const target = workoutTemplates.find((template) => template.id === templateId)
    if (!target || target.isBuiltin) return
    const nextTemplates = workoutTemplates.map((template) => {
      if (template.id !== templateId) return template
      return {
        ...template,
        exercises: template.exercises.map((exercise, index) => (index === exerciseIndex ? { ...exercise, ...patch } : exercise)),
        updatedAt: new Date().toISOString(),
      }
    })
    setWorkoutTemplates(nextTemplates)
    persistTemplates(nextTemplates)
  }

  function addTemplateExercise(templateId: string) {
    const target = workoutTemplates.find((template) => template.id === templateId)
    if (!target || target.isBuiltin) return
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
    setWorkoutTemplates(nextTemplates)
    persistTemplates(nextTemplates, true)
  }

  async function deleteTemplateExercise(templateId: string, exerciseIndex: number) {
    const target = workoutTemplates.find((template) => template.id === templateId)
    if (!target || target.isBuiltin) return
    const ok = await confirm({
      title: '删除模板动作？',
      message: '只删除模板里的这个动作；已有训练记录不受影响。',
      confirmLabel: '删除',
      tone: 'danger',
    })
    if (!ok) return
    const nextTemplates = workoutTemplates.map((template) => {
      if (template.id !== templateId || template.exercises.length <= 1) return template
      return {
        ...template,
        exercises: template.exercises.filter((_, index) => index !== exerciseIndex),
        updatedAt: new Date().toISOString(),
      }
    })
    setWorkoutTemplates(nextTemplates)
    persistTemplates(nextTemplates, true)
  }

  async function deleteTemplate(templateId: string) {
    const target = workoutTemplates.find((template) => template.id === templateId)
    if (!target || target.isBuiltin) return
    const ok = await confirm({
      title: '删除训练模板？',
      message: '此操作仅删除模板，历史训练记录会保留。',
      confirmLabel: '删除',
      tone: 'danger',
    })
    if (!ok) return
    const nextTemplates = workoutTemplates.filter((template) => template.id !== templateId)
    setWorkoutTemplates(nextTemplates)
    persistTemplates(nextTemplates, true)
  }

  function saveCurrentWorkoutAsTemplate() {
    if (!selectedWorkout || selectedWorkout.exercises.length === 0) {
      setNoticeMessage('当前没有可保存的训练动作。')
      return
    }
    const nextTemplates = [...workoutTemplates, newTemplateFromWorkout(selectedWorkout)]
    setWorkoutTemplates(nextTemplates)
    persistTemplates(nextTemplates, true)
  }

  function exportData() {
    downloadBackup(createBackup(dailyLogs, workoutLogs, workoutTemplates))
  }

  const [copyPreviewText, setCopyPreviewText] = useState<string | null>(null)

  function buildCopyTextForDate(date: string) {
    const dateKey = getDayKey(date)
    return buildDailyCopyText({
      date,
      dayName: dayNames[dateKey],
      log: dailyLogs.find((log) => log.date === date),
      workout: workoutLogs.find((workout) => workout.date === date),
    })
  }

  async function writeToClipboard(text: string): Promise<boolean> {
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
      return true
    } catch (error) {
      console.warn('写入剪贴板失败：', error)
      return false
    }
  }

  async function copyTodayData() {
    const text = buildCopyTextForDate(today)
    const ok = await writeToClipboard(text)
    if (ok) {
      setCopyMessage('已复制今天的数据。')
      setCopyStatus('success')
    } else {
      setCopyMessage('复制失败，请检查浏览器剪贴板权限。')
      setCopyStatus('error')
    }
  }

  async function copySelectedDateData() {
    const text = buildCopyTextForDate(selectedDate)
    const ok = await writeToClipboard(text)
    if (ok) {
      setCopyMessage(`已复制 ${selectedDate} 的数据。`)
      setCopyStatus('success')
    } else {
      setCopyMessage('复制失败，请检查浏览器剪贴板权限。')
      setCopyStatus('error')
    }
  }

  function previewTodayData() {
    setCopyPreviewText(buildCopyTextForDate(today))
  }

  async function confirmCopyFromPreview() {
    if (!copyPreviewText) return
    const ok = await writeToClipboard(copyPreviewText)
    setCopyPreviewText(null)
    if (ok) {
      setCopyMessage('已复制今天的数据。')
      setCopyStatus('success')
    } else {
      setCopyMessage('复制失败，请检查浏览器剪贴板权限。')
      setCopyStatus('error')
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50 sm:text-3xl">减脂增肌追踪</h1>
              <div
                className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  syncState === 'synced'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200'
                    : syncState === 'saving' || syncState === 'loading'
                      ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-600/40 dark:bg-amber-900/30 dark:text-amber-100'
                      : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-600/40 dark:bg-rose-900/30 dark:text-rose-100'
                }`}
              >
                {syncState === 'synced' ? '已同步' : syncState === 'saving' ? '保存中' : syncState === 'loading' ? '连接中' : '服务器连接失败'}
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <ThemeToggle preference={colorPreference} resolved={resolvedColorScheme} onCycle={cycleColorScheme} />
              <Button
                className={`col-span-2 sm:col-span-1 transition ${
                  copyStatus === 'success'
                    ? 'bg-emerald-700 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-600'
                    : copyStatus === 'error'
                      ? 'bg-rose-600 hover:bg-rose-600 dark:bg-rose-500 dark:hover:bg-rose-500'
                      : ''
                }`}
                onClick={() => void copyTodayData()}
                aria-live="polite"
              >
                {copyStatus === 'success' ? '✓ 已复制' : copyStatus === 'error' ? '✗ 复制失败' : '复制今天'}
              </Button>
              <Button className="w-full sm:w-auto" variant="secondary" onClick={previewTodayData}>
                预览
              </Button>
              <Button className="w-full sm:w-auto" variant="secondary" onClick={exportData}>
                导出 JSON
              </Button>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{syncMessage}</p>
          {slowSave ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">网络较慢，仍在尝试...本地缓存已先保存。</p>
          ) : null}
          {syncState === 'offline' ? (
            <div className="mt-2">
              <Button variant="secondary" className="px-3" onClick={() => void retrySync()}>
                重试同步
              </Button>
            </div>
          ) : null}
          {noticeMessage ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{noticeMessage}</p> : null}
          {copyMessage ? <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">{copyMessage}</p> : null}
        </header>

        <nav className="sticky top-0 z-10 mb-4 overflow-x-auto border-y border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/95 py-2 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => changeTab(tab.key)}
                className={`h-10 rounded-md px-4 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? 'bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950'
                    : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {syncState === 'loading' && dailyLogs.length === 0 && workoutLogs.length === 0 && !initialLoaded ? (
          <div className="grid gap-4">
            <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="h-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="mt-4 h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">正在连接服务器数据文件…</p>
          </div>
        ) : (
          <>
        {activeTab === 'today' ? (
          <TodayTab
            today={today}
            todayKey={todayKey}
            target={target}
            plan={plan}
            todayLog={todayLog}
            todayWorkout={todayWorkout}
            dashboardStats={dashboardStats}
            dailyRecommendations={dailyRecommendations}
            weekendRisk={weekendRisk}
            hasWeeklyCalorieLogs={hasWeeklyCalorieLogs}
            weeklyCalorieTarget={weeklyCalorieTarget}
            todayCalorieTarget={todayCalorieTarget}
            signedRemaining={signedRemaining}
            remainingTone={remainingTone}
            onRecordToday={openTodayRecord}
            onStartWorkout={openTodayWorkout}
          />
        ) : null}

        {activeTab === 'daily' ? (
          <DailyRecordTab
            selectedDate={selectedDate}
            today={today}
            selectedLog={selectedLog}
            selectedTarget={selectedTarget}
            dailyLogs={dailyLogs}
            workoutLogs={workoutLogs}
            syncState={syncState}
            savePending={savePending}
            onDateChange={handleDateChange}
            onUpdateDailyLog={updateDailyLog}
            onQuickAction={quickDailyAction}
            onCopySelectedDate={() => void copySelectedDateData()}
          />
        ) : null}

        {activeTab === 'workout' ? (
          <WorkoutTab
            selectedDate={selectedDate}
            today={today}
            selectedWorkout={selectedWorkout}
            restDay={restDay}
            selectedTemplate={selectedTemplate}
            selectedTemplateId={selectedTemplateId}
            templateOptions={templateOptions}
            workoutSummary={workoutSummary}
            visibleWorkoutExercises={visibleWorkoutExercises}
            previousRecordsByExerciseKey={previousRecordsByExerciseKey}
            showOnlyUnfinishedExercises={showOnlyUnfinishedExercises}
            workoutTemplates={workoutTemplates}
            syncState={syncState}
            onDateChange={handleDateChange}
            onTemplateChange={setSelectedTemplateId}
            onApplyTemplate={(template) => void replaceWorkoutFromTemplate(template)}
            onApplyRecommended={() => void replaceWorkoutFromTemplate(templateOptions.find((template) => template.id === `builtin-${getDayKey(selectedDate)}`))}
            onToggleShowUnfinished={() => setShowOnlyUnfinishedExercises((value) => !value)}
            onUpdateWorkout={updateWorkoutLog}
            onUpdateExercise={updateExercise}
            onUpdateSet={updateExerciseSet}
            onAddSet={addSetToExercise}
            onDeleteLastSet={deleteLastSetFromExercise}
            onRebuildSets={rebuildSetsFromTarget}
            onDeleteExercise={deleteExerciseFromWorkout}
            onAddExercise={addExerciseToWorkout}
            onFillEmptySets={fillEmptySetsFromLast}
            onApplyPreviousByIndex={applyPreviousSetsByIndex}
            onSaveAsTemplate={saveCurrentWorkoutAsTemplate}
            onCreateTemplate={createCustomTemplate}
            onUpdateTemplate={updateTemplate}
            onUpdateTemplateExercise={updateTemplateExercise}
            onAddTemplateExercise={addTemplateExercise}
            onDeleteTemplateExercise={deleteTemplateExercise}
            onDeleteTemplate={deleteTemplate}
          />
        ) : null}

        {activeTab === 'dashboard' ? (
          <Suspense fallback={<div className="animate-pulse rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-700" /></div>}>
          <DashboardTab
            dashboardStats={dashboardStats}
            trendData={trendData}
            trainingPerformanceData={trainingPerformanceData}
            trendDays={trendDays}
            showAllPerformanceLines={showAllPerformanceLines}
            twoWeekAdjustment={twoWeekAdjustment}
            weekendRisk={weekendRisk}
            onTrendDaysChange={setTrendDays}
            onTogglePerformanceLines={() => setShowAllPerformanceLines((value) => !value)}
          />
          </Suspense>
        ) : null}

        {activeTab === 'weekly' ? (
          <WeeklyTab
            weeklySummary={weeklySummary}
            weeklyAnchorDate={weeklyAnchorDate}
            today={today}
            twoWeekAdjustment={twoWeekAdjustment}
            weekendRisk={weekendRisk}
            weeklyConclusionCard={weeklyConclusionCard}
            dailyLogs={dailyLogs}
            onAnchorChange={setWeeklyAnchorDate}
          />
        ) : null}
      </>
      )}
      </div>
      {confirmDialog}
      {copyPreviewText !== null ? (
        <CopyPreviewDialog
          text={copyPreviewText}
          onClose={() => setCopyPreviewText(null)}
          onConfirm={() => void confirmCopyFromPreview()}
        />
      ) : null}
    </main>
  )
}

export default App
