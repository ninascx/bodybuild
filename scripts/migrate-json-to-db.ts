import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { cloneDefaultPlanToUser, upsertDailyLog, upsertWorkoutLog } from '../server/appData'
import { prisma } from '../server/db'
import { ensureDatabaseSchema } from '../server/ensureDatabase'
import type { ServerData, WorkoutTemplate } from '../src/types'

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
}

function validateServerData(value: unknown): ServerData {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid JSON data')
  }
  const payload = value as Partial<ServerData>
  if (!Array.isArray(payload.dailyLogs) || !Array.isArray(payload.workoutLogs)) {
    throw new Error('Invalid JSON data')
  }
  return {
    version: 1,
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
    dailyLogs: payload.dailyLogs,
    workoutLogs: payload.workoutLogs,
    workoutTemplates: Array.isArray(payload.workoutTemplates) ? payload.workoutTemplates : [],
  }
}

const adminUsername = (process.env.ADMIN_USERNAME ?? readArg('username') ?? process.env.ADMIN_EMAIL ?? readArg('email') ?? '').trim().toLowerCase()
const inputFile = path.resolve(
  process.env.BODYBUILD_DATA_FILE ?? readArg('file') ?? path.join(process.cwd(), 'data', 'bodybuild-data.json'),
)

if (!adminUsername) {
  console.error('Usage: ADMIN_USERNAME=你的昵称 npm run data:migrate')
  console.error('Or: npm run data:migrate -- --username=你的昵称 --file=data/bodybuild-data.json')
  process.exit(1)
}

await ensureDatabaseSchema()

const admin = await prisma.user.findUnique({ where: { username: adminUsername } })
if (!admin) {
  throw new Error(`Admin user not found: ${adminUsername}`)
}

const raw = await readFile(inputFile, 'utf8')
const data = validateServerData(JSON.parse(raw))

await cloneDefaultPlanToUser(admin.id)

for (const log of data.dailyLogs) {
  await upsertDailyLog(admin.id, log)
}

for (const log of data.workoutLogs) {
  await upsertWorkoutLog(admin.id, log)
}

const customTemplates = data.workoutTemplates.filter((template): template is WorkoutTemplate => !template.isBuiltin)
for (const template of customTemplates) {
  await prisma.workoutTemplate.upsert({
    where: { id: template.id },
    create: {
      id: template.id,
      userId: admin.id,
      name: template.name,
      focus: template.focus,
      category: template.category,
      exercisesJson: JSON.stringify(template.exercises ?? []),
      isBuiltin: false,
    },
    update: {
      userId: admin.id,
      name: template.name,
      focus: template.focus,
      category: template.category,
      exercisesJson: JSON.stringify(template.exercises ?? []),
      isBuiltin: false,
    },
  })
}

console.log(`Migrated ${data.dailyLogs.length} daily logs, ${data.workoutLogs.length} workout logs, ${customTemplates.length} templates to ${admin.username}`)
await prisma.$disconnect()
