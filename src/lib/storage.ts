import type { BackupPayload, DailyLog, ServerData, WorkoutLog, WorkoutTemplate } from '../types'

const DAILY_LOGS_KEY = 'bodybuild:v1:dailyLogs'
const WORKOUT_LOGS_KEY = 'bodybuild:v1:workoutLogs'
const WORKOUT_TEMPLATES_KEY = 'bodybuild:v1:workoutTemplates'

export type SyncState = 'loading' | 'synced' | 'saving' | 'offline'

export interface AppData {
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  workoutTemplates: WorkoutTemplate[]
}

export interface LoadResult {
  data: AppData
  source: 'server' | 'cache'
  migrated: boolean
  serverEmptyButLocalHasData: boolean
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch (error) {
    console.warn(`读取本地缓存 ${key} 失败，将使用默认值：`, error)
    return fallback
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`写入本地缓存 ${key} 失败（可能是配额已满或隐私模式）：`, error)
  }
}

function hasData(data: AppData): boolean {
  return data.dailyLogs.length > 0 || data.workoutLogs.length > 0 || data.workoutTemplates.length > 0
}

function toServerData(data: AppData): ServerData {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    dailyLogs: data.dailyLogs,
    workoutLogs: data.workoutLogs,
    workoutTemplates: data.workoutTemplates,
  }
}

function fromServerData(data: ServerData): AppData {
  return {
    dailyLogs: Array.isArray(data.dailyLogs) ? data.dailyLogs : [],
    workoutLogs: Array.isArray(data.workoutLogs) ? data.workoutLogs : [],
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
  if (response.status === 413) {
    throw new Error('数据已超过服务器单次接收上限（5MB），请清理旧记录或联系管理员调整上限。')
  }
  if (!response.ok) throw new Error('服务器数据保存失败')
  return (await response.json()) as ServerData
}

export function loadCachedData(): AppData {
  return {
    dailyLogs: readJson<DailyLog[]>(DAILY_LOGS_KEY, []),
    workoutLogs: readJson<WorkoutLog[]>(WORKOUT_LOGS_KEY, []),
    workoutTemplates: readJson<WorkoutTemplate[]>(WORKOUT_TEMPLATES_KEY, []),
  }
}

export function cacheData(data: AppData): void {
  writeJson(DAILY_LOGS_KEY, data.dailyLogs)
  writeJson(WORKOUT_LOGS_KEY, data.workoutLogs)
  writeJson(WORKOUT_TEMPLATES_KEY, data.workoutTemplates)
}

export async function loadAppData(): Promise<LoadResult> {
  const cached = loadCachedData()

  try {
    const serverData = fromServerData(await requestData())
    if (!hasData(serverData) && hasData(cached)) {
      return {
        data: cached,
        source: 'cache',
        migrated: false,
        serverEmptyButLocalHasData: true,
      }
    }
    cacheData(serverData)
    return {
      data: serverData,
      source: 'server',
      migrated: false,
      serverEmptyButLocalHasData: false,
    }
  } catch {
    return {
      data: cached,
      source: 'cache',
      migrated: false,
      serverEmptyButLocalHasData: false,
    }
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
  workoutTemplates: WorkoutTemplate[],
): BackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    dailyLogs,
    workoutLogs,
    workoutTemplates,
  }
}

export function downloadBackup(payload: BackupPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const stamp = payload.exportedAt.replace(/[:.]/g, '-')
  link.download = `bodybuild-backup-${stamp}.json`
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
    (parsed.workoutTemplates !== undefined && !Array.isArray(parsed.workoutTemplates))
  ) {
    throw new Error('备份文件格式不正确')
  }
  return {
    ...parsed,
    workoutTemplates: parsed.workoutTemplates ?? [],
  }
}
