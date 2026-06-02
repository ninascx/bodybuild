import type { BackupPayload, DailyLog, ServerData, UserPlanData, UserPreference, UserProfile, WorkoutLog, WorkoutTemplate } from '../types'

const DAILY_LOGS_KEY = (userId: string) => `bodybuild:v2:${userId}:dailyLogs`
const WORKOUT_LOGS_KEY = (userId: string) => `bodybuild:v2:${userId}:workoutLogs`
const WORKOUT_TEMPLATES_KEY = (userId: string) => `bodybuild:v2:${userId}:workoutTemplates`

export type SyncState = 'loading' | 'synced' | 'saving' | 'offline'

export interface CurrentUser {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'member'
}

export interface AppData {
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  workoutTemplates: WorkoutTemplate[]
}

export interface AdminUser extends CurrentUser {
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LoadResult {
  data: AppData
  source: 'server' | 'cache'
  migrated: boolean
  serverEmptyButLocalHasData: boolean
}

export interface UserExportPayload extends BackupPayload {
  profile: UserProfile
  planData: UserPlanData
  preference: UserPreference
}

export interface ServerHealth {
  ok: boolean
  dataFile?: string
  database?: {
    ok: boolean
    error?: string
  }
  uptimeSec?: number
  memory?: {
    rssMb?: number
  }
  limits?: {
    jsonBody?: string
  }
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

function fromServerData(data: ServerData | AppData): AppData {
  return {
    dailyLogs: Array.isArray(data.dailyLogs) ? data.dailyLogs : [],
    workoutLogs: Array.isArray(data.workoutLogs) ? data.workoutLogs : [],
    workoutTemplates: Array.isArray(data.workoutTemplates) ? data.workoutTemplates : [],
  }
}

async function requestAppData(): Promise<AppData> {
  const response = await fetch('/api/app-data')
  if (!response.ok) throw new Error('服务器数据读取失败')
  return fromServerData((await response.json()) as AppData)
}

async function writeServerData(data: AppData): Promise<AppData> {
  const response = await fetch('/api/app-data', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (response.status === 413) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? '数据已超过服务器单次接收上限，请清理旧记录或联系管理员调整上限。')
  }
  if (response.status === 401) {
    throw new Error('登录已过期，请重新登录。')
  }
  if (!response.ok) throw new Error('服务器数据保存失败')
  return fromServerData((await response.json()) as AppData)
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const response = await fetch('/api/auth/me')
  if (!response.ok) throw new Error('读取登录状态失败')
  const payload = (await response.json()) as { user: CurrentUser | null }
  return payload.user
}

export async function fetchServerHealth(): Promise<ServerHealth> {
  const response = await fetch('/api/health')
  return readApiJson<ServerHealth>(response, '读取服务状态失败')
}

export async function login(username: string, password: string): Promise<CurrentUser> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
  const payload = (await response.json().catch(() => ({}))) as { user?: CurrentUser; error?: string }
  if (!response.ok || !payload.user) {
    throw new Error(payload.error ?? '登录失败')
  }
  return payload.user
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' })
}

export async function changeCurrentPassword(currentPassword: string, newPassword: string): Promise<void> {
  const response = await fetch('/api/auth/password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  await readApiJson(response, '修改密码失败')
}

async function readApiJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) {
    throw new Error(payload.error ?? fallbackMessage)
  }
  return payload
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const response = await fetch('/api/admin/users')
  const payload = await readApiJson<{ users: AdminUser[] }>(response, '读取用户列表失败')
  return payload.users
}

export async function createAdminUser(payload: {
  username: string
  displayName: string
  password: string
  role: CurrentUser['role']
}): Promise<void> {
  const response = await fetch('/api/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  await readApiJson(response, '创建用户失败')
}

export async function updateAdminUser(
  userId: string,
  patch: Partial<Pick<AdminUser, 'displayName' | 'isActive' | 'role'>>,
): Promise<void> {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })
  await readApiJson(response, '更新用户失败')
}

export async function resetAdminUserPassword(userId: string, password: string): Promise<void> {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  })
  await readApiJson(response, '重置密码失败')
}

export async function fetchAdminUserAppData(userId: string): Promise<AppData> {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/app-data`)
  return fromServerData(await readApiJson<AppData>(response, '读取用户数据失败'))
}

export async function exportAdminUserData(userId: string): Promise<UserExportPayload> {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/export`)
  return readApiJson<UserExportPayload>(response, '导出用户数据失败')
}

export async function exportCurrentUserData(): Promise<UserExportPayload> {
  const response = await fetch('/api/export')
  return readApiJson<UserExportPayload>(response, '导出当前用户数据失败')
}

export async function deleteAdminUserData(userId: string): Promise<void> {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/data`, {
    method: 'DELETE',
  })
  await readApiJson(response, '删除用户数据失败')
}

export async function cloneAdminDefaultPlan(userId: string): Promise<void> {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/clone-default-plan`, {
    method: 'POST',
  })
  await readApiJson(response, '复制默认计划失败')
}

export async function createAdminSqliteBackup(): Promise<{
  path: string
  sizeBytes?: number
  retainedCount?: number
  keepCount?: number
}> {
  const response = await fetch('/api/admin/backup', {
    method: 'POST',
  })
  return readApiJson(response, '创建备份失败')
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const response = await fetch('/api/profile')
  return readApiJson<UserProfile>(response, '读取个人资料失败')
}

