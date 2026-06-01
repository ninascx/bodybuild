import express from 'express'
import { copyFile, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { DailyLog, ServerData, UserPlanData, UserPreference, UserProfile, WorkoutLog, WorkoutTemplate } from '../src/types'
import {
  cloneDefaultPlanToUser,
  createWorkoutTemplateShareToken,
  deleteUserData,
  getUserAppData,
  getUserExportData,
  getUserPlanData,
  getUserPreference,
  getUserProfile,
  importWorkoutTemplatesByToken,
  replaceUserAppData,
  replaceUserPlanData,
  replaceUserPreference,
  replaceUserProfile,
  replaceUserTemplates,
  upsertDailyLog,
  upsertWorkoutLog,
} from './appData'
import { createSession, currentSessionTokenHash, destroySession, getCurrentUser, hashPassword, requireAdmin, requireUser, toPublicUser, verifyPassword } from './auth'
import { configureDatabaseRuntime, prisma } from './db'
import { ensureDatabaseSchema } from './ensureDatabase'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const port = Number(process.env.PORT ?? 8787)
const bind = process.env.BODYBUILD_BIND ?? '127.0.0.1'
const dataFile = path.resolve(process.env.BODYBUILD_DATA_FILE ?? path.join(projectRoot, 'data', 'bodybuild-data.json'))
const distDir = path.join(projectRoot, 'dist')
const BACKUP_KEEP = 7
const JSON_BODY_LIMIT = process.env.BODYBUILD_JSON_LIMIT ?? '2mb'
const SQLITE_BACKUP_KEEP = Math.max(1, Number(process.env.BODYBUILD_SQLITE_BACKUP_KEEP ?? 14) || 14)
const LOGIN_WINDOW_MS = 10 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_ATTEMPT_MAX_KEYS = 1000

interface LoginAttempt {
  count: number
  firstAt: number
}

const loginAttempts = new Map<string, LoginAttempt>()

const emptyData = (): ServerData => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  dailyLogs: [],
  workoutLogs: [],
  workoutTemplates: [],
})

function validateData(value: unknown): ServerData {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid data payload')
  }

  const payload = value as Partial<ServerData>
  if (
    payload.version !== 1 ||
    !Array.isArray(payload.dailyLogs) ||
    !Array.isArray(payload.workoutLogs) ||
    (payload.workoutTemplates !== undefined && !Array.isArray(payload.workoutTemplates))
  ) {
    throw new Error('Invalid data payload')
  }

  return {
    version: 1,
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
    dailyLogs: payload.dailyLogs,
    workoutLogs: payload.workoutLogs,
    workoutTemplates: payload.workoutTemplates ?? [],
  }
}

