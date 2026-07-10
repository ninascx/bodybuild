import type { BodyMetricType, BodyRecord, DailyLog } from '../types'

export interface XunjiKeyStatus {
  configured: boolean
  maskedKey?: string
  source?: 'account' | 'environment'
}

export type XunjiConnectionKind = 'training' | 'food' | 'body'

export interface XunjiConnectionStatus extends XunjiKeyStatus {
  capabilities: Array<'read' | 'write'>
  validationStatus: 'missing' | 'unverified' | 'valid'
  validatedAt?: string
}

export type XunjiConnections = Record<XunjiConnectionKind, XunjiConnectionStatus>

export interface XunjiDataIntegrationConfig {
  food: XunjiKeyStatus
  body: XunjiKeyStatus
}

export interface XunjiBodyQueryResult {
  records?: BodyRecord[]
  latest?: Partial<Record<BodyMetricType, BodyRecord>>
  by_type?: Partial<Record<BodyMetricType, BodyRecord[]>>
  [key: string]: unknown
}

export interface XunjiReadResult<T> {
  res: T
  source: 'api' | 'cache'
}

export interface XunjiMutationResult<T> {
  res: T
  preview: boolean
  bodyRecords?: BodyRecord[]
  commitAvailableAt?: string
  retryAfterMs?: number
}

export interface XunjiSourcePreview<T> {
  status: 'ready' | 'empty' | 'unavailable' | 'error'
  changes: T[]
  message?: string
  retryAfterMs?: number
}

export type FoodSyncChange = {
  field: 'calories' | 'protein' | 'carbs' | 'fat'
  current?: number
  incoming: number
  conflict: boolean
  defaultSelected: boolean
  unit: 'kcal' | 'g'
}

export type BodySyncChange = {
  type: BodyMetricType
  label: string
  unit: BodyRecord['unit']
  current?: number
  incoming: number
  conflict: boolean
  defaultSelected: boolean
}

export interface XunjiDailySyncPreview {
  previewId: string
  datestr: string
  sources: {
    food: XunjiSourcePreview<FoodSyncChange>
    body: XunjiSourcePreview<BodySyncChange>
  }
  foodChanges: FoodSyncChange[]
  bodyChanges: BodySyncChange[]
}

type JsonObject = Record<string, unknown>

export class XunjiApiError extends Error {
  status: number
  retryAfterMs?: number

  constructor(message: string, status: number, retryAfterMs?: number) {
    super(message)
    this.name = 'XunjiApiError'
    this.status = status
    this.retryAfterMs = retryAfterMs
  }
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string; retryAfterMs?: number }
  if (!response.ok) throw new XunjiApiError(payload.error ?? fallback, response.status, payload.retryAfterMs)
  return payload
}

async function post<T>(path: string, body: JsonObject, fallback: string): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return readJson<T>(response, fallback)
}

export async function fetchXunjiDataIntegrationConfig(): Promise<XunjiDataIntegrationConfig> {
  const response = await fetch('/api/integrations/xunji-data')
  return readJson(response, '读取训记数据配置失败')
}

export async function fetchXunjiConnections(): Promise<XunjiConnections> {
  const response = await fetch('/api/integrations/xunji/connections')
  return readJson(response, '读取训记连接状态失败')
}

export function validateAndSaveXunjiConnection(
  kind: XunjiConnectionKind,
  apiKey: string,
): Promise<XunjiConnections> {
  return post(`/api/integrations/xunji/connections/${kind}/validate`, { apiKey }, '验证训记连接失败')
}

export async function clearXunjiConnection(kind: XunjiConnectionKind): Promise<XunjiConnections> {
  const response = await fetch(`/api/integrations/xunji/connections/${kind}`, { method: 'DELETE' })
  return readJson(response, '移除训记连接失败')
}

export async function saveXunjiDataIntegrationConfig(
  patch: Partial<{ foodApiKey: string | null; bodyApiKey: string | null }>,
): Promise<XunjiDataIntegrationConfig> {
  const response = await fetch('/api/integrations/xunji-data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return readJson(response, '保存训记数据配置失败')
}

export function queryXunjiFood<T = unknown>(input: {
  start_date: string
  end_date: string
  include_detail?: boolean
}): Promise<XunjiReadResult<T>> {
  return post('/api/xunji/food/records/query', input, '读取训记饮食数据失败')
}

export function queryXunjiBody(input: {
  start_date: string
  end_date: string
  types?: BodyMetricType[]
  include_latest?: boolean
  include_records?: boolean
  limit?: number
  offset?: number
}): Promise<XunjiReadResult<XunjiBodyQueryResult>> {
  return post('/api/xunji/body/records/query', input, '读取训记身体数据失败')
}

export function previewXunjiDailySync(
  date: string,
  sources: { food: boolean; body: boolean },
): Promise<XunjiDailySyncPreview> {
  return post(`/api/xunji/daily-sync/${encodeURIComponent(date)}/preview`, sources, '预检训记每日数据失败')
}

export function commitXunjiDailySync(input: {
  previewId: string
  foodFields: Array<'calories' | 'protein' | 'carbs' | 'fat'>
  bodyTypes: BodyMetricType[]
}): Promise<{
  dailyLog?: DailyLog
  bodyRecords: BodyRecord[]
  results: {
    food: { status: 'success' | 'skipped'; count: number }
    body: { status: 'success' | 'skipped'; count: number }
  }
}> {
  return post('/api/xunji/daily-sync/commit', { ...input, confirmed: true }, '从训记导入每日数据失败')
}

export function previewXunjiBodyRecords<T = unknown>(payload: {
  client_request_id: string
  records: BodyRecord[]
}): Promise<XunjiMutationResult<T>> {
  return post('/api/xunji/body/records/preview', payload, '预检训记身体数据失败')
}

export function commitXunjiBodyRecords<T = unknown>(payload: {
  client_request_id: string
  records: BodyRecord[]
}): Promise<XunjiMutationResult<T>> {
  return post('/api/xunji/body/records/commit', { ...payload, confirmed: true }, '写入训记身体数据失败')
}

export function saveLocalBodyRecords(records: BodyRecord[]): Promise<{ bodyRecords: BodyRecord[] }> {
  return post('/api/body-records', { records }, '保存身体数据失败')
}

export async function deleteLocalBodyRecord(date: string, type: BodyMetricType): Promise<void> {
  const response = await fetch(`/api/body-records/${encodeURIComponent(date)}/${encodeURIComponent(type)}`, {
    method: 'DELETE',
  })
  await readJson(response, '删除身体数据失败')
}
