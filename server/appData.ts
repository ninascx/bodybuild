import type {
  DailyLog as DbDailyLog,
  NutritionTarget as DbNutritionTarget,
  UserPreference as DbUserPreference,
  UserProfile as DbUserProfile,
  WorkoutLog as DbWorkoutLog,
  WorkoutPlan as DbWorkoutPlan,
  WorkoutTemplate as DbWorkoutTemplate,
} from '@prisma/client'
import crypto from 'node:crypto'

import { dailyTargets, userProfile, workoutPlans } from '../src/data/plans'
import { defaultUserPreference, mergeUserPreference } from '../src/lib/userPreferences'
import type { DailyLog, DailyTarget, DayKey, ExerciseLog, ExercisePlan, UserPlanData, UserPreference, UserProfile, WorkoutLog, WorkoutPlan, WorkoutTemplate } from '../src/types'
import { prisma } from './db'

interface AppData {
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  workoutTemplates: WorkoutTemplate[]
}

interface WorkoutTemplateShareRow {
  token: string
  templatesJson: string
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function toJson(value: unknown): string {
  return JSON.stringify(value ?? [])
}

function createServerId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function createShareToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function normalizeToken(value: string): string {
  const token = value.trim().toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw new Error('请输入 64 位 token')
  }
  return token
}

export function toClientDailyLog(row: DbDailyLog): DailyLog {
  return {
    date: row.date,
    morningWeightKg: row.morningWeightKg ?? undefined,
    waistCm: row.waistCm ?? undefined,
    chestCm: row.chestCm ?? undefined,
    upperArmCm: row.upperArmCm ?? undefined,
    thighCm: row.thighCm ?? undefined,
    calories: row.calories ?? undefined,
    protein: row.protein ?? undefined,
    carbs: row.carbs ?? undefined,
    fat: row.fat ?? undefined,
    steps: row.steps ?? undefined,
    sleepHours: row.sleepHours ?? undefined,
    trained: row.trained ?? undefined,
    workoutCompletion: row.workoutCompletion ?? undefined,
    fatigueScore: row.fatigueScore ?? undefined,
    notes: row.notes ?? undefined,
  }
}

export function toClientWorkoutLog(row: DbWorkoutLog): WorkoutLog {
  return {
    date: row.date,
    workoutName: row.workoutName,
    exercises: parseJson<ExerciseLog[]>(row.exercisesJson, []),
    notes: row.notes ?? undefined,
  }
}

export function toClientWorkoutTemplate(row: DbWorkoutTemplate): WorkoutTemplate {
  return {
    id: row.id,
    name: row.name,
    focus: row.focus,
    category: row.category,
    exercises: parseJson<ExercisePlan[]>(row.exercisesJson, []),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isBuiltin: row.isBuiltin,
  }
}

export function toClientUserProfile(row: DbUserProfile): UserProfile {
  return {
    sex: row.sex === 'male' || row.sex === 'female' || row.sex === 'other' ? row.sex : undefined,
    birthDate: row.birthDate ?? undefined,
    heightCm: row.heightCm ?? undefined,
    initialWeightKg: row.initialWeightKg ?? undefined,
    currentWeightKg: row.currentWeightKg ?? undefined,
    estimatedBodyFatPercent: row.estimatedBodyFatPercent ?? undefined,
    waistCm: row.waistCm ?? undefined,
    chestCm: row.chestCm ?? undefined,
    upperArmCm: row.upperArmCm ?? undefined,
    thighCm: row.thighCm ?? undefined,
    targetWeeks: row.targetWeeks ?? undefined,
    goal: row.goal ?? undefined,
    sleepHours: row.sleepHours ?? undefined,
    averageSteps: row.averageSteps ?? undefined,
    trainingDays: parseJson<DayKey[]>(row.trainingDaysJson, []),
  }
}

export function toClientUserPreference(row: DbUserPreference | null): UserPreference {
  if (!row) return mergeUserPreference(undefined)
  return mergeUserPreference({
    theme: row.theme ?? undefined,
    restDurationSec: row.restDurationSec,
    autoStartRest: row.autoStartRest,
    activeTab: row.activeTab ?? undefined,
    goalType:
      row.goalType === 'fat_loss' || row.goalType === 'muscle_gain' || row.goalType === 'maintenance'
        ? row.goalType
        : undefined,
    weeklyWeightChangeGoalKg: row.weeklyWeightChangeGoalKg ?? undefined,
    sleepFloorHours: row.sleepFloorHours ?? undefined,
    fatigueThreshold: row.fatigueThreshold ?? undefined,
    weekendCalorieUpperKcal: row.weekendCalorieUpperKcal ?? undefined,
  })
}

