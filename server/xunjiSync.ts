import crypto from 'node:crypto'

import type { CardioLog, DailyLog, ExerciseLog, ExerciseSetLog, WorkoutLog } from '../src/types'
import { prisma } from './db'
import { toClientDailyLog, toClientWorkoutLog } from './appData'

const XUNJI_BASE_URL = 'https://trains.xunjiapp.cn'
const XUNJI_SCHEMA_VERSION = 'train_open_api_v2'
const LIGHT_READ_INTERVAL_MS = 15_000
const FULL_READ_INTERVAL_MS = 30_000

type JsonObject = Record<string, unknown>

interface XunjiReadCacheEntry {
  userId: string
  datestr: string
  includeFullData: boolean
  fetchedAt: number
  response: XunjiReadResponse
}

interface XunjiReadResponse {
  res: {
    datestr?: string
    trains: XunjiTrain[]
  }
}

interface XunjiTrain extends JsonObject {
  datestr?: string
  title?: string
  name?: string
  movements?: XunjiMovement[]
  moves?: XunjiMovement[]
  notes?: string
  note?: string
  localid?: string | number
}

interface XunjiMovement extends JsonObject {
  name?: string
  sets?: XunjiSet[]
  note?: string
  notes?: string
}

interface XunjiSet extends JsonObject {
  done?: boolean
  weight?: string | number
  weight_kg?: string | number
  unit?: string
  reps?: string | number
  rir?: string | number
  RIR?: string | number
  time?: string | number
  duration_s?: string | number
  metrics?: JsonObject
  items?: Array<{
    name?: string
    movement?: string
    set?: XunjiSet
  }>
}

export interface XunjiSyncResult {
  datestr: string
  trainCount: number
  movementCount: number
  setCount: number
  workoutLog?: WorkoutLog
  dailyLog?: DailyLog
  source: 'cache' | 'api'
}

const readCache = new Map<string, XunjiReadCacheEntry>()
const lastReadAtByDate = new Map<string, number>()

function cacheKey(userId: string, datestr: string, includeFullData: boolean): string {
  return `${userId}:${datestr}:${includeFullData ? 'full' : 'light'}`
}

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

async function getXunjiApiKey(userId: string): Promise<string> {
  const preference = await prisma.userPreference.findUnique({
    where: { userId },
    select: { xunjiOpenApiKey: true },
  })
  const token = preference?.xunjiOpenApiKey ?? process.env.XUNJI_OPEN_API_KEY ?? process.env.XUNJI_API_KEY
  if (!token?.trim()) {
    throw new Error('未配置训记 Open API Key，请先在个人主页中设置。')
  }
  return token.trim()
}

function asObject(value: unknown): JsonObject | null {
  return typeof value === 'object' && value !== null ? (value as JsonObject) : null
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return undefined
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? parsed : undefined
}

function compactText(parts: Array<string | undefined>): string | undefined {
  const text = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join('；')
  return text || undefined
}

function createStableId(prefix: string, seed: string): string {
  return `${prefix}-${crypto.createHash('sha1').update(seed).digest('hex').slice(0, 14)}`
}

function normalizeWeightKg(set: XunjiSet): number | undefined {
  const raw = asNumber(set.weight_kg ?? set.weight)
  if (raw === undefined) return undefined
  const unit = typeof set.unit === 'string' ? set.unit.toLowerCase() : 'kg'
  return unit === 'lb' || unit === 'lbs' || unit === '磅' ? Math.round(raw * 0.453592 * 100) / 100 : raw
}

function durationSeconds(set: XunjiSet): number | undefined {
  const direct = asNumber(set.duration_s ?? set.time)
  if (direct !== undefined) return direct
  const metrics = asObject(set.metrics)
  return asNumber(metrics?.workoutTime ?? metrics?.duration_s ?? metrics?.duration)
}

function setToExerciseSet(set: XunjiSet): ExerciseSetLog {
  const next: ExerciseSetLog = {}
  const weight = normalizeWeightKg(set)
  const reps = asNumber(set.reps)
  const rir = asNumber(set.rir ?? set.RIR)
  if (weight !== undefined) next.weight = weight
  if (reps !== undefined) next.reps = reps
  if (rir !== undefined) next.rir = rir
  return next
}

function isExerciseSetMeaningful(set: ExerciseSetLog): boolean {
  return set.weight !== undefined || set.reps !== undefined || set.rir !== undefined
}

