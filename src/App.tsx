import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { dailyTargets as defaultDailyTargets, dayNames, workoutPlans as defaultWorkoutPlans } from './data/plans'
import { formatDateInput, getDayKey, isValidDateInput } from './lib/dates'
import { calculateDashboardStats, buildTrainingPerformanceData, buildTrendData, createWeeklySummary, findPreviousExerciseRecord, logsForWeek } from './lib/metrics'
import type { PreviousExerciseRecord, TrendPoint, TrainingPerformancePoint } from './lib/metrics'
import {
  buildDailyCopyText,
  builtinTemplateOptions,
  builtinTemplatesFromPlans,
  createBlankExercise,
  createWorkoutFromPlan,
  createWorkoutFromTemplate,
  customTemplateToOption,
  estimateSetCount,
  hasWorkoutContent,
  isExerciseFilled,
  isSetEmpty,
  isSetComplete,
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
  buildTodaySnapshot,
  buildTrendAlerts,
  buildWeeklyActionRecommendations,
} from './lib/statusInsights'
import type { TodaySnapshot } from './lib/statusInsights'
import { buildTodayTaskPlan, type DailyFocusKey, type TodayTaskPlan } from './lib/productFlow'
import {
  type AppData,
  type CurrentUser,
  type SyncState,
  cacheData,
  downloadCsv,
  downloadJson,
  downloadText,
  emptyAppData,
  exportCurrentUserData,
  exportWorkoutTemplateToken,
  fetchCurrentUser,
  fetchUserProfile,
  fetchUserPreference,
  fetchUserPlanData,
  importWorkoutTemplateToken,
  loadAppData,
  login,
  logout,
  saveAppData,
  saveUserPreference,
  saveUserPlanData,
  saveUserProfile,
} from './lib/storage'
import { defaultUserPreference, mergeUserPreference } from './lib/userPreferences'
import { buildExportCsvText, buildExportResultSummary, buildExportSummaryText, buildScopedExportPayload, type ExportFormat, type ExportOptions, type ExportRangePreset } from './lib/exportPayload'
import { createId } from './lib/ids'
import type { AdjustmentRecommendation, DailyLog, DayKey, ExerciseLog, ExercisePlan, ExerciseSetLog, RecommendationTone, UserPlanData, UserPreference, UserProfile, WeeklySummary, WorkoutLog, WorkoutPlan, WorkoutTemplate } from './types'
import { LoadingBlock } from './components/ui'
import { useColorScheme } from './hooks/useColorScheme'
import { useConfirm } from './components/ConfirmDialog'
import { ExportDataDialog } from './components/ExportDataDialog'
import { AppShell } from './components/layout/AppShell'
import { LoginScreen } from './components/layout/LoginScreen'
import { TodayTab } from './tabs/TodayTab'
import { DailyRecordTab } from './tabs/DailyRecordTab'
import { WorkoutTab } from './tabs/WorkoutTab'
const AnalyticsTab = lazy(() => import('./tabs/AnalyticsTab').then((mod) => ({ default: mod.AnalyticsTab })))
import { SettingsTab } from './tabs/SettingsTab'
import { AdminUsersTab } from './tabs/AdminUsersTab'
import { DailyRecordSkeleton } from './components/DailyRecordSkeleton'

type TabKey = 'today' | 'daily' | 'workout' | 'analytics' | 'settings' | 'admin'

const baseTabs: Array<{ key: TabKey; label: string }> = [
  { key: 'today', label: '今日' },
  { key: 'daily', label: '记录' },
  { key: 'workout', label: '训练' },
  { key: 'analytics', label: '复盘' },
  { key: 'settings', label: '设置' },
]
const adminTab: { key: TabKey; label: string } = { key: 'admin', label: '用户管理' }
const allTabs = [...baseTabs, adminTab]

const ACTIVE_TAB_KEY = 'bodybuild:v1:activeTab'
const LEGACY_API_CACHE_NAMES = ['api-cache']
const exerciseMetadataKeys = new Set<keyof ExerciseLog>(['name', 'notes'])
const dayKeys: DayKey[] = [0, 1, 2, 3, 4, 5, 6]

function isTabKey(value: string | null): value is TabKey {
  return allTabs.some((tab) => tab.key === value)
}