function dailyLogWriteData(userId: string, log: DailyLog) {
  return {
    userId,
    date: log.date,
    morningWeightKg: log.morningWeightKg ?? null,
    waistCm: log.waistCm ?? null,
    chestCm: log.chestCm ?? null,
    upperArmCm: log.upperArmCm ?? null,
    thighCm: log.thighCm ?? null,
    calories: log.calories ?? null,
    protein: log.protein ?? null,
    carbs: log.carbs ?? null,
    fat: log.fat ?? null,
    steps: log.steps ?? null,
    sleepHours: log.sleepHours ?? null,
    trained: log.trained ?? null,
    workoutCompletion: log.workoutCompletion ?? null,
    fatigueScore: log.fatigueScore ?? null,
    notes: log.notes ?? null,
  }
}

function workoutLogWriteData(userId: string, log: WorkoutLog) {
  return {
    userId,
    date: log.date,
    workoutName: log.workoutName,
    exercisesJson: toJson(log.exercises),
    notes: log.notes ?? null,
  }
}

function workoutTemplateWriteData(userId: string, template: WorkoutTemplate) {
  return {
    id: template.id,
    userId,
    name: template.name,
    focus: template.focus,
    category: template.category,
    exercisesJson: toJson(template.exercises),
    isBuiltin: false,
  }
}

function userProfileWriteData(userId: string, profile: UserProfile) {
  return {
    userId,
    sex: profile.sex ?? null,
    birthDate: profile.birthDate?.trim() || null,
    heightCm: profile.heightCm ?? null,
    initialWeightKg: profile.initialWeightKg ?? null,
    currentWeightKg: profile.currentWeightKg ?? null,
    estimatedBodyFatPercent: profile.estimatedBodyFatPercent ?? null,
    waistCm: profile.waistCm ?? null,
    chestCm: profile.chestCm ?? null,
    upperArmCm: profile.upperArmCm ?? null,
    thighCm: profile.thighCm ?? null,
    targetWeeks: profile.targetWeeks?.trim() || null,
    goal: profile.goal?.trim() || null,
    sleepHours: profile.sleepHours ?? null,
    averageSteps: profile.averageSteps ?? null,
    trainingDaysJson: toJson(profile.trainingDays ?? []),
  }
}

function userPreferenceWriteData(userId: string, preference: UserPreference) {
  const merged = mergeUserPreference(preference)
  return {
    userId,
    theme: merged.theme ?? null,
    restDurationSec: merged.restDurationSec ?? defaultUserPreference.restDurationSec,
    autoStartRest: merged.autoStartRest ?? defaultUserPreference.autoStartRest,
    activeTab: merged.activeTab ?? null,
    goalType: merged.goalType ?? defaultUserPreference.goalType,
    weeklyWeightChangeGoalKg: merged.weeklyWeightChangeGoalKg ?? defaultUserPreference.weeklyWeightChangeGoalKg,
    sleepFloorHours: merged.sleepFloorHours ?? defaultUserPreference.sleepFloorHours,
    fatigueThreshold: merged.fatigueThreshold ?? defaultUserPreference.fatigueThreshold,
    weekendCalorieUpperKcal: merged.weekendCalorieUpperKcal ?? defaultUserPreference.weekendCalorieUpperKcal,
  }
}

function sanitizeExercise(exercise: unknown): ExercisePlan | null {
  if (typeof exercise !== 'object' || exercise === null) return null
  const value = exercise as Partial<ExercisePlan>
  if (typeof value.name !== 'string' || !value.name.trim()) return null
  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : createServerId('template-exercise'),
    name: value.name.trim(),
    prescription:
      typeof value.prescription === 'string' && value.prescription.trim()
        ? value.prescription.trim()
        : '3 组 × 8-12 次',
    note: typeof value.note === 'string' && value.note.trim() ? value.note.trim() : undefined,
  }
}

function sanitizeTemplate(template: unknown): WorkoutTemplate | null {
  if (typeof template !== 'object' || template === null) return null
  const value = template as Partial<WorkoutTemplate>
  if (value.isBuiltin) return null
  if (typeof value.name !== 'string' || !value.name.trim()) return null
  const exercises = Array.isArray(value.exercises)
    ? value.exercises.map(sanitizeExercise).filter((exercise): exercise is ExercisePlan => exercise !== null)
    : []
  if (exercises.length === 0) return null
  const now = new Date().toISOString()
  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : createServerId('template'),
    name: value.name.trim(),
    focus: typeof value.focus === 'string' && value.focus.trim() ? value.focus.trim() : '自定义',
    category: typeof value.category === 'string' && value.category.trim() ? value.category.trim() : '自定义',
    exercises,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now,
    isBuiltin: false,
  }
}

