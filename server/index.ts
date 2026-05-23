import express from 'express'
import { copyFile, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ServerData } from '../src/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const port = Number(process.env.PORT ?? 8787)
const dataFile = path.resolve(process.env.BODYBUILD_DATA_FILE ?? path.join(projectRoot, 'data', 'bodybuild-data.json'))
const distDir = path.join(projectRoot, 'dist')
const BACKUP_KEEP = 7

const emptyData = (): ServerData => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  dailyLogs: [],
  workoutLogs: [],
  taskChecks: {},
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
    typeof payload.taskChecks !== 'object' ||
    payload.taskChecks === null ||
    (payload.workoutTemplates !== undefined && !Array.isArray(payload.workoutTemplates))
  ) {
    throw new Error('Invalid data payload')
  }

  return {
    version: 1,
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
    dailyLogs: payload.dailyLogs,
    workoutLogs: payload.workoutLogs,
    taskChecks: payload.taskChecks,
    workoutTemplates: payload.workoutTemplates ?? [],
  }
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

app.use(express.json({ limit: '5mb' }))

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    dataFile,
  })
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

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'API endpoint not found' })
})

app.use(express.static(distDir))
app.get(/.*/, (_request, response) => {
  response.sendFile(path.join(distDir, 'index.html'))
})

await ensureDataFile()

app.listen(port, '0.0.0.0', () => {
  console.log(`Bodybuild tracker listening on http://127.0.0.1:${port}`)
  console.log(`Data file: ${dataFile}`)
})