function metricNote(metrics: JsonObject | null): string | undefined {
  if (!metrics) return undefined
  const parts = [
    asNumber(metrics.distance) !== undefined ? `距离 ${asNumber(metrics.distance)}` : undefined,
    asNumber(metrics.kcal ?? metrics.calories) !== undefined ? `热量 ${asNumber(metrics.kcal ?? metrics.calories)} kcal` : undefined,
    asNumber(metrics.avgHeartRate) !== undefined ? `平均心率 ${asNumber(metrics.avgHeartRate)}` : undefined,
    asNumber(metrics.maxHeartRate) !== undefined ? `最高心率 ${asNumber(metrics.maxHeartRate)}` : undefined,
  ]
  return compactText(parts)
}

function collectMovementSets(movement: XunjiMovement): Array<{ name: string; set: XunjiSet }> {
  const movementName = typeof movement.name === 'string' && movement.name.trim() ? movement.name.trim() : '训记动作'
  const entries: Array<{ name: string; set: XunjiSet }> = []

  for (const set of asArray<XunjiSet>(movement.sets)) {
    const items = asArray<{ name?: string; movement?: string; set?: XunjiSet }>(set.items)
    if (items.length > 0) {
      for (const item of items) {
        const itemSet = asObject(item.set) as XunjiSet | null
        if (!itemSet) continue
        const name = item.name?.trim() || item.movement?.trim() || movementName
        entries.push({ name, set: itemSet })
      }
      continue
    }
    entries.push({ name: movementName, set })
  }

  return entries
}

function isCardioLikeSet(set: XunjiSet): boolean {
  if (isExerciseSetMeaningful(setToExerciseSet(set))) return false
  return Boolean(set.metrics) || durationSeconds(set) !== undefined
}

function addExerciseSet(exercisesByName: Map<string, ExerciseLog>, name: string, set: ExerciseSetLog): void {
  const existing = exercisesByName.get(name)
  if (existing) {
    existing.sets.push(set)
    return
  }
  exercisesByName.set(name, {
    exerciseId: createStableId('xunji-exercise', name),
    name,
    target: '训记同步',
    sets: [set],
  })
}

function createCardioLog(name: string, set: XunjiSet, index: number): CardioLog {
  const seconds = durationSeconds(set)
  const metrics = asObject(set.metrics)
  const durationMin = seconds !== undefined && seconds > 0 ? Math.round((seconds / 60) * 10) / 10 : undefined
  return {
    id: createStableId('xunji-cardio', `${name}:${index}:${JSON.stringify(set.metrics ?? {})}`),
    mode: name,
    durationMin,
    notes: metricNote(metrics),
  }
}

function mapXunjiTrainsToWorkout(datestr: string, trains: XunjiTrain[]): WorkoutLog {
  const exercisesByName = new Map<string, ExerciseLog>()
  const cardio: CardioLog[] = []
  const noteParts: string[] = []
  const titles = trains
    .map((train) => train.title?.trim() || train.name?.trim())
    .filter((title): title is string => Boolean(title))

  trains.forEach((train) => {
    const trainNote = compactText([train.notes, train.note])
    if (trainNote) noteParts.push(trainNote)
    const movements = [...asArray<XunjiMovement>(train.movements), ...asArray<XunjiMovement>(train.moves)]
    movements.forEach((movement) => {
      for (const entry of collectMovementSets(movement)) {
        if (isCardioLikeSet(entry.set)) {
          cardio.push(createCardioLog(entry.name, entry.set, cardio.length))
          continue
        }
        const exerciseSet = setToExerciseSet(entry.set)
        addExerciseSet(exercisesByName, entry.name, exerciseSet)
      }
    })
  })

  const exercises = Array.from(exercisesByName.values()).map((exercise) => ({
    ...exercise,
    target: `训记同步 · ${exercise.sets.length} 组`,
  }))

  return {
    date: datestr,
    workoutName: titles.length === 1 ? titles[0] : titles.length > 1 ? titles.join(' + ') : `训记同步 ${datestr}`,
    exercises,
    cardio,
    notes: compactText(['来自训记同步', ...noteParts]),
  }
}

function summarizeWorkout(workout: WorkoutLog): { movementCount: number; setCount: number; completionPercent: number } {
  const strengthSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
  const filledSets = workout.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.filter(isExerciseSetMeaningful).length,
    0,
  )
  return {
    movementCount: workout.exercises.length + (workout.cardio ?? []).length,
    setCount: strengthSets + (workout.cardio ?? []).length,
    completionPercent: strengthSets > 0 ? Math.round((filledSets / strengthSets) * 100) : (workout.cardio ?? []).length > 0 ? 100 : 0,
  }
}