function validateAppData(value: unknown): {
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  workoutTemplates: WorkoutTemplate[]
} {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid app data payload')
  }
  const payload = value as Partial<ServerData>
  if (
    !Array.isArray(payload.dailyLogs) ||
    !Array.isArray(payload.workoutLogs) ||
    (payload.workoutTemplates !== undefined && !Array.isArray(payload.workoutTemplates))
  ) {
    throw new Error('Invalid app data payload')
  }
  return {
    dailyLogs: payload.dailyLogs,
    workoutLogs: payload.workoutLogs,
    workoutTemplates: payload.workoutTemplates ?? [],
  }
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} is required`)
  }
  return value.trim()
}

function trustProxySetting(): boolean | string {
  const value = process.env.BODYBUILD_TRUST_PROXY
  if (!value) return 'loopback'
  if (value === 'true') return true
  if (value === 'false' || value === '0') return false
  return value
}

function loginAttemptKey(request: express.Request, username: string): string {
  return `${request.ip ?? request.socket.remoteAddress ?? 'unknown'}:${username}`
}

function cleanupLoginAttempts(now = Date.now()): void {
  for (const [key, attempt] of loginAttempts) {
    if (now - attempt.firstAt > LOGIN_WINDOW_MS) {
      loginAttempts.delete(key)
    }
  }
  while (loginAttempts.size > LOGIN_ATTEMPT_MAX_KEYS) {
    const oldestKey = loginAttempts.keys().next().value as string | undefined
    if (!oldestKey) break
    loginAttempts.delete(oldestKey)
  }
}

function isLoginLimited(key: string): boolean {
  cleanupLoginAttempts()
  const attempt = loginAttempts.get(key)
  if (!attempt) return false
  if (Date.now() - attempt.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key)
    return false
  }
  return attempt.count >= LOGIN_MAX_ATTEMPTS
}

function recordLoginFailure(key: string): void {
  const now = Date.now()
  cleanupLoginAttempts(now)
  const current = loginAttempts.get(key)
  if (!current || now - current.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAt: now })
    return
  }
  loginAttempts.set(key, { ...current, count: current.count + 1 })
}

function clearLoginFailures(key: string): void {
  loginAttempts.delete(key)
}

function sqliteFilePath(): string {
  const databaseUrl = process.env.DATABASE_URL ?? `file:${path.join(projectRoot, 'data', 'bodybuild.db').replaceAll('\\', '/')}`
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('当前仅支持 SQLite file: 数据库备份')
  }
  return path.resolve(databaseUrl.slice('file:'.length))
}

async function cleanupSqliteBackups(backupDir: string): Promise<number> {
  const entries = await readdir(backupDir)
  const backups = entries
    .filter((entry) => /^bodybuild-.+\.db$/.test(entry))
    .sort()
  while (backups.length > SQLITE_BACKUP_KEEP) {
    const name = backups.shift()
    if (name) await unlink(path.join(backupDir, name))
  }
  return backups.length
}

async function createSqliteBackup(): Promise<{ path: string; sizeBytes: number; retainedCount: number; keepCount: number }> {
  const source = sqliteFilePath()
  await stat(source)
  await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(path.dirname(source), 'backups')
  await mkdir(backupDir, { recursive: true })
  const backupPath = path.join(backupDir, `bodybuild-${stamp}.db`)
  await copyFile(source, backupPath)
  const [backupStats, retainedCount] = await Promise.all([
    stat(backupPath),
    cleanupSqliteBackups(backupDir),
  ])
  return { path: backupPath, sizeBytes: backupStats.size, retainedCount, keepCount: SQLITE_BACKUP_KEEP }
}

async function ensureDataFile() {
  await mkdir(path.dirname(dataFile), { recursive: true })
  try {
    await stat(dataFile)
  } catch {
    await writeFile(dataFile, `${JSON.stringify(emptyData(), null, 2)}\n`, 'utf8')
  }
}

async function readData(): Promise<ServerData> {
  await ensureDataFile()
  const raw = await readFile(dataFile, 'utf8')
  return validateData(JSON.parse(raw))
}

async function rotateBackup() {
  try {
    const stats = await stat(dataFile)
    if (!stats.isFile()) return
    const today = new Date().toISOString().slice(0, 10)
    const backupPath = `${dataFile}.${today}.bak.json`
    try {
      await stat(backupPath)
    } catch {
      await copyFile(dataFile, backupPath)
    }
    const dir = path.dirname(dataFile)
    const prefix = `${path.basename(dataFile)}.`
    const entries = await readdir(dir)
    const backups = entries
      .filter((entry) => entry.startsWith(prefix) && entry.endsWith('.bak.json'))
      .sort()
    while (backups.length > BACKUP_KEEP) {
      const name = backups.shift()
      if (name) {
        await unlink(path.join(dir, name))
      }
    }
  } catch (err) {
    console.warn('备份失败', err)
  }
}

async function writeData(data: ServerData): Promise<ServerData> {
  await ensureDataFile()
  await rotateBackup()
  const nextData: ServerData = {
    ...data,
    updatedAt: new Date().toISOString(),
  }
  const tempFile = `${dataFile}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tempFile, `${JSON.stringify(nextData, null, 2)}\n`, 'utf8')
  await rename(tempFile, dataFile)
  return nextData
}

const app = express()

app.set('trust proxy', trustProxySetting())
app.use('/api', (_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Pragma', 'no-cache')
  next()
})
app.use(express.json({ limit: JSON_BODY_LIMIT }))
app.use(((error, request, response, next) => {
  if (!request.path.startsWith('/api')) {
    next(error)
    return
  }

  const status = typeof error?.status === 'number' ? error.status : 400
  const type = typeof error?.type === 'string' ? error.type : ''
  if (status === 413 || type === 'entity.too.large') {
    response.status(413).json({ error: `本次提交超过服务器接收上限（${JSON_BODY_LIMIT}），请减少一次提交的数据量或联系管理员调整上限。` })
    return
  }
  if (status === 400 || type === 'entity.parse.failed') {
    response.status(400).json({ error: '请求内容不是有效的 JSON，请刷新页面后重试。' })
    return
  }
  next(error)
}) as express.ErrorRequestHandler)

app.get('/api/health', async (_request, response) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1 AS ok')
    response.json({
      ok: true,
      dataFile,
      database: { ok: true },
      uptimeSec: Math.round(process.uptime()),
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      limits: {
        jsonBody: JSON_BODY_LIMIT,
      },
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      database: {
        ok: false,
        error: error instanceof Error ? error.message : '数据库不可用',
      },
    })
  }
})

app.get('/api/data', async (_request, response) => {
  try {
    response.json(await readData())
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : 'Failed to read data' })
  }
})

app.put('/api/data', async (request, response) => {
  try {
    const data = validateData(request.body)
    const saved = await writeData(data)
    response.json(saved)
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'Failed to save data' })
  }
})

