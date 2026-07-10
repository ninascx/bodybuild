import { prisma } from './db'

const statements = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash")`,
  `CREATE TABLE IF NOT EXISTS "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sex" TEXT,
    "birthDate" TEXT,
    "heightCm" REAL,
    "initialWeightKg" REAL,
    "currentWeightKg" REAL,
    "estimatedBodyFatPercent" REAL,
    "waistCm" REAL,
    "chestCm" REAL,
    "upperArmCm" REAL,
    "thighCm" REAL,
    "targetWeeks" TEXT,
    "goal" TEXT,
    "sleepHours" REAL,
    "averageSteps" INTEGER,
    "trainingDaysJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_userId_key" ON "UserProfile"("userId")`,
  `CREATE TABLE IF NOT EXISTS "NutritionTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "workoutName" TEXT NOT NULL,
    "calories" INTEGER,
    "calorieMin" INTEGER,
    "calorieMax" INTEGER,
    "protein" INTEGER NOT NULL,
    "carbs" INTEGER,
    "fat" INTEGER,
    "stepTarget" INTEGER NOT NULL,
    "notesJson" TEXT NOT NULL DEFAULT '[]',
    "isTrainingDay" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NutritionTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "NutritionTarget_userId_dayOfWeek_key" ON "NutritionTarget"("userId", "dayOfWeek")`,
  `CREATE TABLE IF NOT EXISTS "WorkoutPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "exercisesJson" TEXT NOT NULL DEFAULT '[]',
    "cardioJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "WorkoutPlan_userId_dayOfWeek_key" ON "WorkoutPlan"("userId", "dayOfWeek")`,
  `CREATE TABLE IF NOT EXISTS "WorkoutTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "exercisesJson" TEXT NOT NULL DEFAULT '[]',
    "cardioJson" TEXT NOT NULL DEFAULT '[]',
    "isBuiltin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "WorkoutTemplateShare" (
    "token" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "templatesJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutTemplateShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "WorkoutTemplateShare_userId_idx" ON "WorkoutTemplateShare"("userId")`,
  `CREATE TABLE IF NOT EXISTS "DailyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "morningWeightKg" REAL,
    "waistCm" REAL,
    "chestCm" REAL,
    "upperArmCm" REAL,
    "thighCm" REAL,
    "calories" INTEGER,
    "protein" INTEGER,
    "carbs" INTEGER,
    "fat" INTEGER,
    "steps" INTEGER,
    "sleepHours" REAL,
    "trained" BOOLEAN,
    "workoutCompletion" INTEGER,
    "fatigueScore" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DailyLog_userId_date_key" ON "DailyLog"("userId", "date")`,
  `CREATE INDEX IF NOT EXISTS "DailyLog_userId_date_idx" ON "DailyLog"("userId", "date")`,
  `CREATE TABLE IF NOT EXISTS "BodyRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "datestr" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'local',
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BodyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "BodyRecord_userId_datestr_type_key" ON "BodyRecord"("userId", "datestr", "type")`,
  `CREATE INDEX IF NOT EXISTS "BodyRecord_userId_datestr_idx" ON "BodyRecord"("userId", "datestr")`,
  `CREATE INDEX IF NOT EXISTS "BodyRecord_userId_type_datestr_idx" ON "BodyRecord"("userId", "type", "datestr")`,
  `CREATE TABLE IF NOT EXISTS "WorkoutLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "workoutName" TEXT NOT NULL,
    "exercisesJson" TEXT NOT NULL DEFAULT '[]',
    "cardioJson" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "WorkoutLog_userId_date_key" ON "WorkoutLog"("userId", "date")`,
  `CREATE INDEX IF NOT EXISTS "WorkoutLog_userId_date_idx" ON "WorkoutLog"("userId", "date")`,
  `CREATE TABLE IF NOT EXISTS "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "theme" TEXT,
    "restDurationSec" INTEGER NOT NULL DEFAULT 90,
    "autoStartRest" BOOLEAN NOT NULL DEFAULT false,
    "activeTab" TEXT,
    "goalType" TEXT,
    "weeklyWeightChangeGoalKg" REAL,
    "sleepFloorHours" REAL,
    "fatigueThreshold" INTEGER,
    "weekendCalorieUpperKcal" INTEGER,
    "xunjiOpenApiKey" TEXT,
    "xunjiFoodApiKey" TEXT,
    "xunjiBodyApiKey" TEXT,
    "xunjiOpenValidatedAt" DATETIME,
    "xunjiFoodValidatedAt" DATETIME,
    "xunjiBodyValidatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserPreference_userId_key" ON "UserPreference"("userId")`,
  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "detailsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
]

