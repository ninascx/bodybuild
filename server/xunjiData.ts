import crypto from 'node:crypto'

import { BODY_METRIC_TYPES, bodyMetricDefinition, isBodyMetricType } from '../src/lib/bodyMetrics'
import type { BodyMetricType, BodyRecord, DailyLog } from '../src/types'
import { toClientDailyLog, upsertBodyRecords } from './appData'
import { prisma } from './db'

const TRAINING_BASE_URL = 'https://trains.xunjiapp.cn'
const FOOD_BASE_URL = 'https://eatings.xunjiapp.cn'
const MAIN_BASE_URL = 'https://api.xunjiapp.cn'
const configuredRequestInterval = Number(process.env.XUNJI_DATA_REQUEST_INTERVAL_MS ?? 15_000)
const REQUEST_INTERVAL_MS = Number.isFinite(configuredRequestInterval) && configuredRequestInterval >= 0
  ? configuredRequestInterval
  : 15_000
const PREVIEW_TTL_MS = 10 * 60_000
const REQUEST_TIMEOUT_MS = 20_000

type JsonObject = Record<string, unknown>
export type XunjiConnectionKind = 'training' | 'food' | 'body'
type CredentialKind = XunjiConnectionKind
type NutritionField = 'calories' | 'protein' | 'carbs' | 'fat'

interface CacheEntry {
  value: unknown
}

interface PendingBodyMutation {
  digest: string
  payload: JsonObject
  expiresAt: number
}

interface PendingDailySync {
  userId: string
  datestr: string
  food: Partial<Record<NutritionField, number>>
  body: BodyRecord[]
  expiresAt: number
}

export interface XunjiReadResult<T = unknown> {
  res: T
  source: 'api' | 'cache'
}

export interface XunjiMutationResult<T = unknown> {
  res: T
  preview: boolean
  bodyRecords?: BodyRecord[]
  commitAvailableAt?: string
  retryAfterMs?: number
}

interface IntegrationKeyStatus {
  configured: boolean
  maskedKey?: string
  source?: 'account' | 'environment'
}

export interface XunjiDataIntegrationConfig {
  food: IntegrationKeyStatus
  body: IntegrationKeyStatus
}

export interface XunjiConnectionStatus extends IntegrationKeyStatus {
  capabilities: Array<'read' | 'write'>
  validationStatus: 'missing' | 'unverified' | 'valid'
  validatedAt?: string
}

export interface XunjiConnections {
  training: XunjiConnectionStatus
  food: XunjiConnectionStatus
  body: XunjiConnectionStatus
}

export interface XunjiSourcePreview<T> {
  status: 'ready' | 'empty' | 'unavailable' | 'error'
  changes: T[]
  message?: string
  retryAfterMs?: number
}

export interface XunjiDailySyncPreview {
  previewId: string
  datestr: string
  sources: {
    food: XunjiSourcePreview<{
      field: NutritionField
      current?: number
      incoming: number
      conflict: boolean
      defaultSelected: boolean
      unit: 'kcal' | 'g'
    }>
    body: XunjiSourcePreview<{
      type: BodyMetricType
      label: string
      unit: BodyRecord['unit']
      current?: number
      incoming: number
      conflict: boolean
      defaultSelected: boolean
    }>
  }
  /** @deprecated compatibility fields */
  foodChanges: Array<{
    field: NutritionField
    current?: number
    incoming: number
    conflict: boolean
    defaultSelected: boolean
    unit: 'kcal' | 'g'
  }>
  /** @deprecated compatibility fields */
  bodyChanges: Array<{
    type: BodyMetricType
    label: string
    unit: BodyRecord['unit']
    current?: number
    incoming: number
    conflict: boolean
    defaultSelected: boolean
  }>
}

export interface XunjiDailySyncCommitResult {
  dailyLog?: DailyLog
  bodyRecords: BodyRecord[]
  results: {
    food: { status: 'success' | 'skipped'; count: number }
    body: { status: 'success' | 'skipped'; count: number }
  }
}

export class XunjiDataError extends Error {
  status: number
  retryAfterMs?: number

  constructor(message: string, status = 400, retryAfterMs?: number) {
    super(message)
    this.name = 'XunjiDataError'
    this.status = status
    this.retryAfterMs = retryAfterMs
  }
}

const readCache = new Map<string, CacheEntry>()
const lastRequestAt = new Map<string, number>()
const pendingBodyMutations = new Map<string, PendingBodyMutation>()
const pendingDailySyncs = new Map<string, PendingDailySync>()