app.post('/api/auth/login', async (request, response) => {
  try {
    const username = requireString(request.body?.username ?? request.body?.email, 'username').toLowerCase()
    const password = requireString(request.body?.password, 'password')
    const attemptKey = loginAttemptKey(request, username)
    if (isLoginLimited(attemptKey)) {
      response.status(429).json({ error: '登录尝试过多，请 10 分钟后再试' })
      return
    }
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
      recordLoginFailure(attemptKey)
      response.status(401).json({ error: '昵称或密码不正确' })
      return
    }
    clearLoginFailures(attemptKey)
    await createSession(request, response, user.id)
    response.json({ user: toPublicUser(user) })
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '登录失败' })
  }
})

app.post('/api/auth/logout', async (request, response) => {
  try {
    await destroySession(request, response)
    response.json({ ok: true })
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : '退出失败' })
  }
})

app.post('/api/auth/password', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    const currentPassword = requireString(request.body?.currentPassword, 'currentPassword')
    const newPassword = requireString(request.body?.newPassword, 'newPassword')
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      response.status(400).json({ error: '当前密码不正确，请重新输入。' })
      return
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    })
    const tokenHash = currentSessionTokenHash(request)
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        ...(tokenHash ? { tokenHash: { not: tokenHash } } : {}),
      },
    })
    response.json({ ok: true, currentSessionKept: Boolean(tokenHash) })
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '修改密码失败' })
  }
})

app.get('/api/auth/me', async (request, response) => {
  try {
    const user = await getCurrentUser(request)
    response.json({ user: user ? toPublicUser(user) : null })
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : '读取登录状态失败' })
  }
})

app.get('/api/export', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    response.json(await getUserExportData(user.id))
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : '导出当前用户数据失败' })
  }
})

app.get('/api/app-data', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    response.json(await getUserAppData(user.id))
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : '读取用户数据失败' })
  }
})

app.put('/api/app-data', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    const data = validateAppData(request.body)
    response.json(await replaceUserAppData(user.id, data))
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '保存用户数据失败' })
  }
})

app.get('/api/profile', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    response.json(await getUserProfile(user.id))
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : '读取个人资料失败' })
  }
})

app.put('/api/profile', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    if (typeof request.body !== 'object' || request.body === null) throw new Error('Invalid profile payload')
    response.json(await replaceUserProfile(user.id, request.body as UserProfile))
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '保存个人资料失败' })
  }
})

app.get('/api/preferences', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    response.json(await getUserPreference(user.id))
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : '读取个人配置失败' })
  }
})

app.put('/api/preferences', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    if (typeof request.body !== 'object' || request.body === null) throw new Error('Invalid preference payload')
    response.json(await replaceUserPreference(user.id, request.body as UserPreference))
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '保存个人配置失败' })
  }
})

app.get('/api/plan-data', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    response.json(await getUserPlanData(user.id))
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : '读取计划失败' })
  }
})

app.put('/api/plan-data', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    if (typeof request.body !== 'object' || request.body === null) throw new Error('Invalid plan payload')
    response.json(await replaceUserPlanData(user.id, request.body as UserPlanData))
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '保存计划失败' })
  }
})

app.put('/api/daily-logs/:date', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    const log = request.body as Partial<DailyLog>
    if (!log || typeof log !== 'object') throw new Error('Invalid daily log payload')
    response.json(await upsertDailyLog(user.id, { ...log, date: request.params.date } as DailyLog))
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '保存每日记录失败' })
  }
})

app.put('/api/workout-logs/:date', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    const log = request.body as Partial<WorkoutLog>
    if (!log || typeof log !== 'object' || typeof log.workoutName !== 'string' || !Array.isArray(log.exercises)) {
      throw new Error('Invalid workout log payload')
    }
    response.json(await upsertWorkoutLog(user.id, { ...log, date: request.params.date } as WorkoutLog))
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '保存训练记录失败' })
  }
})

app.get('/api/workout-templates', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    const data = await getUserAppData(user.id)
    response.json(data.workoutTemplates)
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : '读取训练模板失败' })
  }
})

app.put('/api/workout-templates', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    if (!Array.isArray(request.body)) throw new Error('Invalid workout templates payload')
    response.json(await replaceUserTemplates(user.id, request.body as WorkoutTemplate[]))
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '保存训练模板失败' })
  }
})

app.post('/api/workout-template-token/export', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    const templates = Array.isArray(request.body?.workoutTemplates)
      ? (request.body.workoutTemplates as WorkoutTemplate[])
      : (await getUserAppData(user.id)).workoutTemplates
    response.json(await createWorkoutTemplateShareToken(user.id, templates))
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '导出训练模板失败' })
  }
})

