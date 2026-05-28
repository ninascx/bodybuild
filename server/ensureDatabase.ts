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
  `CREATE TABLE IF NOT EXISTS "WorkoutLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "workoutName" TEXT NOT NULL,
    "exercisesJson" TEXT NOT NULL DEFAULT '[]',
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
  ]

  for (const [column, type] of columnsToAdd) {
    if (!columnNames.has(column)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "UserPreference" ADD COLUMN "${column}" ${type}`)
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
  }
}
