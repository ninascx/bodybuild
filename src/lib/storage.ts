import type { BackupPayload, DailyLog, ServerData, TaskChecks, WorkoutLog, WorkoutTemplate } from '../types'

const DAILY_LOGS_KEY = 'bodybuild:v1:dailyLogs'
const WORKOUT_LOGS_KEY = 'bodybuild:v1:workoutLogs'
const TASK_CHECKS_KEY = 'bodybuild:v1:taskChecks'
const WORKOUT_TEMPLATES_KEY = 'bodybuild:v1:workoutTemplates'

export type SyncState = 'loading' | 'synced' | 'saving' | 'offline'

export interface AppData {
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  taskChecks: Record<string, TaskChecks>
  workoutTemplates: WorkoutTemplate[]
}

export interface LoadResult {
  data: AppData
  source: 'server' | 'cache'
  migrated: boolean
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value))
}

function hasData(data: AppData): boolean {
  return data.dailyLogs.length > 0 || data.workoutLogs.length > 0 || Object.keys(data.taskChecks).length > 0 || data.workoutTemplates.length > 0
}

function toServerData(data: AppData): ServerData {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    ...data,
  }
}

function fromServerData(data: ServerData): AppData {
  return {
    dailyLogs: Array.isArray(data.dailyLogs) ? data.dailyLogs : [],
    workoutLogs: Array.isArray(data.workoutLogs) ? data.workoutLogs : [],
    taskChecks: data.taskChecks && typeof data.taskChecks === 'object' ? data.taskChecks : {},
    workoutTemplates: Array.isArray(data.workoutTemplates) ? data.workoutTemplates : [],
  }
}

async function requestData(): Promise<ServerData> {
  const response = await fetch('/api/data')
  if (!response.ok) throw new Error('服务器数据读取失败')
  return (await response.json()) as ServerData
}

async function writeServerData(data: AppData): Promise<ServerData> {
  const response = await fetch('/api/data', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toServerData(data)),
  })
  if (!response.ok) throw new Error('服务器数据保存失败')
  return (await response.json()) as ServerData
}

export function loadCachedData(): AppData {
  return {
    dailyLogs: readJson<DailyLog[]>(DAILY_LOGS_KEY, []),
    workoutLogs: readJson<WorkoutLog[]>(WORKOUT_LOGS_KEY, []),
    taskChecks: readJson<Record<string, TaskChecks>>(TASK_CHECKS_KEY, {}),
    workoutTemplates: readJson<WorkoutTemplate[]>(WORKOUT_TEMPLATES_KEY, []),
  }
}

export function cacheData(data: AppData): void {
  writeJson(DAILY_LOGS_KEY, data.dailyLogs)
  writeJson(WORKOUT_LOGS_KEY, data.workoutLogs)
  writeJson(TASK_CHECKS_KEY, data.taskChecks)
  writeJson(WORKOUT_TEMPLATES_KEY, data.workoutTemplates)
}

export async function loadAppData(): Promise<LoadResult> {
  const cached = loadCachedData()

  try {
    const serverData = fromServerData(await requestData())
    if (!hasData(serverData) && hasData(cached)) {
      const migrated = fromServerData(await writeServerData(cached))
      cacheData(migrated)
      return { data: migrated, source: 'server', migrated: true }
    }
    cacheData(serverData)
    return { data: serverData, source: 'server', migrated: false }
  } catch {
    return { data: cached, source: 'cache', migrated: false }
  }
}

export async function saveAppData(data: AppData): Promise<AppData> {
  cacheData(data)
  const saved = fromServerData(await writeServerData(data))
  cacheData(saved)
  return saved
}

export function createBackup(
  dailyLogs: DailyLog[],
  workoutLogs: WorkoutLog[],
  taskChecks: Record<string, TaskChecks>,
  workoutTemplates: WorkoutTemplate[],
): BackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    dailyLogs,
    workoutLogs,
    taskChecks,
    workoutTemplates,
  }
}

export function downloadBackup(payload: BackupPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `bodybuild-backup-${payload.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function parseBackup(raw: string): BackupPayload {
  const parsed = JSON.parse(raw) as BackupPayload
  if (
    parsed.version !== 1 ||
    !Array.isArray(parsed.dailyLogs) ||
    !Array.isArray(parsed.workoutLogs) ||
    typeof parsed.taskChecks !== 'object' ||
    parsed.taskChecks === null ||
    (parsed.workoutTemplates !== undefined && !Array.isArray(parsed.workoutTemplates))
  ) {
    throw new Error('备份文件格式不正确')
  }
  return {
    ...parsed,
    workoutTemplates: parsed.workoutTemplates ?? [],
  }
}