function cloneImportedTemplate(template: WorkoutTemplate): WorkoutTemplate {
  const now = new Date().toISOString()
  return {
    ...template,
    id: createServerId('template'),
    exercises: template.exercises.map((exercise) => ({
      ...exercise,
      id: createServerId('template-exercise'),
    })),
    createdAt: now,
    updatedAt: now,
    isBuiltin: false,
  }
}

export async function getUserAppData(userId: string): Promise<AppData> {
  const [dailyLogs, workoutLogs, userTemplates] = await Promise.all([
    prisma.dailyLog.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
    prisma.workoutLog.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
    prisma.workoutTemplate.findMany({
      where: { userId, isBuiltin: false },
      orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
    }),
  ])

  return {
    dailyLogs: dailyLogs.map(toClientDailyLog),
    workoutLogs: workoutLogs.map(toClientWorkoutLog),
    workoutTemplates: userTemplates.map(toClientWorkoutTemplate),
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const profile = await prisma.userProfile.findUnique({ where: { userId } })
  return profile ? toClientUserProfile(profile) : { trainingDays: [] }
}

export async function getUserPreference(userId: string): Promise<UserPreference> {
  const preference = await prisma.userPreference.findUnique({ where: { userId } })
  return toClientUserPreference(preference)
}

export async function replaceUserProfile(userId: string, profile: UserProfile): Promise<UserProfile> {
  const data = userProfileWriteData(userId, profile)
  const saved = await prisma.userProfile.upsert({
    where: { userId },
    create: data,
    update: data,
  })
  return toClientUserProfile(saved)
}

export async function replaceUserPreference(userId: string, preference: UserPreference): Promise<UserPreference> {
  const data = userPreferenceWriteData(userId, preference)
  const saved = await prisma.userPreference.upsert({
    where: { userId },
    create: data,
    update: data,
  })
  return toClientUserPreference(saved)
}

export async function getUserPlanData(userId: string): Promise<UserPlanData> {
  const [nutritionTargets, trainingPlans] = await Promise.all([
    prisma.nutritionTarget.findMany({ where: { userId }, orderBy: { dayOfWeek: 'asc' } }),
    prisma.workoutPlan.findMany({ where: { userId }, orderBy: { dayOfWeek: 'asc' } }),
  ])
  const mergedTargets = { ...dailyTargets } as Record<DayKey, DailyTarget>
  const mergedPlans = { ...workoutPlans } as Record<DayKey, WorkoutPlan>

  nutritionTargets.forEach((target) => {
    mergedTargets[target.dayOfWeek as DayKey] = toClientNutritionTarget(target)
  })
  trainingPlans.forEach((plan) => {
    mergedPlans[plan.dayOfWeek as DayKey] = toClientWorkoutPlan(plan)
  })

  return {
    dailyTargets: mergedTargets,
    workoutPlans: mergedPlans,
  }
}

export async function replaceUserPlanData(userId: string, data: UserPlanData): Promise<UserPlanData> {
  await prisma.$transaction([
    ...Object.values(data.dailyTargets).map((target) => {
      const next = nutritionTargetData(userId, target)
      return prisma.nutritionTarget.upsert({
        where: { userId_dayOfWeek: { userId, dayOfWeek: target.day } },
        create: next,
        update: next,
      })
    }),
    ...Object.values(data.workoutPlans).map((plan) => {
      const next = workoutPlanData(userId, plan)
      return prisma.workoutPlan.upsert({
        where: { userId_dayOfWeek: { userId, dayOfWeek: plan.day } },
        create: next,
        update: next,
      })
    }),
  ])

  return getUserPlanData(userId)
}

export async function replaceUserAppData(userId: string, data: AppData): Promise<AppData> {
  await prisma.$transaction(async (tx) => {
    await tx.dailyLog.deleteMany({ where: { userId } })
    await tx.workoutLog.deleteMany({ where: { userId } })
    await tx.workoutTemplate.deleteMany({ where: { userId, isBuiltin: false } })

    if (data.dailyLogs.length > 0) {
      await tx.dailyLog.createMany({
        data: data.dailyLogs.map((log) => dailyLogWriteData(userId, log)),
      })
    }
    if (data.workoutLogs.length > 0) {
      await tx.workoutLog.createMany({
        data: data.workoutLogs.map((log) => workoutLogWriteData(userId, log)),
      })
    }
    const customTemplates = data.workoutTemplates.filter((template) => !template.isBuiltin)
    if (customTemplates.length > 0) {
      await tx.workoutTemplate.createMany({
        data: customTemplates.map((template) => workoutTemplateWriteData(userId, template)),
      })
    }
  })

  return getUserAppData(userId)
}

export async function deleteUserData(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.dailyLog.deleteMany({ where: { userId } }),
    prisma.workoutLog.deleteMany({ where: { userId } }),
    prisma.workoutTemplate.deleteMany({ where: { userId, isBuiltin: false } }),
    prisma.workoutTemplateShare.deleteMany({ where: { userId } }),
    prisma.userProfile.deleteMany({ where: { userId } }),
    prisma.nutritionTarget.deleteMany({ where: { userId } }),
    prisma.workoutPlan.deleteMany({ where: { userId } }),
    prisma.userPreference.deleteMany({ where: { userId } }),
  ])
}