function asObject(value: unknown): JsonObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonObject) : null
}

function requireObject(value: unknown, label = '请求参数'): JsonObject {
  const object = asObject(value)
  if (!object) throw new XunjiDataError(`${label}格式不正确。`)
  return object
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string' || !value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const object = asObject(value)
  if (object) {
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function digest(value: unknown): string {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex')
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addUtcMonths(date: Date, months: number): Date {
  const next = new Date(date)
  next.setUTCMonth(next.getUTCMonth() + months)
  return next
}

function addUtcYears(date: Date, years: number): Date {
  const next = new Date(date)
  next.setUTCFullYear(next.getUTCFullYear() + years)
  return next
}

function validateDateRange(payload: JsonObject, limited: boolean): void {
  const startDate = payload.start_date
  const endDate = payload.end_date
  if (!isDateString(startDate) || !isDateString(endDate)) {
    throw new XunjiDataError('start_date 和 end_date 必须使用 YYYY-MM-DD 格式。')
  }
  if (startDate > endDate) throw new XunjiDataError('start_date 不能晚于 end_date。')
  if (!limited) return
  const today = new Date()
  const minDate = utcDateString(addUtcYears(today, -1))
  const maxDate = utcDateString(addUtcMonths(today, 3))
  if (startDate < minDate || endDate > maxDate) {
    throw new XunjiDataError(`饮食查询范围必须在 ${minDate} 至 ${maxDate} 之间。`)
  }
}

function validateFoodQuery(input: unknown): JsonObject {
  const payload = requireObject(input)
  validateDateRange(payload, true)
  return {
    start_date: payload.start_date,
    end_date: payload.end_date,
    include_detail: payload.include_detail !== false,
  }
}

function validateBodyQuery(input: unknown): JsonObject {
  const payload = requireObject(input)
  validateDateRange(payload, false)
  if (
    payload.types !== undefined &&
    (!Array.isArray(payload.types) || payload.types.some((type) => !isBodyMetricType(type)))
  ) {
    throw new XunjiDataError('身体数据 types 中包含不支持的类型。')
  }
  return {
    start_date: payload.start_date,
    end_date: payload.end_date,
    ...(payload.types === undefined ? {} : { types: payload.types }),
    include_latest: payload.include_latest !== false,
    include_records: payload.include_records !== false,
    limit: Math.max(1, Math.min(500, Math.trunc(asNumber(payload.limit) ?? 500))),
    offset: Math.max(0, Math.trunc(asNumber(payload.offset) ?? 0)),
  }
}

async function getStoredCredentials(userId: string) {
  return prisma.userPreference.findUnique({
    where: { userId },
    select: {
      xunjiOpenApiKey: true,
      xunjiFoodApiKey: true,
      xunjiBodyApiKey: true,
      xunjiOpenValidatedAt: true,
      xunjiFoodValidatedAt: true,
      xunjiBodyValidatedAt: true,
    },
  })
}

async function getCredential(userId: string, kind: CredentialKind): Promise<string> {
  const stored = await getStoredCredentials(userId)
  const token =
    kind === 'training'
      ? stored?.xunjiOpenApiKey ?? process.env.XUNJI_OPEN_API_KEY ?? process.env.XUNJI_API_KEY
      : kind === 'food'
      ? stored?.xunjiFoodApiKey ?? process.env.XUNJI_FOOD_API_KEY
      : stored?.xunjiBodyApiKey ?? process.env.XUNJI_BODY_API_KEY
  if (!token?.trim()) {
    throw new XunjiDataError(`未配置训记${kind === 'food' ? '饮食' : '身体'}数据 Key，请先在个人主页中设置。`, 503)
  }
  return token.trim()
}

function cacheKey(userId: string, endpoint: string, payload: JsonObject): string {
  return `${userId}:${endpoint}:${digest(payload)}`
}

function remainingRateLimitMs(userId: string, endpoint: string): number {
  const previous = lastRequestAt.get(`${userId}:${endpoint}`)
  if (!previous) return 0
  return Math.max(0, REQUEST_INTERVAL_MS - (Date.now() - previous))
}

async function enforceRateLimit(userId: string, endpoint: string, wait: boolean): Promise<void> {
  const retryAfterMs = remainingRateLimitMs(userId, endpoint)
  if (retryAfterMs <= 0) return
  if (wait) {
    await new Promise((resolve) => setTimeout(resolve, retryAfterMs))
    return
  }
  throw new XunjiDataError(`训记接口请求过于频繁，请 ${Math.ceil(retryAfterMs / 1000)} 秒后再试。`, 429, retryAfterMs)
}

function upstreamMessage(root: JsonObject | null, fallback: string): string {
  for (const key of ['message', 'msg', 'error']) {
    const value = root?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return fallback
}

function statusForUpstreamError(status: number, message: string): number {
  if (message.includes('too frequent')) return 429
  if (message.includes('apikey missing') || message.includes('apikey invalid')) return 401
  if (message.includes('仅VIP可用') || message.toLowerCase().includes('vip')) return 403
  return status >= 400 && status < 600 ? status : 502
}

function friendlyUpstreamMessage(
  message: string,
  kind: XunjiConnectionKind,
  retryAfterMs?: number,
): string {
  const normalized = message.toLowerCase()
  const label = kind === 'training' ? '训练' : kind === 'food' ? '饮食' : '身体'
  if (normalized.includes('apikey missing')) return `${label}数据 Key 未配置，请前往“设置 > 训记连接”配置。`
  if (normalized.includes('apikey invalid')) return `${label}数据 Key 已失效，请重新复制并验证。`
  if (message.includes('仅VIP可用') || normalized.includes('vip')) return `${label}数据接口仅限训记 VIP 使用。`
  if (normalized.includes('too frequent') || retryAfterMs !== undefined) {
    const seconds = Math.max(1, Math.ceil((retryAfterMs ?? REQUEST_INTERVAL_MS) / 1000))
    return `训记请求过于频繁，请 ${seconds} 秒后重试。`
  }
  return message
}

async function postUpstream({
  userId,
  credential,
  baseUrl,
  endpoint,
  payload,
  cacheable,
  waitForRateLimit = false,
}: {
  userId: string
  credential: CredentialKind
  baseUrl: string
  endpoint: string
  payload: JsonObject
  cacheable: boolean
  waitForRateLimit?: boolean
}): Promise<XunjiReadResult> {
  const key = cacheKey(userId, endpoint, payload)
  const cached = cacheable ? readCache.get(key) : undefined
  if (cached) return { res: cached.value, source: 'cache' }

  await enforceRateLimit(userId, endpoint, waitForRateLimit)
  const token = await getCredential(userId, credential)
  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? '训记接口请求超时。'
      : '无法连接训记接口。'
    throw new XunjiDataError(message, 502)
  } finally {
    lastRequestAt.set(`${userId}:${endpoint}`, Date.now())
  }

  const responsePayload = (await upstreamResponse.json().catch(() => null)) as unknown
  const root = asObject(responsePayload)
  if (!upstreamResponse.ok || root?.success !== true) {
    const retryAfterMs = asNumber(root?.retry_after_ms)
    const rawMessage = upstreamMessage(root, `训记接口请求失败（HTTP ${upstreamResponse.status}）。`)
    const message = friendlyUpstreamMessage(rawMessage, credential, retryAfterMs)
    throw new XunjiDataError(message, statusForUpstreamError(upstreamResponse.status, rawMessage), retryAfterMs)
  }
  const res = root.res
  if (cacheable) readCache.set(key, { value: res })
  return { res, source: 'api' }
}

function keyStatus(stored: string | null | undefined, environment: string | undefined): IntegrationKeyStatus {
  const accountToken = stored?.trim()
  if (accountToken) {
    return {
      configured: true,
      maskedKey: accountToken.length <= 12 ? '已配置' : `${accountToken.slice(0, 6)}...${accountToken.slice(-4)}`,
      source: 'account',
    }
  }
  if (environment?.trim()) return { configured: true, source: 'environment' }
  return { configured: false }
}

function connectionStatus(
  kind: XunjiConnectionKind,
  stored: string | null | undefined,
  environment: string | undefined,
  validatedAt: Date | null | undefined,
): XunjiConnectionStatus {
  const base = keyStatus(stored, environment)
  return {
    ...base,
    capabilities: kind === 'body' ? ['read', 'write'] : ['read'],
    validationStatus: !base.configured ? 'missing' : validatedAt ? 'valid' : 'unverified',
    validatedAt: validatedAt?.toISOString(),
  }
}

function validateCredentialInput(value: unknown, label: string): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string') throw new XunjiDataError(`${label}格式不正确。`)
  const token = value.trim()
  if (/\s/.test(token) || token.length < 16) throw new XunjiDataError(`${label}格式不正确。`)
  return token
}

function validateCredentialCandidate(kind: XunjiConnectionKind, value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new XunjiDataError('请输入要验证的 Key。')
  const token = value.trim()
  if (/\s/.test(token) || token.length < 16) throw new XunjiDataError('Key 格式不正确。')
  if (kind === 'food' && !token.startsWith('xjfood_')) {
    throw new XunjiDataError('饮食数据 Key 应以 xjfood_ 开头。')
  }
  if (kind === 'body' && !token.startsWith('xjbody_')) {
    throw new XunjiDataError('身体数据 Key 应以 xjbody_ 开头。')
  }
  return token
}

async function probeCredential(kind: XunjiConnectionKind, token: string): Promise<void> {
  const today = utcDateString(new Date())
  const request = kind === 'training'
    ? {
        url: `${TRAINING_BASE_URL}/api_trains_for_llm_v2`,
        payload: { schema_version: 'train_open_api_v2', datestr: today, include_full_data: false },
      }
    : kind === 'food'
      ? {
          url: `${FOOD_BASE_URL}/open/food/query_gzip`,
          payload: { start_date: today, end_date: today, include_detail: false },
        }
      : {
          url: `${MAIN_BASE_URL}/open/body/query_gzip`,
          payload: {
            start_date: today,
            end_date: today,
            types: ['weight'],
            include_latest: true,
            include_records: false,
            limit: 1,
            offset: 0,
          },
        }

  let response: Response
  try {
    response = await fetch(request.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(request.payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    throw new XunjiDataError(
      error instanceof Error && error.name === 'TimeoutError' ? '训记连接验证超时，请稍后重试。' : '无法连接训记，请检查网络后重试。',
      502,
    )
  }

  const payload = (await response.json().catch(() => null)) as unknown
  const root = asObject(payload)
  if (!response.ok || root?.success !== true) {
    const retryAfterMs = asNumber(root?.retry_after_ms)
    const rawMessage = upstreamMessage(root, `训记连接验证失败（HTTP ${response.status}）。`)
    const message = friendlyUpstreamMessage(rawMessage, kind, retryAfterMs)
    throw new XunjiDataError(message, statusForUpstreamError(response.status, rawMessage), retryAfterMs)
  }
}

export async function getXunjiConnections(userId: string): Promise<XunjiConnections> {
  const stored = await getStoredCredentials(userId)
  return {
    training: connectionStatus(
      'training',
      stored?.xunjiOpenApiKey,
      process.env.XUNJI_OPEN_API_KEY ?? process.env.XUNJI_API_KEY,
      stored?.xunjiOpenValidatedAt,
    ),
    food: connectionStatus(
      'food',
      stored?.xunjiFoodApiKey,
      process.env.XUNJI_FOOD_API_KEY,
      stored?.xunjiFoodValidatedAt,
    ),
    body: connectionStatus(
      'body',
      stored?.xunjiBodyApiKey,
      process.env.XUNJI_BODY_API_KEY,
      stored?.xunjiBodyValidatedAt,
    ),
  }
}

export async function validateAndSaveXunjiConnection(
  userId: string,
  kind: XunjiConnectionKind,
  input: unknown,
): Promise<XunjiConnections> {
  const payload = requireObject(input)
  const token = validateCredentialCandidate(kind, payload.apiKey)
  const validationEndpoint = `/connections/${kind}/validate`
  await enforceRateLimit(userId, validationEndpoint, false)
  try {
    await probeCredential(kind, token)
  } finally {
    lastRequestAt.set(`${userId}:${validationEndpoint}`, Date.now())
  }
  const validatedAt = new Date()

  if (kind === 'training') {
    await prisma.userPreference.upsert({
      where: { userId },
      create: { userId, xunjiOpenApiKey: token, xunjiOpenValidatedAt: validatedAt },
      update: { xunjiOpenApiKey: token, xunjiOpenValidatedAt: validatedAt },
    })
  } else if (kind === 'food') {
    await prisma.userPreference.upsert({
      where: { userId },
      create: { userId, xunjiFoodApiKey: token, xunjiFoodValidatedAt: validatedAt },
      update: { xunjiFoodApiKey: token, xunjiFoodValidatedAt: validatedAt },
    })
  } else {
    await prisma.userPreference.upsert({
      where: { userId },
      create: { userId, xunjiBodyApiKey: token, xunjiBodyValidatedAt: validatedAt },
      update: { xunjiBodyApiKey: token, xunjiBodyValidatedAt: validatedAt },
    })
  }
  invalidateUserCache(userId)
  return getXunjiConnections(userId)
}

export async function clearXunjiConnection(
  userId: string,
  kind: XunjiConnectionKind,
): Promise<XunjiConnections> {
  const update = kind === 'training'
    ? { xunjiOpenApiKey: null, xunjiOpenValidatedAt: null }
    : kind === 'food'
      ? { xunjiFoodApiKey: null, xunjiFoodValidatedAt: null }
      : { xunjiBodyApiKey: null, xunjiBodyValidatedAt: null }
  await prisma.userPreference.upsert({ where: { userId }, create: { userId, ...update }, update })
  invalidateUserCache(userId)
  return getXunjiConnections(userId)
}

export async function getXunjiDataIntegrationConfig(userId: string): Promise<XunjiDataIntegrationConfig> {
  const stored = await getStoredCredentials(userId)
  return {
    food: keyStatus(stored?.xunjiFoodApiKey, process.env.XUNJI_FOOD_API_KEY),
    body: keyStatus(stored?.xunjiBodyApiKey, process.env.XUNJI_BODY_API_KEY),
  }
}

export async function saveXunjiDataIntegrationConfig(
  userId: string,
  input: unknown,
): Promise<XunjiDataIntegrationConfig> {
  const payload = requireObject(input)
  const food = validateCredentialInput(payload.foodApiKey, '饮食数据 Key')
  const body = validateCredentialInput(payload.bodyApiKey, '身体数据 Key')
  if (food === undefined && body === undefined) throw new XunjiDataError('没有需要更新的 Key。')

  await prisma.userPreference.upsert({
    where: { userId },
    create: {
      userId,
      ...(food === undefined ? {} : { xunjiFoodApiKey: food, xunjiFoodValidatedAt: null }),
      ...(body === undefined ? {} : { xunjiBodyApiKey: body, xunjiBodyValidatedAt: null }),
    },
    update: {
      ...(food === undefined ? {} : { xunjiFoodApiKey: food, xunjiFoodValidatedAt: null }),
      ...(body === undefined ? {} : { xunjiBodyApiKey: body, xunjiBodyValidatedAt: null }),
    },
  })
  invalidateUserCache(userId)
  return getXunjiDataIntegrationConfig(userId)
}

export function queryXunjiFood(userId: string, input: unknown): Promise<XunjiReadResult> {
  return postUpstream({
    userId,
    credential: 'food',
    baseUrl: FOOD_BASE_URL,
    endpoint: '/open/food/query_gzip',
    payload: validateFoodQuery(input),
    cacheable: true,
  })
}

export function queryXunjiBody(userId: string, input: unknown): Promise<XunjiReadResult> {
  return postUpstream({
    userId,
    credential: 'body',
    baseUrl: MAIN_BASE_URL,
    endpoint: '/open/body/query_gzip',
    payload: validateBodyQuery(input),
    cacheable: true,
  })
}

function normalizeNutrition(value: unknown): Partial<Record<NutritionField, number>> {
  const object = asObject(value)
  if (!object) return {}
  const result: Partial<Record<NutritionField, number>> = {}
  const calories = asNumber(object.calories ?? object.cal ?? object.kcal)
  const protein = asNumber(object.protein)
  const carbs = asNumber(object.carbs ?? object.carb)
  const fat = asNumber(object.fat)
  if (calories !== undefined) result.calories = calories
  if (protein !== undefined) result.protein = protein
  if (carbs !== undefined) result.carbs = carbs
  if (fat !== undefined) result.fat = fat
  return result
}

function nutritionCount(summary: Partial<Record<NutritionField, number>>): number {
  return Object.values(summary).filter((value) => value !== undefined).length
}

function extractFoodSummary(res: unknown, datestr: string): Partial<Record<NutritionField, number>> {
  const root = asObject(res)
  const byDate = asObject(root?.by_date ?? root?.byDate)
  const days = Array.isArray(root?.days) ? root.days : []
  const day = days.find((item) => {
    const object = asObject(item)
    return object?.datestr === datestr || object?.date === datestr
  })
  const candidates = [
    byDate?.[datestr],
    day,
    root?.summary,
    root?.total,
    root?.totals,
    root,
  ]
  for (const candidate of candidates) {
    const summary = normalizeNutrition(candidate)
    if (nutritionCount(summary) > 0) return summary
  }

  const rows = [root?.records, root?.foods, root?.details].find(Array.isArray) as unknown[] | undefined
  if (!rows) return {}
  const total: Record<NutritionField, number> = { calories: 0, protein: 0, carbs: 0, fat: 0 }
  let recognized = 0
  for (const row of rows) {
    const object = asObject(row)
    if (!object) continue
    const rowDate = object.datestr ?? object.date
    if (typeof rowDate === 'string' && rowDate !== datestr) continue
    let summary = normalizeNutrition(object.summary ?? object.total ?? object.nutrition ?? object)
    if (nutritionCount(summary) === 0) {
      const ntr = normalizeNutrition(object.ntr)
      const amount = asNumber(object.amount ?? object.gram ?? object.weight)
      const unit = typeof object.unit === 'string' ? object.unit.toLowerCase() : 'g'
      if (amount !== undefined && unit === 'g' && nutritionCount(ntr) > 0) {
        summary = Object.fromEntries(
          Object.entries(ntr).map(([key, value]) => [key, value === undefined ? undefined : (value * amount) / 100]),
        ) as Partial<Record<NutritionField, number>>
      }
    }
    if (nutritionCount(summary) === 0) continue
    recognized += 1
    for (const field of Object.keys(total) as NutritionField[]) total[field] += summary[field] ?? 0
  }
  if (recognized === 0) return {}
  return Object.fromEntries(
    Object.entries(total).map(([key, value]) => [key, Math.round(value * 10) / 10]),
  ) as Record<NutritionField, number>
}

function normalizeBodyRecords(res: unknown, fallbackRecords: unknown[] = []): BodyRecord[] {
  const root = asObject(res)
  const rows = Array.isArray(res)
    ? res
    : Array.isArray(root?.records)
      ? root.records
      : fallbackRecords
  const now = new Date().toISOString()
  return rows.flatMap((item) => {
    const object = asObject(item)
    const value = asNumber(object?.value)
    if (!object || !isDateString(object.datestr) || !isBodyMetricType(object.type) || value === undefined) return []
    const definition = bodyMetricDefinition(object.type)
    return [{
      datestr: object.datestr,
      type: object.type,
      value,
      unit: object.unit === 'kg' || object.unit === '%' || object.unit === 'cm' ? object.unit : definition.unit,
      label: typeof object.label === 'string' && object.label.trim() ? object.label : definition.label,
      label_en: typeof object.label_en === 'string' && object.label_en.trim() ? object.label_en : definition.label_en,
      origin: 'xunji' as const,
      synced_at: now,
    }]
  })
}

function cleanupPending(): void {
  const now = Date.now()
  for (const [key, value] of pendingBodyMutations) if (value.expiresAt <= now) pendingBodyMutations.delete(key)
  for (const [key, value] of pendingDailySyncs) if (value.expiresAt <= now) pendingDailySyncs.delete(key)
}

function invalidateUserCache(userId: string): void {
  for (const key of readCache.keys()) if (key.startsWith(`${userId}:`)) readCache.delete(key)
}

export async function previewXunjiDailySync(
  userId: string,
  datestr: string,
  input: unknown,
): Promise<XunjiDailySyncPreview> {
  if (!isDateString(datestr)) throw new XunjiDataError('日期格式不正确，请使用 YYYY-MM-DD。')
  cleanupPending()
  const payload = requireObject(input)
  const includeFood = payload.food !== false
  const includeBody = payload.body !== false
  if (!includeFood && !includeBody) throw new XunjiDataError('请至少选择一种要同步的数据。')

  const [foodResult, bodyResult, currentLog, currentBody] = await Promise.all([
    includeFood
      ? queryXunjiFood(userId, { start_date: datestr, end_date: datestr, include_detail: true })
          .then((value) => ({ ok: true as const, value }))
          .catch((error: unknown) => ({ ok: false as const, error }))
      : Promise.resolve(undefined),
    includeBody
      ? queryXunjiBody(userId, {
          start_date: datestr,
          end_date: datestr,
          include_latest: false,
          include_records: true,
          limit: 500,
          offset: 0,
        })
          .then((value) => ({ ok: true as const, value }))
          .catch((error: unknown) => ({ ok: false as const, error }))
      : Promise.resolve(undefined),
    prisma.dailyLog.findUnique({ where: { userId_date: { userId, date: datestr } } }),
    prisma.bodyRecord.findMany({ where: { userId, datestr } }),
  ])

  const food = foodResult?.ok ? extractFoodSummary(foodResult.value.res, datestr) : {}
  const body = bodyResult?.ok ? normalizeBodyRecords(bodyResult.value.res) : []
  const currentDaily = currentLog ? toClientDailyLog(currentLog) : ({ date: datestr } as DailyLog)
  const currentBodyMap = new Map(currentBody.map((record) => [record.type, record.value]))
  const previewId = crypto.randomUUID()

  const foodChanges = (Object.entries(food) as Array<[NutritionField, number]>).map(([field, incoming]) => {
    const current = currentDaily[field]
    return {
      field,
      current,
      incoming,
      conflict: current !== undefined && current !== incoming,
      defaultSelected: current === undefined,
      unit: field === 'calories' ? 'kcal' as const : 'g' as const,
    }
  })
  const bodyChanges = body.map((record) => {
    const current = currentBodyMap.get(record.type)
    return {
      type: record.type,
      label: record.label,
      unit: record.unit,
      current,
      incoming: record.value,
      conflict: current !== undefined && current !== record.value,
      defaultSelected: current === undefined,
    }
  })

  const sourceError = (error: unknown): Omit<XunjiSourcePreview<never>, 'changes'> => {
    const typed = error instanceof XunjiDataError ? error : undefined
    return {
      status: typed && [401, 403, 503].includes(typed.status) ? 'unavailable' : 'error',
      message: error instanceof Error ? error.message : '读取训记数据失败。',
      ...(typed?.retryAfterMs === undefined ? {} : { retryAfterMs: typed.retryAfterMs }),
    }
  }

  const foodSource: XunjiDailySyncPreview['sources']['food'] = !includeFood
    ? { status: 'unavailable', changes: [], message: '未选择饮食汇总。' }
    : foodResult?.ok
      ? {
          status: foodChanges.length > 0 ? 'ready' : 'empty',
          changes: foodChanges,
          ...(foodChanges.length > 0 ? {} : { message: '训记当天没有可同步的饮食汇总。' }),
        }
      : { ...sourceError(foodResult?.error), changes: [] }
  const bodySource: XunjiDailySyncPreview['sources']['body'] = !includeBody
    ? { status: 'unavailable', changes: [], message: '未选择身体数据。' }
    : bodyResult?.ok
      ? {
          status: bodyChanges.length > 0 ? 'ready' : 'empty',
          changes: bodyChanges,
          ...(bodyChanges.length > 0 ? {} : { message: '训记当天没有可同步的身体数据。' }),
        }
      : { ...sourceError(bodyResult?.error), changes: [] }

  pendingDailySyncs.set(previewId, {
    userId,
    datestr,
    food,
    body,
    expiresAt: Date.now() + PREVIEW_TTL_MS,
  })
  return {
    previewId,
    datestr,
    sources: { food: foodSource, body: bodySource },
    foodChanges,
    bodyChanges,
  }
}

export async function commitXunjiDailySync(userId: string, input: unknown): Promise<XunjiDailySyncCommitResult> {
  cleanupPending()
  const payload = requireObject(input)
  if (payload.confirmed !== true) throw new XunjiDataError('user confirmation required', 409)
  const previewId = typeof payload.previewId === 'string' ? payload.previewId : ''
  const pending = pendingDailySyncs.get(previewId)
  if (!pending || pending.userId !== userId) throw new XunjiDataError('同步预检已过期，请重新预检。', 409)

  const selectedFoodFields = Array.isArray(payload.foodFields)
    ? payload.foodFields.filter((field): field is NutritionField =>
        field === 'calories' || field === 'protein' || field === 'carbs' || field === 'fat')
    : []
  const selectedBodyTypes = Array.isArray(payload.bodyTypes)
    ? payload.bodyTypes.filter(isBodyMetricType)
    : []

  const dailyPatch = Object.fromEntries(
    selectedFoodFields.flatMap((field) =>
      pending.food[field] === undefined ? [] : [[field, pending.food[field]]]),
  )
  const savedDaily = selectedFoodFields.length > 0
    ? await prisma.dailyLog.upsert({
        where: { userId_date: { userId, date: pending.datestr } },
        create: { userId, date: pending.datestr, ...dailyPatch },
        update: dailyPatch,
      })
    : await prisma.dailyLog.findUnique({ where: { userId_date: { userId, date: pending.datestr } } })

  const bodyToSave = pending.body.filter((record) => selectedBodyTypes.includes(record.type))
  const savedBody = bodyToSave.length > 0 ? await upsertBodyRecords(userId, bodyToSave) : []
  pendingDailySyncs.delete(previewId)
  return {
    dailyLog: savedDaily ? toClientDailyLog(savedDaily) : undefined,
    bodyRecords: savedBody.filter((record) => record.datestr === pending.datestr),
    results: {
      food: { status: selectedFoodFields.length > 0 ? 'success' : 'skipped', count: selectedFoodFields.length },
      body: { status: selectedBodyTypes.length > 0 ? 'success' : 'skipped', count: savedBody.length },
    },
  }
}

function validateBodyMutation(input: unknown): { payload: JsonObject; records: BodyRecord[] } {
  const raw = { ...requireObject(input) }
  delete raw.dry_run
  delete raw.confirmed
  const requestId = typeof raw.client_request_id === 'string' ? raw.client_request_id.trim() : ''
  if (!requestId) throw new XunjiDataError('client_request_id 不能为空。')
  if (!Array.isArray(raw.records) || raw.records.length === 0) throw new XunjiDataError('records 必须是非空数组。')
  const records = normalizeBodyRecords(undefined, raw.records)
  if (records.length !== raw.records.length) throw new XunjiDataError('身体数据记录格式不正确。')
  return {
    payload: {
      schema_version: 'body_open_api_v1',
      client_request_id: requestId,
      records: records.map(({ datestr, type, value }) => ({ datestr, type, value })),
    },
    records,
  }
}

export async function previewXunjiBodyMutation(userId: string, input: unknown): Promise<XunjiMutationResult> {
  cleanupPending()
  const { payload } = validateBodyMutation(input)
  const result = await postUpstream({
    userId,
    credential: 'body',
    baseUrl: MAIN_BASE_URL,
    endpoint: '/open/body/upsert_gzip',
    payload: { ...payload, dry_run: true },
    cacheable: false,
  })
  const requestId = String(payload.client_request_id)
  pendingBodyMutations.set(`${userId}:${requestId}`, {
    digest: digest(payload),
    payload,
    expiresAt: Date.now() + PREVIEW_TTL_MS,
  })
  const retryAfterMs = remainingRateLimitMs(userId, '/open/body/upsert_gzip')
  return {
    res: result.res,
    preview: true,
    commitAvailableAt: new Date(Date.now() + retryAfterMs).toISOString(),
    retryAfterMs,
  }
}

export async function commitXunjiBodyMutation(userId: string, input: unknown): Promise<XunjiMutationResult> {
  cleanupPending()
  const raw = requireObject(input)
  if (raw.confirmed !== true) throw new XunjiDataError('user confirmation required', 409)
  const { payload, records } = validateBodyMutation(raw)
  const key = `${userId}:${String(payload.client_request_id)}`
  const pending = pendingBodyMutations.get(key)
  if (!pending || pending.digest !== digest(payload)) {
    throw new XunjiDataError('请先对完全相同的变更执行预检，再确认写入。', 409)
  }
  const result = await postUpstream({
    userId,
    credential: 'body',
    baseUrl: MAIN_BASE_URL,
    endpoint: '/open/body/upsert_gzip',
    payload: { ...payload, dry_run: false, confirmed: true },
    cacheable: false,
    waitForRateLimit: true,
  })
  const normalized = normalizeBodyRecords(result.res, records)
  const saved = await upsertBodyRecords(userId, normalized.length > 0 ? normalized : records)
  pendingBodyMutations.delete(key)
  invalidateUserCache(userId)
  return { res: result.res, preview: false, bodyRecords: saved }
}

export async function saveLocalBodyRecords(userId: string, input: unknown): Promise<BodyRecord[]> {
  const payload = requireObject(input)
  if (!Array.isArray(payload.records)) throw new XunjiDataError('records 必须是数组。')
  const records = payload.records.flatMap((item): BodyRecord[] => {
    const object = asObject(item)
    const value = asNumber(object?.value)
    if (!object || !isDateString(object.datestr) || !isBodyMetricType(object.type) || value === undefined) return []
    const definition = bodyMetricDefinition(object.type)
    return [{
      datestr: object.datestr,
      type: object.type,
      value,
      unit: object.unit === 'kg' || object.unit === '%' || object.unit === 'cm' ? object.unit : definition.unit,
      label: typeof object.label === 'string' && object.label.trim() ? object.label : definition.label,
      label_en: typeof object.label_en === 'string' && object.label_en.trim() ? object.label_en : definition.label_en,
      origin: 'local',
      synced_at: typeof object.synced_at === 'string' && !Number.isNaN(Date.parse(object.synced_at))
        ? new Date(object.synced_at).toISOString()
        : undefined,
    }]
  })
  if (records.length !== payload.records.length) throw new XunjiDataError('身体数据记录格式不正确。')
  return upsertBodyRecords(userId, records)
}

export async function deleteLocalBodyRecord(
  userId: string,
  datestr: string,
  type: string,
): Promise<void> {
  if (!isDateString(datestr) || !isBodyMetricType(type)) throw new XunjiDataError('身体数据标识不正确。')
  await prisma.bodyRecord.deleteMany({ where: { userId, datestr, type } })
}

export { BODY_METRIC_TYPES }