function builtinTemplateIdToDay(templateId: string): DayKey | null {
  const match = templateId.match(/^builtin-([0-6])$/)
  if (!match) return null
  const day = Number(match[1])
  return dayKeys.includes(day as DayKey) ? (day as DayKey) : null
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

function formatSyncClock(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
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

async function clearLegacyApiCaches() {
  if (!('caches' in window)) return
  const names = await window.caches.keys()
  await Promise.all(
    names
      .filter((name) => LEGACY_API_CACHE_NAMES.includes(name) || name.toLowerCase().includes('api-cache'))
      .map((name) => window.caches.delete(name)),
  )
}

function App() {
  const { preference: colorPreference, resolved: resolvedColorScheme, cycle: cycleColorScheme } = useColorScheme()
  const { confirm, dialog: confirmDialog } = useConfirm()
  const [today, setToday] = useState<string>(() => formatDateInput())
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'anonymous'>('checking')
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginPending, setLoginPending] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>(() => readInitialTab())
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateInput())
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([])
  const [dailyTargetsByDay, setDailyTargetsByDay] = useState(defaultDailyTargets)
  const [workoutPlansByDay, setWorkoutPlansByDay] = useState(defaultWorkoutPlans)
  const [userPreference, setUserPreference] = useState<UserPreference>(() => defaultUserPreference)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(`builtin-${getDayKey(formatDateInput())}`)
  const [syncState, setSyncState] = useState<SyncState>('loading')
  const [syncMessage, setSyncMessage] = useState('加载中...')
  const [saveFeedback, setSaveFeedback] = useState<{ tone: RecommendationTone; message: string } | null>(null)
  const [savePending, setSavePending] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(false)
  const [slowSave, setSlowSave] = useState(false)
  const [noticeMessage, setNoticeMessage] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportInitialRangePreset, setExportInitialRangePreset] = useState<ExportRangePreset>('last30')
  const [exportInitialOptions, setExportInitialOptions] = useState<Partial<ExportOptions> | undefined>(undefined)
  const [exportInitialOutputFormat, setExportInitialOutputFormat] = useState<ExportFormat>('summary')
  const [exportAnchorDate, setExportAnchorDate] = useState<string>(() => formatDateInput())
  const [exportPending, setExportPending] = useState(false)
  const [showOnlyUnfinishedExercises, setShowOnlyUnfinishedExercises] = useState(false)
  const [workoutImmersiveMode, setWorkoutImmersiveMode] = useState(false)
  const [dailyFocusKey, setDailyFocusKey] = useState<DailyFocusKey | undefined>()
  const [showAllPerformanceLines, setShowAllPerformanceLines] = useState(false)
  const [trendDays, setTrendDays] = useState<7 | 14 | 30 | 90>(30)
  const [weeklyAnchorDate, setWeeklyAnchorDate] = useState<string>(() => formatDateInput())
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const saveVersionRef = useRef(0)
  const planSaveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const planSaveVersionRef = useRef(0)
  const autoRetryAtRef = useRef(0)
  const localEditsRef = useRef(false)
  const pendingDataRef = useRef<AppData | null>(null)
  const pendingPlanDataRef = useRef<UserPlanData | null>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const planDebounceTimerRef = useRef<number | null>(null)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const visibleTabs = currentUser?.role === 'admin' ? allTabs : baseTabs
  const contentTab: TabKey = currentUser?.role === 'admin' || activeTab !== 'admin' ? activeTab : 'today'
  const lastSyncedLabel = formatSyncClock(lastSyncedAt)
  const userWeeklyCalorieTarget = useMemo(
    () =>
      Object.values(dailyTargetsByDay).reduce((sum, target) => {
        if (typeof target.calories === 'number') return sum + target.calories
        if (target.calorieRange) return sum + Math.round((target.calorieRange[0] + target.calorieRange[1]) / 2)
        return sum
      }, 0),
    [dailyTargetsByDay],
  )
  const currentPlanData = useMemo<UserPlanData>(
    () => ({
      dailyTargets: dailyTargetsByDay,
      workoutPlans: workoutPlansByDay,
    }),
    [dailyTargetsByDay, workoutPlansByDay],
  )
  const builtinTemplates = useMemo(
    () => builtinTemplatesFromPlans(workoutPlansByDay),
    [workoutPlansByDay],
  )

  useEffect(() => {
    void clearLegacyApiCaches().catch((error) => {
      console.warn('清理旧 API 缓存失败：', error)
    })
  }, [])

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
  const target = dailyTargetsByDay[todayKey]
  const plan = workoutPlansByDay[todayKey]
  const todayLog = useMemo(() => dailyLogs.find((log) => log.date === today), [dailyLogs, today])
  const todayWorkout = useMemo(() => workoutLogs.find((log) => log.date === today), [workoutLogs, today])
  const selectedLog = useMemo(
    () => dailyLogs.find((log) => log.date === selectedDate) ?? { date: selectedDate },
    [dailyLogs, selectedDate],
  )
  const selectedTarget = dailyTargetsByDay[getDayKey(selectedDate)]
  const selectedWorkout = useMemo(
    () => workoutLogs.find((log) => log.date === selectedDate),
    [workoutLogs, selectedDate],
  )
  const restDay = selectedLog.trained === false
  const workoutSummary = useMemo(() => summarizeWorkout(selectedWorkout), [selectedWorkout])
  const templateOptions = useMemo(
    () => [...builtinTemplateOptions(workoutPlansByDay), ...workoutTemplates.filter((t) => !t.isBuiltin).map(customTemplateToOption)],
    [workoutPlansByDay, workoutTemplates],
  )
  const selectedTemplate = useMemo(
    () => templateOptions.find((template) => template.id === selectedTemplateId) ?? templateOptions[0],
    [templateOptions, selectedTemplateId],
  )
  const dashboardStats = useMemo(
    () => calculateDashboardStats(dailyLogs, today, dailyTargetsByDay, userWeeklyCalorieTarget),
    [dailyLogs, today, dailyTargetsByDay, userWeeklyCalorieTarget],
  )
  const trendData = useMemo(
    () => (contentTab === 'analytics' ? buildTrendData(dailyLogs, today, trendDays, dailyTargetsByDay) : ([] as TrendPoint[])),
    [dailyLogs, today, trendDays, dailyTargetsByDay, contentTab],
  )
  const trainingPerformanceData = useMemo(
    () => (contentTab === 'analytics' ? buildTrainingPerformanceData(workoutLogs, today, Math.max(60, trendDays)) : ([] as TrainingPerformancePoint[])),
    [workoutLogs, today, trendDays, contentTab],
  )
  const weeklySummary = useMemo(
    () => (contentTab === 'analytics' ? createWeeklySummary(dailyLogs, weeklyAnchorDate, dailyTargetsByDay, userWeeklyCalorieTarget, userPreference) : ({} as WeeklySummary)),
    [dailyLogs, weeklyAnchorDate, dailyTargetsByDay, userWeeklyCalorieTarget, userPreference, contentTab],
  )
  const dailyRecommendations = useMemo(
    () => (contentTab === 'today' ? getDailyRecommendations(todayLog, dailyLogs, today, dailyTargetsByDay, userPreference) : ([] as AdjustmentRecommendation[])),
    [todayLog, dailyLogs, today, dailyTargetsByDay, userPreference, contentTab],
  )
  const twoWeekAdjustment = useMemo(() => getTwoWeekAdjustment(dailyLogs, today, userPreference), [dailyLogs, today, userPreference])
  const weekendRisk = useMemo(() => getWeekendRiskRecommendation(dailyLogs, today, userPreference), [dailyLogs, today, userPreference])
  const todaySnapshot = useMemo(
    () =>
      contentTab === 'today'
        ? buildTodaySnapshot({
            today,
            log: todayLog,
            workout: todayWorkout,
            target,
            logs: dailyLogs,
            dashboardStats,
            targets: dailyTargetsByDay,
            preference: userPreference,
          })
        : ({} as TodaySnapshot),
    [contentTab, today, todayLog, todayWorkout, target, dailyLogs, dashboardStats, dailyTargetsByDay, userPreference],
  )
  const todayTaskPlan = useMemo(
    () =>
      contentTab === 'today'
        ? buildTodayTaskPlan({
            log: todayLog,
            target,
            workout: todayWorkout,
            todaySnapshot,
            dashboardStats,
            preference: userPreference,
          })
        : ({} as TodayTaskPlan),
    [contentTab, todayLog, target, todayWorkout, todaySnapshot, dashboardStats, userPreference],
  )
  const trendAlerts = useMemo(
    () => (contentTab === 'today' || contentTab === 'analytics' ? buildTrendAlerts(dailyLogs, today, dailyTargetsByDay, userPreference) : ([] as AdjustmentRecommendation[])),
    [contentTab, dailyLogs, today, dailyTargetsByDay, userPreference],
  )
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
  const weeklyActionRecommendations = useMemo(
    () =>
      contentTab === 'analytics'
        ? buildWeeklyActionRecommendations(weeklySummary, dailyLogs, weeklyAnchorDate, dailyTargetsByDay, userPreference)
        : ([] as AdjustmentRecommendation[]),
    [contentTab, weeklySummary, dailyLogs, weeklyAnchorDate, dailyTargetsByDay, userPreference],
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
    if (currentUser) {
      cacheData(currentUser.id, nextData)
    }
  }, [currentUser])

  const applyPlanData = useCallback((nextPlanData: UserPlanData) => {
    setDailyTargetsByDay(nextPlanData.dailyTargets)
    setWorkoutPlansByDay(nextPlanData.workoutPlans)
  }, [])

  const persistPlanData = useCallback(
    async (nextPlanData: UserPlanData): Promise<UserPlanData> => {
      if (!currentUser) throw new Error('请先登录')
      const saveVersion = planSaveVersionRef.current + 1
      planSaveVersionRef.current = saveVersion
      applyPlanData(nextPlanData)
      setSyncState('saving')
      setSyncMessage('保存计划中...')
      setSaveFeedback({ tone: 'neutral', message: '正在保存计划...' })

      const saveTask = planSaveQueueRef.current.then(() => saveUserPlanData(nextPlanData))
      planSaveQueueRef.current = saveTask.then(
        () => undefined,
        () => undefined,
      )

      try {
        const saved = await saveTask
        if (saveVersion === planSaveVersionRef.current) {
          applyPlanData(saved)
          setSyncState('synced')
          setLastSyncedAt(new Date().toISOString())
          setAutoRetryEnabled(false)
          setSyncMessage('计划已保存')
          setSaveFeedback({ tone: 'positive', message: '计划已保存到服务器。' })
        }
        return saved
      } catch (error) {
        if (saveVersion === planSaveVersionRef.current) {
          setSyncState('offline')
          setAutoRetryEnabled(true)
          setSyncMessage(error instanceof Error ? `${error.message}（计划修改已先保留在当前页面）` : '计划保存失败，修改已先保留在当前页面。')
          setSaveFeedback({ tone: 'warning', message: '计划已先保留在当前页面，恢复连接后再同步。' })
        }
        throw error
      }
    },
    [applyPlanData, currentUser],
  )

  const schedulePlanPersist = useCallback(
    (nextPlanData: UserPlanData, immediate = false) => {
      applyPlanData(nextPlanData)
      pendingPlanDataRef.current = nextPlanData
      if (planDebounceTimerRef.current !== null) {
        window.clearTimeout(planDebounceTimerRef.current)
        planDebounceTimerRef.current = null
      }
      if (immediate) {
        pendingPlanDataRef.current = null
        void persistPlanData(nextPlanData).catch((error) => {
          console.warn('保存训练计划失败：', error)
        })
        return
      }
      planDebounceTimerRef.current = window.setTimeout(() => {
        const data = pendingPlanDataRef.current
        pendingPlanDataRef.current = null
        planDebounceTimerRef.current = null
        if (data) {
          void persistPlanData(data).catch((error) => {
            console.warn('保存训练计划失败：', error)
          })
        }
      }, 700)
    },
    [applyPlanData, persistPlanData],
  )

  const persistData = useCallback(
    async (nextData: AppData) => {
      if (!currentUser) return
      localEditsRef.current = true
      const saveVersion = saveVersionRef.current + 1
      saveVersionRef.current = saveVersion
      applyData(nextData)
      setSavePending(false)
      setSyncState('saving')
      setSyncMessage('保存中...')
      setSaveFeedback({ tone: 'neutral', message: '正在保存到服务器...' })
      const saveTask = saveQueueRef.current.then(() => saveAppData(currentUser.id, nextData))
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
          setLastSyncedAt(new Date().toISOString())
          setAutoRetryEnabled(false)
          setSyncMessage('已同步')
          setSaveFeedback({ tone: 'positive', message: '数据已保存到服务器。' })
        }
      } catch (error) {
        if (saveVersion === saveVersionRef.current) {
          setSyncState('offline')
          setSavePending(false)
          setAutoRetryEnabled(true)
          const message =
            error instanceof Error && error.message
              ? `${error.message}（已先保存在浏览器缓存）`
              : '服务器保存失败，已先保存在浏览器缓存；恢复连接后请再次保存。'
          setSyncMessage(message)
          setSaveFeedback({ tone: 'warning', message: '数据已先保存在本机，恢复连接后可重试同步。' })
        }
      }
    },
    [applyData, currentUser],
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
        setSyncMessage('已记录')
        setSaveFeedback({ tone: 'neutral', message: '已记录，正在保存...' })
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
        if (data && currentUser) {
          void saveAppData(currentUser.id, data).catch(() => {
            /* best-effort flush on unmount */
          })
        }
      }
    }
  }, [currentUser])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (debounceTimerRef.current !== null && pendingDataRef.current) {
        const data = pendingDataRef.current
        try {
          if (currentUser) {
            cacheData(currentUser.id, data)
          }
        } catch (error) {
          console.warn('页面关闭前刷新缓存失败：', error)
        }
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [currentUser])

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
    if (!saveFeedback || (saveFeedback.tone === 'neutral' && syncState === 'saving')) return
    const timer = window.setTimeout(() => setSaveFeedback(null), saveFeedback.tone === 'positive' ? 2500 : 4000)
    return () => window.clearTimeout(timer)
  }, [saveFeedback, syncState])

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

    void fetchCurrentUser()
      .then((user) => {
        if (canceled) return
        setCurrentUser(user)
        setAuthState(user ? 'authenticated' : 'anonymous')
        if (!user) {
          setDailyLogs([])
          setWorkoutLogs([])
          setWorkoutTemplates([])
          setDailyTargetsByDay(defaultDailyTargets)
          setWorkoutPlansByDay(defaultWorkoutPlans)
          setUserPreference(defaultUserPreference)
          setInitialLoaded(true)
          setSyncState('offline')
          setLastSyncedAt(null)
          setAutoRetryEnabled(false)
          setSyncMessage('请登录')
        }
      })
      .catch((error) => {
        if (canceled) return
        console.warn('读取登录状态失败：', error)
        setAuthState('anonymous')
        setInitialLoaded(true)
        setSyncState('offline')
        setLastSyncedAt(null)
        setAutoRetryEnabled(false)
        setSyncMessage('连接失败')
      })

    return () => {
      canceled = true
    }
  }, [])

  useEffect(() => {
    if (!currentUser) return
    let canceled = false
    localEditsRef.current = false
    pendingDataRef.current = null

    void Promise.resolve()
      .then(() => {
        if (canceled) return null
        setInitialLoaded(false)
        setSyncState('loading')
        setSavePending(false)
        setSyncMessage('加载中...')
        return Promise.all([
          loadAppData(currentUser.id),
          fetchUserPreference().catch((error) => {
            console.warn('读取个人配置失败，使用默认配置：', error)
            return defaultUserPreference
          }),
          fetchUserPlanData().catch((error) => {
            console.warn('读取用户计划失败，使用默认计划：', error)
            return { dailyTargets: defaultDailyTargets, workoutPlans: defaultWorkoutPlans }
          }),
        ])
      })
      .then((result) => {
      if (!result) return
      if (canceled) return
      const [appResult, preferenceResult, planResult] = result
      setUserPreference(mergeUserPreference(preferenceResult))
      setDailyTargetsByDay(planResult.dailyTargets)
      setWorkoutPlansByDay(planResult.workoutPlans)
      setInitialLoaded(true)
      if (localEditsRef.current) {
        // 本地已开始编辑，保留本地数据，避免服务器响应覆盖用户输入
        setSyncState((prev) => (prev === 'saving' ? prev : 'synced'))
        setSavePending(false)
        setSyncMessage('已连接')
        return
      }
      if (appResult.serverEmptyButLocalHasData) {
        setSyncState('offline')
        setSavePending(false)
        setAutoRetryEnabled(false)
        setSyncMessage('服务器数据为空，使用本地缓存')
        setDailyLogs(appResult.data.dailyLogs)
        setWorkoutLogs(appResult.data.workoutLogs)
        setWorkoutTemplates(appResult.data.workoutTemplates)
        return
      }
      setDailyLogs(appResult.data.dailyLogs)
      setWorkoutLogs(appResult.data.workoutLogs)
      setWorkoutTemplates(appResult.data.workoutTemplates)
      if (appResult.source === 'server') {
        setSyncState('synced')
        setLastSyncedAt(new Date().toISOString())
        setSavePending(false)
        setAutoRetryEnabled(false)
        setSyncMessage('已同步')
      } else {
        setSyncState('offline')
        setSavePending(false)
        setAutoRetryEnabled(true)
        setSyncMessage('离线模式')
      }
    })

    return () => {
      canceled = true
    }
  }, [currentUser])

  function changeTab(tabKey: TabKey) {
    if (tabKey !== 'workout') {
      setWorkoutImmersiveMode(false)
    }
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

  function openTodayRecord(focusKey?: DailyFocusKey) {
    setSelectedDate(today)
    setDailyFocusKey(focusKey)
    changeTab('daily')
  }

  function openTodayWorkout() {
    setSelectedDate(today)
    setDailyFocusKey(undefined)
    changeTab('workout')
  }

  const retrySync = useCallback(async () => {
    if (!currentUser) return
    setSyncState('saving')
    setSavePending(false)
    setSyncMessage('同步中...')
    flushPending()
    try {
      const saved = await saveAppData(currentUser.id, { dailyLogs, workoutLogs, workoutTemplates })
      applyData(saved)
      setSyncState('synced')
      setLastSyncedAt(new Date().toISOString())
      setSavePending(false)
      setAutoRetryEnabled(false)
      setSyncMessage('已同步')
    } catch (error) {
      setSyncState('offline')
      setSavePending(false)
      setAutoRetryEnabled(true)
      const message =
        error instanceof Error && error.message
          ? `${error.message}（已先保存在浏览器缓存）`
          : '服务器仍然无法保存，请稍后再试。'
      setSyncMessage(message)
    }
  }, [applyData, currentUser, dailyLogs, flushPending, workoutLogs, workoutTemplates])

  useEffect(() => {
    if (!currentUser || syncState !== 'offline' || !autoRetryEnabled) return
    const maybeRetry = () => {
      if (document.hidden || navigator.onLine === false) return
      const now = Date.now()
      if (now - autoRetryAtRef.current < 15_000) return
      autoRetryAtRef.current = now
      void retrySync()
    }
    window.addEventListener('online', maybeRetry)
    document.addEventListener('visibilitychange', maybeRetry)
    return () => {
      window.removeEventListener('online', maybeRetry)
      document.removeEventListener('visibilitychange', maybeRetry)
    }
  }, [autoRetryEnabled, currentUser, retrySync, syncState])

  function handleDateChange(nextDate: string) {
    setDailyFocusKey(undefined)
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

  const handleToggleShowUnfinished = useCallback(
    () => setShowOnlyUnfinishedExercises((value) => !value),
    [],
  )

  function syncDailyMeasurementsToProfile(patch: Partial<DailyLog>) {
    const profilePatch: Partial<UserProfile> = {}
    if (patch.morningWeightKg !== undefined) profilePatch.currentWeightKg = patch.morningWeightKg
    if (patch.waistCm !== undefined) profilePatch.waistCm = patch.waistCm
    if (patch.chestCm !== undefined) profilePatch.chestCm = patch.chestCm
    if (patch.upperArmCm !== undefined) profilePatch.upperArmCm = patch.upperArmCm
    if (patch.thighCm !== undefined) profilePatch.thighCm = patch.thighCm

    if (!currentUser || Object.keys(profilePatch).length === 0) return

    void fetchUserProfile()
      .then((profile) =>
        saveUserProfile({
          ...profile,
          ...profilePatch,
          trainingDays: profile.trainingDays ?? [],
        }),
      )
      .catch((error) => {
        console.warn('Failed to sync daily measurements to profile:', error)
      })
  }

  function updateDailyLog(patch: Partial<DailyLog>) {
    const nextLogs = upsertByDate(dailyLogs, selectedDate, patch)
    schedulePersist({ dailyLogs: nextLogs, workoutLogs, workoutTemplates })
    syncDailyMeasurementsToProfile(patch)
  }

  function quickDailyAction(patch: Partial<DailyLog>) {
    const nextLogs = upsertByDate(dailyLogs, selectedDate, patch)
    schedulePersist({ dailyLogs: nextLogs, workoutLogs, workoutTemplates }, true)
    syncDailyMeasurementsToProfile(patch)
  }

  function finishSelectedWorkout() {
    const nextLogs = upsertByDate(dailyLogs, selectedDate, { trained: true, workoutCompletion: 100 })
    const nextWorkoutLogs =
      selectedWorkout || !selectedTemplate || selectedTemplate.exercises.length === 0
        ? workoutLogs
        : upsertByDate(workoutLogs, selectedDate, createWorkoutFromTemplate(selectedDate, selectedTemplate))
    schedulePersist({ dailyLogs: nextLogs, workoutLogs: nextWorkoutLogs, workoutTemplates }, true)
  }

  function updateWorkoutLog(nextLog: WorkoutLog, immediate = false, options: { syncCompletion?: boolean } = {}) {
    const nextLogs = upsertByDate(workoutLogs, nextLog.date, nextLog)
    const shouldSyncCompletion = options.syncCompletion ?? true
    const nextDailyLogs = shouldSyncCompletion
      ? (() => {
          const summary = summarizeWorkout(nextLog)
          const currentDailyLog = dailyLogs.find((log) => log.date === nextLog.date)
          const wasMarkedComplete = (currentDailyLog?.workoutCompletion ?? 0) >= 100
          const autoSyncedCompletion =
            summary.completionPercent >= 100 && !wasMarkedComplete ? 99 : summary.completionPercent
          return upsertByDate(dailyLogs, nextLog.date, {
            trained: summary.filledSets > 0 ? true : undefined,
            workoutCompletion: autoSyncedCompletion,
          })
        })()
      : dailyLogs
    schedulePersist({ dailyLogs: nextDailyLogs, workoutLogs: nextLogs, workoutTemplates }, immediate)
  }

  function updateExercise(index: number, patch: Partial<ExerciseLog>) {
    const base = selectedWorkout ?? createWorkoutFromPlan(selectedDate, workoutPlansByDay[getDayKey(selectedDate)])
    const exercises = base.exercises.map((exercise, exerciseIndex) => (exerciseIndex === index ? { ...exercise, ...patch } : exercise))
    const onlyMetadata = (Object.keys(patch) as Array<keyof ExerciseLog>).every((key) => exerciseMetadataKeys.has(key))
    updateWorkoutLog({ ...base, exercises }, false, { syncCompletion: !onlyMetadata })
  }

  function updateExerciseSet(exerciseIndex: number, setIndex: number, patch: Partial<ExerciseSetLog>) {
    const base = selectedWorkout ?? createWorkoutFromPlan(selectedDate, workoutPlansByDay[getDayKey(selectedDate)])
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
      setNoticeMessage('这是休息日模板，没有训练动作可填入。如需自由训练，请点「空白训练」。')
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

  function moveExerciseUp(exerciseIndex: number) {
    if (exerciseIndex <= 0) return
    const base = currentWorkoutOrBlank()
    const exercises = [...base.exercises]
    ;[exercises[exerciseIndex - 1], exercises[exerciseIndex]] = [exercises[exerciseIndex], exercises[exerciseIndex - 1]]
    updateWorkoutLog({ ...base, exercises }, true, { syncCompletion: false })
  }

  function moveExerciseDown(exerciseIndex: number) {
    const base = currentWorkoutOrBlank()
    if (exerciseIndex >= base.exercises.length - 1) return
    const exercises = [...base.exercises]
    ;[exercises[exerciseIndex], exercises[exerciseIndex + 1]] = [exercises[exerciseIndex + 1], exercises[exerciseIndex]]
    updateWorkoutLog({ ...base, exercises }, true, { syncCompletion: false })
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
      isSetComplete,
    )
    if (!lastFilled) return
    const exercises = base.exercises.map((ex, i) => {
      if (i !== exerciseIndex) return ex
      return {
        ...ex,
        sets: ex.sets.map((set) => {
          return isSetEmpty(set) ? { ...lastFilled } : set
        }),
      }
    })
    updateWorkoutLog({ ...base, exercises }, true)
  }

  function persistTemplates(nextTemplates: WorkoutTemplate[], immediate = false) {
    const customTemplates = nextTemplates.filter((t) => !t.isBuiltin)
    schedulePersist({ dailyLogs, workoutLogs, workoutTemplates: customTemplates }, immediate)
  }

  function persistBuiltinTemplate(day: DayKey, nextPlan: WorkoutPlan, immediate = false) {
    const nextPlans = {
      ...workoutPlansByDay,
      [day]: nextPlan,
    }
    const nextTargets = {
      ...dailyTargetsByDay,
      [day]: {
        ...dailyTargetsByDay[day],
        workoutName: nextPlan.name,
        isTrainingDay: nextPlan.exercises.length > 0,
      },
    }
    schedulePlanPersist({ dailyTargets: nextTargets, workoutPlans: nextPlans }, immediate)
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
    setWorkoutTemplates(nextTemplates)
    persistTemplates(nextTemplates, true)
  }

  function updateTemplate(templateId: string, patch: Partial<WorkoutTemplate>) {
    const builtinDay = builtinTemplateIdToDay(templateId)
    if (builtinDay !== null) {
      const plan = workoutPlansByDay[builtinDay]
      persistBuiltinTemplate(builtinDay, {
        ...plan,
        name: patch.name ?? plan.name,
        focus: patch.focus ?? plan.focus,
        exercises: patch.exercises ?? plan.exercises,
      })
      return
    }

    const target = workoutTemplates.find((template) => template.id === templateId)
    if (!target || target.isBuiltin) return
    const now = new Date().toISOString()
    const nextTemplates = workoutTemplates.map((template) => {
      if (template.id === templateId) {
        return {
          ...template,
          ...patch,
          name: patch.name ?? template.name,
          updatedAt: now,
        }
      }
      return template
    })
    setWorkoutTemplates(nextTemplates)
    persistTemplates(nextTemplates)
  }

  function updateTemplateExercise(templateId: string, exerciseIndex: number, patch: Partial<ExercisePlan>) {
    const builtinDay = builtinTemplateIdToDay(templateId)
    if (builtinDay !== null) {
      const plan = workoutPlansByDay[builtinDay]
      if (!plan.exercises[exerciseIndex]) return
      persistBuiltinTemplate(builtinDay, {
        ...plan,
        exercises: plan.exercises.map((exercise, index) => (index === exerciseIndex ? { ...exercise, ...patch } : exercise)),
      })
      return
    }

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
    const builtinDay = builtinTemplateIdToDay(templateId)
    if (builtinDay !== null) {
      const plan = workoutPlansByDay[builtinDay]
      persistBuiltinTemplate(builtinDay, {
        ...plan,
        exercises: [
          ...plan.exercises,
          { id: createId('template-exercise'), name: '新动作', prescription: '3 组 × 8-12 次' },
        ],
      }, true)
      return
    }

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
    const builtinDay = builtinTemplateIdToDay(templateId)
    if (builtinDay !== null) {
      const plan = workoutPlansByDay[builtinDay]
      if (plan.exercises.length <= 1) return
      const ok = await confirm({
        title: '删除内置模板动作？',
        message: '会从对应星期的训练计划中删除这个动作；已有训练记录不受影响。',
        confirmLabel: '删除',
        tone: 'danger',
      })
      if (!ok) return
      persistBuiltinTemplate(builtinDay, {
        ...plan,
        exercises: plan.exercises.filter((_, index) => index !== exerciseIndex),
      }, true)
      return
    }

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

  async function exportTemplateToken() {
    return exportWorkoutTemplateToken(workoutTemplates)
  }

  async function importTemplateToken(token: string) {
    if (!currentUser) throw new Error('请先登录')
    const result = await importWorkoutTemplateToken(token)
    setWorkoutTemplates(result.workoutTemplates)
    cacheData(currentUser.id, { dailyLogs, workoutLogs, workoutTemplates: result.workoutTemplates })
    setSyncState('synced')
    setLastSyncedAt(new Date().toISOString())
    setAutoRetryEnabled(false)
    setSyncMessage(`已导入 ${result.importedCount} 个训练模板。`)
    return { importedCount: result.importedCount }
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

  async function exportData(options: ExportOptions, format: ExportFormat = 'json') {
    if (!currentUser) return
    setExportPending(true)
    setSyncMessage('生成导出文件中...')
    try {
      const payload = await exportCurrentUserData()
      const scopedPayload = buildScopedExportPayload(payload, options, exportAnchorDate)
      const scope = scopedPayload.exportScope
      const rangeLabel = scope.startDate && scope.endDate ? `${scope.startDate}-${scope.endDate}` : 'all'
      if (format === 'copySummary') {
        const ok = await writeToClipboard(buildExportSummaryText(scopedPayload))
        if (!ok) throw new Error('复制摘要失败，请检查浏览器剪贴板权限。')
      } else if (format === 'summary') {
        downloadText(buildExportSummaryText(scopedPayload), `bodybuild-summary-${currentUser.username}-${rangeLabel}`, scopedPayload.exportedAt)
      } else if (format === 'csv') {
        downloadCsv(buildExportCsvText(scopedPayload), `bodybuild-table-${currentUser.username}-${rangeLabel}`, scopedPayload.exportedAt)
      } else {
        downloadJson(scopedPayload, `bodybuild-user-${currentUser.username}-${rangeLabel}`)
      }
      setShowExportDialog(false)
      setExportInitialOptions(undefined)
      setExportInitialOutputFormat('summary')
      setSyncState('synced')
      setAutoRetryEnabled(false)
      const actionLabel = format === 'copySummary' ? '复制摘要' : format === 'summary' ? '导出摘要' : format === 'csv' ? '导出 CSV' : '导出 JSON'
      setSyncMessage(`已${actionLabel}：${buildExportResultSummary(scopedPayload, format)}。`)
    } catch (error) {
      setSyncState('offline')
      setAutoRetryEnabled(false)
      setSyncMessage(error instanceof Error ? error.message : '导出当前用户数据失败')
    } finally {
      setExportPending(false)
    }
  }

  function openExportDialog(
    rangePreset: ExportRangePreset = 'last30',
    anchorDate = selectedDate,
    initialOptions?: Partial<ExportOptions>,
    initialOutputFormat: ExportFormat = 'summary',
  ) {
    setExportInitialRangePreset(rangePreset)
    setExportInitialOptions(initialOptions)
    setExportInitialOutputFormat(initialOutputFormat)
    setExportAnchorDate(anchorDate)
    setShowExportDialog(true)
  }

  async function savePlanData(nextPlanData: UserPlanData): Promise<UserPlanData> {
    if (planDebounceTimerRef.current !== null) {
      window.clearTimeout(planDebounceTimerRef.current)
      planDebounceTimerRef.current = null
    }
    pendingPlanDataRef.current = null
    return persistPlanData(nextPlanData)
  }

  async function savePreferenceData(nextPreference: UserPreference): Promise<UserPreference> {
    if (!currentUser) throw new Error('请先登录')
    setSyncState('saving')
    setSyncMessage('保存配置中...')
    const saved = mergeUserPreference(await saveUserPreference(nextPreference))
    setUserPreference(saved)
    setSyncState('synced')
    setLastSyncedAt(new Date().toISOString())
    setAutoRetryEnabled(false)
    setSyncMessage('配置已保存')
    setSaveFeedback({ tone: 'positive', message: '配置已保存到服务器。' })
    return saved
  }

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

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginPending(true)
    setLoginError('')
    try {
      const user = await login(loginUsername, loginPassword)
      setCurrentUser(user)
      setAuthState('authenticated')
      setLoginPassword('')
      const empty = emptyAppData()
      setDailyLogs(empty.dailyLogs)
      setWorkoutLogs(empty.workoutLogs)
      setWorkoutTemplates(empty.workoutTemplates)
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '登录失败')
      setAuthState('anonymous')
    } finally {
      setLoginPending(false)
    }
  }

  async function handleLogout() {
    await logout().catch((error) => {
      console.warn('退出登录失败：', error)
    })
    setCurrentUser(null)
    setAuthState('anonymous')
    const empty = emptyAppData()
    setDailyLogs(empty.dailyLogs)
    setWorkoutLogs(empty.workoutLogs)
    setWorkoutTemplates(empty.workoutTemplates)
    setDailyTargetsByDay(defaultDailyTargets)
    setWorkoutPlansByDay(defaultWorkoutPlans)
    setUserPreference(defaultUserPreference)
    setSyncState('offline')
    setLastSyncedAt(null)
    setAutoRetryEnabled(false)
    setSyncMessage('已退出登录')
  }

  if (authState === 'checking') {
    return (
      <LoginScreen
        mode="checking"
        username={loginUsername}
        password={loginPassword}
        error={loginError}
        pending={loginPending}
        colorPreference={colorPreference}
        resolvedColorScheme={resolvedColorScheme}
        onCycleColorScheme={cycleColorScheme}
        onUsernameChange={setLoginUsername}
        onPasswordChange={setLoginPassword}
        onSubmit={(event) => void handleLogin(event)}
      />
    )
  }

  if (authState === 'anonymous') {
    return (
      <LoginScreen
        mode="anonymous"
        username={loginUsername}
        password={loginPassword}
        error={loginError}
        pending={loginPending}
        colorPreference={colorPreference}
        resolvedColorScheme={resolvedColorScheme}
        onCycleColorScheme={cycleColorScheme}
        onUsernameChange={setLoginUsername}
        onPasswordChange={setLoginPassword}
        onSubmit={(event) => void handleLogin(event)}
      />
    )
  }

  return (
    <AppShell
      tabs={visibleTabs}
      activeTab={contentTab}
      immersiveMode={contentTab === 'workout' && workoutImmersiveMode}
      currentUser={currentUser}
      colorPreference={colorPreference}
      resolvedColorScheme={resolvedColorScheme}
      syncState={syncState}
      syncMessage={syncMessage}
      lastSyncedLabel={lastSyncedLabel}
      saveFeedback={saveFeedback}
      slowSave={slowSave}
      autoRetryEnabled={autoRetryEnabled}
      noticeMessage={noticeMessage}
      copyMessage={copyMessage}
      onTabChange={changeTab}
      onCycleColorScheme={cycleColorScheme}
      onLogout={() => void handleLogout()}
      onRetrySync={() => void retrySync()}
    >

        {syncState === 'loading' && dailyLogs.length === 0 && workoutLogs.length === 0 && !initialLoaded ? (
          contentTab === 'daily' ? (
            <DailyRecordSkeleton />
          ) : (
            <div className="grid gap-4">
              <LoadingBlock title="正在连接服务器数据文件..." lines={4} />
            </div>
          )
        ) : (
          <>
        {contentTab === 'today' ? (
          <TodayTab
            today={today}
            todayKey={todayKey}
            target={target}
            plan={plan}
            todayLog={todayLog}
            dashboardStats={dashboardStats}
            todaySnapshot={todaySnapshot}
            taskPlan={todayTaskPlan}
            trendAlerts={trendAlerts}
            dailyRecommendations={dailyRecommendations}
            weekendRisk={weekendRisk}
            hasWeeklyCalorieLogs={hasWeeklyCalorieLogs}
            weeklyCalorieTarget={userWeeklyCalorieTarget}
            todayCalorieTarget={todayCalorieTarget}
            signedRemaining={signedRemaining}
            remainingTone={remainingTone}
            onRecordToday={openTodayRecord}
            onStartWorkout={openTodayWorkout}
          />
        ) : null}

        {contentTab === 'settings' && currentUser ? (
          <SettingsTab
            key={`${currentUser.id}-${initialLoaded ? 'ready' : 'loading'}`}
            currentUser={currentUser}
            preference={userPreference}
            planData={currentPlanData}
            onSavePreference={savePreferenceData}
            onSavePlan={savePlanData}
          />
        ) : null}

        {contentTab === 'daily' ? (
          <DailyRecordTab
            selectedDate={selectedDate}
            today={today}
            selectedLog={selectedLog}
            selectedTarget={selectedTarget}
            dailyLogs={dailyLogs}
            workoutLogs={workoutLogs}
            syncState={syncState}
            savePending={savePending}
            lastSyncedLabel={lastSyncedLabel}
            sleepFloorHours={userPreference.sleepFloorHours ?? defaultUserPreference.sleepFloorHours}
            fatigueThreshold={userPreference.fatigueThreshold ?? defaultUserPreference.fatigueThreshold}
            onDateChange={handleDateChange}
            onUpdateDailyLog={updateDailyLog}
            onQuickAction={quickDailyAction}
            onCopySelectedDate={() => void copySelectedDateData()}
            onExportSelectedDate={() => openExportDialog('today')}
            focusKey={dailyFocusKey}
            onFocusConsumed={() => setDailyFocusKey(undefined)}
          />
        ) : null}

        {contentTab === 'workout' ? (
          <WorkoutTab
            selectedDate={selectedDate}
            today={today}
            selectedWorkout={selectedWorkout}
            restDay={restDay}
            selectedTemplate={selectedTemplate}
            selectedTemplateId={selectedTemplateId}
            templateOptions={templateOptions}
            recommendedPlanName={workoutPlansByDay[getDayKey(selectedDate)].name}
            workoutSummary={workoutSummary}
            visibleWorkoutExercises={visibleWorkoutExercises}
            previousRecordsByExerciseKey={previousRecordsByExerciseKey}
            showOnlyUnfinishedExercises={showOnlyUnfinishedExercises}
            builtinTemplates={builtinTemplates}
            workoutTemplates={workoutTemplates}
            syncState={syncState}
            workoutMarkedComplete={(selectedLog.workoutCompletion ?? 0) >= 100}
            onDateChange={handleDateChange}
            onTemplateChange={setSelectedTemplateId}
            onApplyTemplate={(template) => void replaceWorkoutFromTemplate(template)}
            onApplyRecommended={() => void replaceWorkoutFromTemplate(templateOptions.find((template) => template.id === `builtin-${getDayKey(selectedDate)}`))}
            onToggleShowUnfinished={handleToggleShowUnfinished}
            onUpdateWorkout={updateWorkoutLog}
            onUpdateExercise={updateExercise}
            onUpdateSet={updateExerciseSet}
            onAddSet={addSetToExercise}
            onDeleteLastSet={deleteLastSetFromExercise}
            onRebuildSets={rebuildSetsFromTarget}
            onDeleteExercise={deleteExerciseFromWorkout}
            onMoveExerciseUp={moveExerciseUp}
            onMoveExerciseDown={moveExerciseDown}
            onAddExercise={addExerciseToWorkout}
            onFillEmptySets={fillEmptySetsFromLast}
            onSaveAsTemplate={saveCurrentWorkoutAsTemplate}
            onCreateTemplate={createCustomTemplate}
            onUpdateTemplate={updateTemplate}
            onUpdateTemplateExercise={updateTemplateExercise}
            onAddTemplateExercise={addTemplateExercise}
            onDeleteTemplateExercise={deleteTemplateExercise}
            onDeleteTemplate={deleteTemplate}
            onExportTemplateToken={exportTemplateToken}
            onImportTemplateToken={importTemplateToken}
            onExportSelectedWorkout={() =>
              openExportDialog('today', selectedDate, {
                includeDailyLogs: false,
                includeWorkoutLogs: true,
                includeWorkoutTemplates: false,
                includeProfile: false,
                includePlanData: false,
                includePreference: false,
                slimMode: true,
              }, 'csv')
            }
            onFinishWorkout={finishSelectedWorkout}
            onImmersiveModeChange={setWorkoutImmersiveMode}
          />
        ) : null}

        {contentTab === 'analytics' ? (
          <Suspense fallback={<LoadingBlock title="正在加载分析..." lines={2} />}>
          <AnalyticsTab
            dashboardStats={dashboardStats}
            trendData={trendData}
            trainingPerformanceData={trainingPerformanceData}
            trendDays={trendDays}
            weeklyCalorieTarget={userWeeklyCalorieTarget}
            showAllPerformanceLines={showAllPerformanceLines}
            twoWeekAdjustment={twoWeekAdjustment}
            weekendRisk={weekendRisk}
            weeklySummary={weeklySummary}
            weeklyAnchorDate={weeklyAnchorDate}
            today={today}
            weeklyConclusionCard={weeklyConclusionCard}
            trendAlerts={trendAlerts}
            weeklyActionRecommendations={weeklyActionRecommendations}
            weekendCalorieUpperKcal={userPreference.weekendCalorieUpperKcal ?? defaultUserPreference.weekendCalorieUpperKcal}
            dailyLogs={dailyLogs}
            onTrendDaysChange={setTrendDays}
            onTogglePerformanceLines={() => setShowAllPerformanceLines((value) => !value)}
            onAnchorChange={setWeeklyAnchorDate}
            onExportWeek={() => openExportDialog('thisWeek', weeklyAnchorDate)}
          />
          </Suspense>
        ) : null}

        {contentTab === 'admin' && currentUser?.role === 'admin' ? (
          <AdminUsersTab currentUser={currentUser} />
        ) : null}
      </>
      )}
      {confirmDialog}
      {showExportDialog ? (
        <ExportDataDialog
          today={exportAnchorDate}
          dailyLogs={dailyLogs}
          workoutLogs={workoutLogs}
          workoutTemplates={workoutTemplates}
          initialRangePreset={exportInitialRangePreset}
          initialOptions={exportInitialOptions}
          initialOutputFormat={exportInitialOutputFormat}
          pending={exportPending}
          onClose={() => {
            setShowExportDialog(false)
            setExportInitialOptions(undefined)
            setExportInitialOutputFormat('summary')
          }}
          onExport={(options, format) => void exportData(options, format)}
        />
      ) : null}
    </AppShell>
  )
}

export default App
