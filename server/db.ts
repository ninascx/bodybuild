import { PrismaClient } from '@prisma/client'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

process.env.DATABASE_URL ??= `file:${path.join(projectRoot, 'data', 'bodybuild.db').replaceAll('\\', '/')}`

export const prisma = new PrismaClient()

export async function configureDatabaseRuntime(): Promise<void> {
  await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL')
  await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL')
  await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000')
  await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON')
}