export async function fetchUserPreference(): Promise<UserPreference> {
  const response = await fetch('/api/preferences')
  return readApiJson<UserPreference>(response, '读取个人配置失败')
}

export async function saveUserPreference(preference: UserPreference): Promise<UserPreference> {
  const response = await fetch('/api/preferences', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preference),
  })
  return readApiJson<UserPreference>(response, '保存个人配置失败')
}

export async function saveUserProfile(profile: UserProfile): Promise<UserProfile> {
  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profile),
  })
  return readApiJson<UserProfile>(response, '保存个人资料失败')
}

export async function fetchUserPlanData(): Promise<UserPlanData> {
  const response = await fetch('/api/plan-data')
  return readApiJson<UserPlanData>(response, '读取计划失败')
}

export async function saveUserPlanData(planData: UserPlanData): Promise<UserPlanData> {
  const response = await fetch('/api/plan-data', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(planData),
  })
  return readApiJson<UserPlanData>(response, '保存计划失败')
}

export async function exportWorkoutTemplateToken(
  workoutTemplates: WorkoutTemplate[],
): Promise<{ token: string; count: number }> {
  const response = await fetch('/api/workout-template-token/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workoutTemplates: workoutTemplates.filter((template) => !template.isBuiltin) }),
  })
  return readApiJson(response, '导出训练模板失败')
}

export async function importWorkoutTemplateToken(
  token: string,
): Promise<{ workoutTemplates: WorkoutTemplate[]; importedCount: number }> {
  const response = await fetch('/api/workout-template-token/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  })
  const payload = await readApiJson<{ workoutTemplates: WorkoutTemplate[]; importedCount: number }>(
    response,
    '导入训练模板失败',
  )
  return {
    workoutTemplates: Array.isArray(payload.workoutTemplates) ? payload.workoutTemplates : [],
    importedCount: payload.importedCount,
  }
}

export function emptyAppData(): AppData {
  return {
    dailyLogs: [],
    workoutLogs: [],
    workoutTemplates: [],
  }
}

export function loadCachedData(userId: string): AppData {
  return {
    dailyLogs: readJson<DailyLog[]>(DAILY_LOGS_KEY(userId), []),
    workoutLogs: readJson<WorkoutLog[]>(WORKOUT_LOGS_KEY(userId), []),
    workoutTemplates: readJson<WorkoutTemplate[]>(WORKOUT_TEMPLATES_KEY(userId), []),
  }
}

export function loadAllCachedData(): AppData {
  const merged = emptyAppData()
  try {
    const userIds = new Set<string>()
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      const match = key?.match(/^bodybuild:v2:(.+):(dailyLogs|workoutLogs|workoutTemplates)$/)
      if (match?.[1]) userIds.add(match[1])
    }
    for (const userId of userIds) {
      const cached = loadCachedData(userId)
      merged.dailyLogs.push(...cached.dailyLogs)
      merged.workoutLogs.push(...cached.workoutLogs)
      merged.workoutTemplates.push(...cached.workoutTemplates)
    }
  } catch (error) {
    console.warn('读取全部本地缓存失败：', error)
  }
  return merged
}

export function cacheData(userId: string, data: AppData): void {
  writeJson(DAILY_LOGS_KEY(userId), data.dailyLogs)
  writeJson(WORKOUT_LOGS_KEY(userId), data.workoutLogs)
  writeJson(WORKOUT_TEMPLATES_KEY(userId), data.workoutTemplates)
}

export async function loadAppData(userId: string): Promise<LoadResult> {
  const cached = loadCachedData(userId)

  try {
    const serverData = await requestAppData()
    if (!hasData(serverData) && hasData(cached)) {
      return {
        data: cached,
        source: 'cache',
        migrated: false,
        serverEmptyButLocalHasData: true,
      }
    }
    cacheData(userId, serverData)
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

export async function saveAppData(userId: string, data: AppData): Promise<AppData> {
  cacheData(userId, data)
  const saved = await writeServerData(data)
  cacheData(userId, saved)
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
  link.download = `liftlog-backup-${stamp}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function sanitizeFilenamePrefix(filenamePrefix: string): string {
  return filenamePrefix
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'liftlog-export'
}

export function downloadJson(payload: unknown, filenamePrefix: string): void {
  const exportedAt =
    typeof payload === 'object' && payload !== null && 'exportedAt' in payload && typeof payload.exportedAt === 'string'
      ? payload.exportedAt
      : new Date().toISOString()
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${sanitizeFilenamePrefix(filenamePrefix)}-${exportedAt.replace(/[:.]/g, '-')}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function downloadText(text: string, filenamePrefix: string, exportedAt = new Date().toISOString()): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${sanitizeFilenamePrefix(filenamePrefix)}-${exportedAt.replace(/[:.]/g, '-')}.txt`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function downloadCsv(text: string, filenamePrefix: string, exportedAt = new Date().toISOString()): void {
  const blob = new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${sanitizeFilenamePrefix(filenamePrefix)}-${exportedAt.replace(/[:.]/g, '-')}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