interface TableColumn {
  name: string
}

async function ensureUserIdentityColumns(): Promise<void> {
  const columns = await prisma.$queryRawUnsafe<TableColumn[]>('PRAGMA table_info("User")')
  const columnNames = new Set(columns.map((column) => column.name))

  if (!columnNames.has('username')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN "username" TEXT')
    if (columnNames.has('email')) {
      await prisma.$executeRawUnsafe('UPDATE "User" SET "username" = "email" WHERE "username" IS NULL OR "username" = \'\'')
    }
    await prisma.$executeRawUnsafe('UPDATE "User" SET "username" = COALESCE(NULLIF("username", \'\'), "displayName", "id")')
  }

  if (!columnNames.has('email')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN "email" TEXT')
  }

  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")')
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")')
}

async function ensureUserProfileCurrentColumns(): Promise<void> {
  const columns = await prisma.$queryRawUnsafe<TableColumn[]>('PRAGMA table_info("UserProfile")')
  const columnNames = new Set(columns.map((column) => column.name))
  const numericColumns = ['currentWeightKg', 'waistCm', 'chestCm', 'upperArmCm', 'thighCm']

  for (const column of numericColumns) {
    if (!columnNames.has(column)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "UserProfile" ADD COLUMN "${column}" REAL`)
    }
  }
}

async function ensureUserPreferenceRuleColumns(): Promise<void> {
  const columns = await prisma.$queryRawUnsafe<TableColumn[]>('PRAGMA table_info("UserPreference")')
  const columnNames = new Set(columns.map((column) => column.name))
  const columnsToAdd: Array<[string, string]> = [
    ['goalType', 'TEXT'],
    ['weeklyWeightChangeGoalKg', 'REAL'],
    ['sleepFloorHours', 'REAL'],
    ['fatigueThreshold', 'INTEGER'],
    ['weekendCalorieUpperKcal', 'INTEGER'],
    ['xunjiOpenApiKey', 'TEXT'],
    ['xunjiFoodApiKey', 'TEXT'],
    ['xunjiBodyApiKey', 'TEXT'],
    ['xunjiOpenValidatedAt', 'DATETIME'],
    ['xunjiFoodValidatedAt', 'DATETIME'],
    ['xunjiBodyValidatedAt', 'DATETIME'],
  ]

  for (const [column, type] of columnsToAdd) {
    if (!columnNames.has(column)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "UserPreference" ADD COLUMN "${column}" ${type}`)
    }
  }
}

const legacyBodyMeta = {
  weight: { unit: 'kg', label: '体重', labelEn: 'Weight' },
  bodyfat: { unit: '%', label: '体脂率', labelEn: 'Body fat' },
  chest: { unit: 'cm', label: '胸围', labelEn: 'Chest' },
  weist: { unit: 'cm', label: '腰围', labelEn: 'Waist' },
  arm_left: { unit: 'cm', label: '左臂围', labelEn: 'Left arm' },
  arm_right: { unit: 'cm', label: '右臂围', labelEn: 'Right arm' },
  leg_left: { unit: 'cm', label: '左腿围', labelEn: 'Left leg' },
  leg_right: { unit: 'cm', label: '右腿围', labelEn: 'Right leg' },
} as const