export async function getUserExportData(userId: string) {
  const [appData, profile, planData, preference] = await Promise.all([
    getUserAppData(userId),
    getUserProfile(userId),
    getUserPlanData(userId),
    getUserPreference(userId),
  ])
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    planData,
    preference,
    ...appData,
  }
}

export async function upsertDailyLog(userId: string, log: DailyLog): Promise<DailyLog> {
  const data = dailyLogWriteData(userId, log)
  const saved = await prisma.dailyLog.upsert({
    where: { userId_date: { userId, date: log.date } },
    create: data,
    update: data,
  })
  return toClientDailyLog(saved)
}

export async function upsertWorkoutLog(userId: string, log: WorkoutLog): Promise<WorkoutLog> {
  const data = workoutLogWriteData(userId, log)
  const saved = await prisma.workoutLog.upsert({
    where: { userId_date: { userId, date: log.date } },
    create: data,
    update: data,
  })
  return toClientWorkoutLog(saved)
}

export async function replaceUserTemplates(userId: string, templates: WorkoutTemplate[]): Promise<WorkoutTemplate[]> {
  const customTemplates = templates.filter((template) => !template.isBuiltin)
  await prisma.$transaction([
    prisma.workoutTemplate.deleteMany({ where: { userId, isBuiltin: false } }),
    ...customTemplates.map((template) =>
      prisma.workoutTemplate.create({
        data: workoutTemplateWriteData(userId, template),
      }),
    ),
  ])
  const saved = await prisma.workoutTemplate.findMany({
    where: { userId, isBuiltin: false },
    orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
  })
  return saved.map(toClientWorkoutTemplate)
}

export async function createWorkoutTemplateShareToken(
  userId: string,
  templates: WorkoutTemplate[],
): Promise<{ token: string; count: number }> {
  const customTemplates = templates
    .map(sanitizeTemplate)
    .filter((template): template is WorkoutTemplate => template !== null)

  if (customTemplates.length === 0) {
    throw new Error('没有可导出的自定义训练模板')
  }

  const templatesJson = JSON.stringify(customTemplates)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = createShareToken()
    try {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "WorkoutTemplateShare" ("token", "userId", "templatesJson") VALUES (?, ?, ?)',
        token,
        userId,
        templatesJson,
      )
      return { token, count: customTemplates.length }
    } catch (error) {
      if (attempt === 2) throw error
    }
  }
  throw new Error('生成 token 失败')
}

export async function importWorkoutTemplatesByToken(
  userId: string,
  tokenValue: string,
): Promise<{ workoutTemplates: WorkoutTemplate[]; importedCount: number }> {
  const token = normalizeToken(tokenValue)
  const rows = await prisma.$queryRawUnsafe<WorkoutTemplateShareRow[]>(
    'SELECT "token", "templatesJson" FROM "WorkoutTemplateShare" WHERE "token" = ? LIMIT 1',
    token,
  )
  const row = rows[0]
  if (!row) {
    throw new Error('未找到对应的训练模板 token')
  }

  const sharedTemplates = parseJson<WorkoutTemplate[]>(row.templatesJson, [])
    .map(sanitizeTemplate)
    .filter((template): template is WorkoutTemplate => template !== null)
    .map(cloneImportedTemplate)

  if (sharedTemplates.length === 0) {
    throw new Error('这个 token 没有可导入的训练模板')
  }

  await prisma.workoutTemplate.createMany({
    data: sharedTemplates.map((template) => workoutTemplateWriteData(userId, template)),
  })

  return {
    workoutTemplates: await getUserAppData(userId).then((data) => data.workoutTemplates),
    importedCount: sharedTemplates.length,
  }
}