async function fetchXunjiTrainingDay(userId: string, datestr: string, includeFullData: boolean): Promise<{ response: XunjiReadResponse; source: 'cache' | 'api' }> {
  const fullCache = readCache.get(cacheKey(userId, datestr, true))
  if (fullCache && (!includeFullData || fullCache.includeFullData)) {
    return { response: fullCache.response, source: 'cache' }
  }

  const exactCache = readCache.get(cacheKey(userId, datestr, includeFullData))
  if (exactCache) {
    return { response: exactCache.response, source: 'cache' }
  }

  const interval = includeFullData ? FULL_READ_INTERVAL_MS : LIGHT_READ_INTERVAL_MS
  const rateLimitKey = `${userId}:${datestr}`
  const lastReadAt = lastReadAtByDate.get(rateLimitKey)
  if (lastReadAt && Date.now() - lastReadAt < interval) {
    const retrySeconds = Math.ceil((interval - (Date.now() - lastReadAt)) / 1000)
    throw new Error(`训记读取过于频繁，请 ${retrySeconds} 秒后再试。`)
  }

  const token = await getXunjiApiKey(userId)
  const upstreamResponse = await fetch(`${XUNJI_BASE_URL}/api_trains_for_llm_v2`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      schema_version: XUNJI_SCHEMA_VERSION,
      datestr,
      include_full_data: includeFullData,
    }),
  })
  lastReadAtByDate.set(rateLimitKey, Date.now())

  const payload = (await upstreamResponse.json().catch(() => null)) as unknown
  const root = asObject(payload)
  const res = asObject(root?.res)
  const trains = asArray<XunjiTrain>(res?.trains)
  const hasUsableData = upstreamResponse.ok && root && res && Array.isArray(res.trains) && root.success !== false

  if (!hasUsableData) {
    const message = typeof root?.message === 'string'
      ? root.message
      : typeof root?.msg === 'string'
        ? root.msg
        : `训记接口读取失败（HTTP ${upstreamResponse.status}）`
    throw new Error(message)
  }

  const response: XunjiReadResponse = {
    res: {
      datestr: typeof res.datestr === 'string' ? res.datestr : datestr,
      trains,
    },
  }
  readCache.set(cacheKey(userId, datestr, includeFullData), {
    userId,
    datestr,
    includeFullData,
    fetchedAt: Date.now(),
    response,
  })
  return { response, source: 'api' }
}

export async function syncXunjiTrainingDay({
  userId,
  datestr,
  includeFullData = false,
  replaceExisting = false,
}: {
  userId: string
  datestr: string
  includeFullData?: boolean
  replaceExisting?: boolean
}): Promise<XunjiSyncResult> {
  if (!isValidDateString(datestr)) {
    throw new Error('日期格式不正确，请使用 YYYY-MM-DD。')
  }

  const existingWorkout = await prisma.workoutLog.findUnique({
    where: { userId_date: { userId, date: datestr } },
  })
  if (existingWorkout && !replaceExisting) {
    const existing = toClientWorkoutLog(existingWorkout)
    if (existing.exercises.length > 0 || (existing.cardio ?? []).length > 0 || existing.notes?.trim()) {
      const error = new Error('当天已有训练记录，请确认覆盖后再同步训记。')
      error.name = 'XunjiExistingWorkoutError'
      throw error
    }
  }

  let { response, source } = await fetchXunjiTrainingDay(userId, datestr, includeFullData)
  let trains = response.res.trains
  if (trains.length === 0 && !includeFullData) {
    const upgraded = await fetchXunjiTrainingDay(userId, datestr, true)
    if (upgraded.response.res.trains.length > 0) {
      response = upgraded.response
      source = upgraded.source
      trains = response.res.trains
    }
  }
  if (trains.length === 0) {
    return {
      datestr,
      trainCount: 0,
      movementCount: 0,
      setCount: 0,
      source,
    }
  }

  const workout = mapXunjiTrainsToWorkout(datestr, trains)
  const summary = summarizeWorkout(workout)
  const savedWorkout = await prisma.workoutLog.upsert({
    where: { userId_date: { userId, date: datestr } },
    create: {
      userId,
      date: workout.date,
      workoutName: workout.workoutName,
      exercisesJson: JSON.stringify(workout.exercises),
      cardioJson: JSON.stringify(workout.cardio ?? []),
      notes: workout.notes ?? null,
    },
    update: {
      workoutName: workout.workoutName,
      exercisesJson: JSON.stringify(workout.exercises),
      cardioJson: JSON.stringify(workout.cardio ?? []),
      notes: workout.notes ?? null,
    },
  })

  const savedDailyLog = await prisma.dailyLog.upsert({
    where: { userId_date: { userId, date: datestr } },
    create: {
      userId,
      date: datestr,
      trained: true,
      workoutCompletion: summary.completionPercent,
    },
    update: {
      trained: true,
      workoutCompletion: summary.completionPercent,
    },
  })

  return {
    datestr,
    trainCount: trains.length,
    movementCount: summary.movementCount,
    setCount: summary.setCount,
    workoutLog: toClientWorkoutLog(savedWorkout),
    dailyLog: toClientDailyLog(savedDailyLog),
    source,
  }
}