app.post('/api/workout-template-token/import', async (request, response) => {
  try {
    const user = await requireUser(request, response)
    if (!user) return
    const token = requireString(request.body?.token, 'token')
    response.json(await importWorkoutTemplatesByToken(user.id, token))
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '导入训练模板失败' })
  }
})

app.get('/api/admin/users', async (request, response) => {
  try {
    const admin = await requireAdmin(request, response)
    if (!admin) return
    const users = await prisma.user.findMany({
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    response.json({ users })
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : '读取用户列表失败' })
  }
})

app.post('/api/admin/users', async (request, response) => {
  try {
    const admin = await requireAdmin(request, response)
    if (!admin) return
    const username = requireString(request.body?.username ?? request.body?.email, 'username').toLowerCase()
    const displayName =
      typeof request.body?.displayName === 'string' && request.body.displayName.trim()
        ? request.body.displayName.trim()
        : username
    const password = requireString(request.body?.password, 'password')
    const role = request.body?.role === 'admin' ? 'admin' : 'member'
    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })
    if (existingUser) {
      throw new Error('昵称已被使用，请换一个昵称。')
    }
    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        passwordHash: await hashPassword(password),
        role,
      },
    })
    await cloneDefaultPlanToUser(user.id)
    response.status(201).json({ user: toPublicUser(user) })
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '创建用户失败' })
  }
})

app.put('/api/admin/users/:userId', async (request, response) => {
  try {
    const admin = await requireAdmin(request, response)
    if (!admin) return
    const displayName = typeof request.body?.displayName === 'string' ? request.body.displayName.trim() : undefined
    const isActive = typeof request.body?.isActive === 'boolean' ? request.body.isActive : undefined
    const role = request.body?.role === 'admin' || request.body?.role === 'member' ? request.body.role : undefined
    const user = await prisma.user.update({
      where: { id: request.params.userId },
      data: {
        ...(displayName ? { displayName } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(role ? { role } : {}),
      },
    })
    response.json({ user: toPublicUser(user), isActive: user.isActive })
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '更新用户失败' })
  }
})

app.post('/api/admin/users/:userId/reset-password', async (request, response) => {
  try {
    const admin = await requireAdmin(request, response)
    if (!admin) return
    const password = requireString(request.body?.password, 'password')
    const isSelf = request.params.userId === admin.id
    if (isSelf) {
      response.status(400).json({ error: '请在当前账号区域修改自己的密码。' })
      return
    }
    await prisma.user.update({
      where: { id: request.params.userId },
      data: { passwordHash: await hashPassword(password) },
    })
    await prisma.session.deleteMany({
      where: {
        userId: request.params.userId,
      },
    })
    response.json({ ok: true })
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '重置密码失败' })
  }
})

app.get('/api/admin/users/:userId/app-data', async (request, response) => {
  try {
    const admin = await requireAdmin(request, response)
    if (!admin) return
    response.json(await getUserAppData(request.params.userId))
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : '读取用户数据失败' })
  }
})

app.get('/api/admin/users/:userId/export', async (request, response) => {
  try {
    const admin = await requireAdmin(request, response)
    if (!admin) return
    response.json(await getUserExportData(request.params.userId))
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : '导出用户数据失败' })
  }
})

app.delete('/api/admin/users/:userId/data', async (request, response) => {
  try {
    const admin = await requireAdmin(request, response)
    if (!admin) return
    await deleteUserData(request.params.userId)
    await prisma.session.deleteMany({ where: { userId: request.params.userId } })
    response.json({ ok: true })
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '删除用户数据失败' })
  }
})

app.post('/api/admin/users/:userId/clone-default-plan', async (request, response) => {
  try {
    const admin = await requireAdmin(request, response)
    if (!admin) return
    await cloneDefaultPlanToUser(request.params.userId)
    response.json({ ok: true })
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : '克隆默认计划失败' })
  }
})

app.post('/api/admin/backup', async (request, response) => {
  try {
    const admin = await requireAdmin(request, response)
    if (!admin) return
    response.json(await createSqliteBackup())
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : '创建备份失败' })
  }
})

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'API endpoint not found' })
})

app.use(
  express.static(distDir, {
    index: false,
    maxAge: '1h',
    setHeaders(response, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`) || /\.(?:png|svg|ico|webmanifest|woff2)$/.test(filePath)) {
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
    },
  }),
)
app.get(/.*/, (_request, response) => {
  response.setHeader('Cache-Control', 'no-cache')
  response.sendFile(path.join(distDir, 'index.html'))
})

await configureDatabaseRuntime()
await ensureDatabaseSchema()
await ensureDataFile()

app.listen(port, bind, () => {
  console.log(`Bodybuild tracker listening on http://${bind}:${port}`)
  console.log(`Data file: ${dataFile}`)
})