async function migrateLegacyBodyRecords(): Promise<void> {
  const [dailyLogs, profiles] = await Promise.all([
    prisma.dailyLog.findMany({
      select: {
        userId: true,
        date: true,
        morningWeightKg: true,
        waistCm: true,
        chestCm: true,
        upperArmCm: true,
        thighCm: true,
      },
    }),
    prisma.userProfile.findMany({
      select: {
        userId: true,
        updatedAt: true,
        currentWeightKg: true,
        estimatedBodyFatPercent: true,
        waistCm: true,
        chestCm: true,
        upperArmCm: true,
        thighCm: true,
      },
    }),
  ])

  type LegacyType = keyof typeof legacyBodyMeta
  const insertIfMissing = async (
    userId: string,
    datestr: string,
    type: LegacyType,
    value: number | null,
    origin: 'legacy_daily' | 'legacy_profile',
  ) => {
    if (value === null || !Number.isFinite(value)) return
    const meta = legacyBodyMeta[type]
    await prisma.bodyRecord.upsert({
      where: { userId_datestr_type: { userId, datestr, type } },
      create: {
        userId,
        datestr,
        type,
        value,
        unit: meta.unit,
        label: meta.label,
        labelEn: meta.labelEn,
        origin,
      },
      update: {},
    })
  }

  for (const log of dailyLogs) {
    await insertIfMissing(log.userId, log.date, 'weight', log.morningWeightKg, 'legacy_daily')
    await insertIfMissing(log.userId, log.date, 'weist', log.waistCm, 'legacy_daily')
    await insertIfMissing(log.userId, log.date, 'chest', log.chestCm, 'legacy_daily')
    await insertIfMissing(log.userId, log.date, 'arm_left', log.upperArmCm, 'legacy_daily')
    await insertIfMissing(log.userId, log.date, 'arm_right', log.upperArmCm, 'legacy_daily')
    await insertIfMissing(log.userId, log.date, 'leg_left', log.thighCm, 'legacy_daily')
    await insertIfMissing(log.userId, log.date, 'leg_right', log.thighCm, 'legacy_daily')
  }

  for (const profile of profiles) {
    const datestr = profile.updatedAt.toISOString().slice(0, 10)
    await insertIfMissing(profile.userId, datestr, 'weight', profile.currentWeightKg, 'legacy_profile')
    await insertIfMissing(profile.userId, datestr, 'bodyfat', profile.estimatedBodyFatPercent, 'legacy_profile')
    await insertIfMissing(profile.userId, datestr, 'weist', profile.waistCm, 'legacy_profile')
    await insertIfMissing(profile.userId, datestr, 'chest', profile.chestCm, 'legacy_profile')
    await insertIfMissing(profile.userId, datestr, 'arm_left', profile.upperArmCm, 'legacy_profile')
    await insertIfMissing(profile.userId, datestr, 'arm_right', profile.upperArmCm, 'legacy_profile')
    await insertIfMissing(profile.userId, datestr, 'leg_left', profile.thighCm, 'legacy_profile')
    await insertIfMissing(profile.userId, datestr, 'leg_right', profile.thighCm, 'legacy_profile')
  }
}

async function ensureJsonColumns(table: string, columns: string[]): Promise<void> {
  const existingColumns = await prisma.$queryRawUnsafe<TableColumn[]>(`PRAGMA table_info("${table}")`)
  const columnNames = new Set(existingColumns.map((column) => column.name))

  for (const column of columns) {
    if (!columnNames.has(column)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${column}" TEXT NOT NULL DEFAULT '[]'`)
    }
  }
}

export async function ensureDatabaseSchema(): Promise<void> {
  for (const [index, statement] of statements.entries()) {
    await prisma.$executeRawUnsafe(statement)
    if (index === 0) {
      await ensureUserIdentityColumns()
    }
    if (statement.includes('CREATE TABLE IF NOT EXISTS "UserProfile"')) {
      await ensureUserProfileCurrentColumns()
    }
    if (statement.includes('CREATE TABLE IF NOT EXISTS "UserPreference"')) {
      await ensureUserPreferenceRuleColumns()
    }
    if (statement.includes('CREATE TABLE IF NOT EXISTS "WorkoutPlan"')) {
      await ensureJsonColumns('WorkoutPlan', ['cardioJson'])
    }
    if (statement.includes('CREATE TABLE IF NOT EXISTS "WorkoutTemplate"')) {
      await ensureJsonColumns('WorkoutTemplate', ['cardioJson'])
    }
    if (statement.includes('CREATE TABLE IF NOT EXISTS "WorkoutLog"')) {
      await ensureJsonColumns('WorkoutLog', ['cardioJson'])
    }
  }
  await migrateLegacyBodyRecords()
}