function nutritionTargetData(userId: string, target: DailyTarget) {
  return {
    userId,
    dayOfWeek: target.day,
    workoutName: target.workoutName,
    calories: target.calories ?? null,
    calorieMin: target.calorieRange?.[0] ?? null,
    calorieMax: target.calorieRange?.[1] ?? null,
    protein: target.protein,
    carbs: target.carbs ?? null,
    fat: target.fat ?? null,
    stepTarget: target.stepTarget,
    notesJson: toJson(target.notes),
    isTrainingDay: target.isTrainingDay,
  }
}

function workoutPlanData(userId: string, plan: WorkoutPlan) {
  return {
    userId,
    dayOfWeek: plan.day,
    name: plan.name,
    focus: plan.focus,
    exercisesJson: toJson(plan.exercises),
  }
}

export function toClientNutritionTarget(row: DbNutritionTarget): DailyTarget {
  return {
    day: row.dayOfWeek as DayKey,
    dayName: dailyTargets[row.dayOfWeek as DayKey]?.dayName ?? '',
    workoutName: row.workoutName,
    calories: row.calories ?? undefined,
    calorieRange: row.calorieMin !== null && row.calorieMax !== null ? [row.calorieMin, row.calorieMax] : undefined,
    protein: row.protein,
    carbs: row.carbs ?? undefined,
    fat: row.fat ?? undefined,
    stepTarget: row.stepTarget,
    notes: parseJson<string[]>(row.notesJson, []),
    isTrainingDay: row.isTrainingDay,
  }
}

export function toClientWorkoutPlan(row: DbWorkoutPlan): WorkoutPlan {
  return {
    day: row.dayOfWeek as DayKey,
    name: row.name,
    focus: row.focus,
    exercises: parseJson<ExercisePlan[]>(row.exercisesJson, []),
  }
}

export async function cloneDefaultPlanToUser(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        sex: userProfile.sex,
        birthDate: userProfile.birthDate,
        heightCm: userProfile.heightCm,
        initialWeightKg: userProfile.initialWeightKg,
        currentWeightKg: userProfile.currentWeightKg ?? userProfile.initialWeightKg,
        estimatedBodyFatPercent: userProfile.estimatedBodyFatPercent,
        waistCm: userProfile.waistCm ?? null,
        chestCm: userProfile.chestCm ?? null,
        upperArmCm: userProfile.upperArmCm ?? null,
        thighCm: userProfile.thighCm ?? null,
        targetWeeks: userProfile.targetWeeks,
        goal: userProfile.goal,
        sleepHours: userProfile.sleepHours,
        averageSteps: userProfile.averageSteps,
        trainingDaysJson: toJson(userProfile.trainingDays),
      },
      update: {
        sex: userProfile.sex,
        birthDate: userProfile.birthDate,
        heightCm: userProfile.heightCm,
        initialWeightKg: userProfile.initialWeightKg,
        currentWeightKg: userProfile.currentWeightKg ?? userProfile.initialWeightKg,
        estimatedBodyFatPercent: userProfile.estimatedBodyFatPercent,
        waistCm: userProfile.waistCm ?? null,
        chestCm: userProfile.chestCm ?? null,
        upperArmCm: userProfile.upperArmCm ?? null,
        thighCm: userProfile.thighCm ?? null,
        targetWeeks: userProfile.targetWeeks,
        goal: userProfile.goal,
        sleepHours: userProfile.sleepHours,
        averageSteps: userProfile.averageSteps,
        trainingDaysJson: toJson(userProfile.trainingDays),
      },
    }),
    prisma.userPreference.upsert({
      where: { userId },
      create: userPreferenceWriteData(userId, defaultUserPreference),
      update: userPreferenceWriteData(userId, defaultUserPreference),
    }),
    ...Object.values(dailyTargets).map((target) => {
      const data = nutritionTargetData(userId, target)
      return prisma.nutritionTarget.upsert({
        where: { userId_dayOfWeek: { userId, dayOfWeek: target.day } },
        create: data,
        update: data,
      })
    }),
    ...Object.values(workoutPlans).map((plan) => {
      const data = workoutPlanData(userId, plan)
      return prisma.workoutPlan.upsert({
        where: { userId_dayOfWeek: { userId, dayOfWeek: plan.day } },
        create: data,
        update: data,
      })
    }),
  ])
}
