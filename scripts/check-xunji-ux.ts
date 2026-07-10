import assert from 'node:assert/strict'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const dbPath = join(tmpdir(), `bodybuild-xunji-ux-${process.pid}.db`)
process.env.DATABASE_URL = `file:${dbPath.replaceAll('\\', '/')}`
process.env.XUNJI_DATA_REQUEST_INTERVAL_MS = '0'

let fetchCalls = 0
let bodyQueryInvalid = true

globalThis.fetch = async (input, init) => {
  fetchCalls += 1
  const url = String(input)
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : {}

  if (url.endsWith('/open/body/query_gzip') && bodyQueryInvalid) {
    return Response.json({ success: false, message: 'apikey invalid' })
  }
  if (url.endsWith('/open/body/query_gzip')) {
    return Response.json({ success: true, res: { records: [] } })
  }
  if (url.endsWith('/open/body/upsert_gzip') && body.dry_run === true) {
    return Response.json({ success: true, res: { summary: '1 项身体数据通过校验' } })
  }
  if (url.endsWith('/open/body/upsert_gzip')) {
    return Response.json({
      success: true,
      res: {
        records: [{
          datestr: '2026-06-30',
          type: 'weight',
          value: 72.5,
          unit: 'kg',
          label: '体重',
          label_en: 'Weight',
        }],
      },
    })
  }
  if (url.endsWith('/open/food/query_gzip')) {
    return Response.json({
      success: true,
      res: { summary: { calories: 2300, protein: 168, carbs: 250, fat: 70 } },
    })
  }
  if (url.endsWith('/api_trains_for_llm_v2')) {
    return Response.json({ res: { trains: [] } })
  }
  return Response.json({ success: false, message: `unexpected mock URL: ${url}` }, { status: 500 })
}

const { prisma } = await import('../server/db')
const { ensureDatabaseSchema } = await import('../server/ensureDatabase')
const {
  commitXunjiBodyMutation,
  commitXunjiDailySync,
  extractXunjiFoodSummary,
  getXunjiConnections,
  previewXunjiBodyMutation,
  previewXunjiDailySync,
  saveLocalBodyRecords,
  validateAndSaveXunjiConnection,
} = await import('../server/xunjiData')

try {
  assert.deepEqual(
    extractXunjiFoodSummary(
      { days: [{ date: '2026-06-30', ntr: { cal: 2300, protein: 168, carb: 250, fat: 70 } }] },
      '2026-06-30',
    ),
    { calories: 2300, protein: 168, carbs: 250, fat: 70 },
  )
  assert.deepEqual(
    extractXunjiFoodSummary(
      {
        days: [{
          datestr: '2026-07-01',
          totals: { totalProtein: 157.76, totalCarb: 114.22, totalFat: 69.68, totalCal: 1725.4 },
        }],
      },
      '2026-07-01',
    ),
    { calories: 1725.4, protein: 157.76, carbs: 114.22, fat: 69.68 },
  )
  assert.deepEqual(
    extractXunjiFoodSummary(
      [{ datestr: '2026-06-30', total_ntr: { kcal: '2100', protein: '150', carbohydrates: '220' } }],
      '2026-06-30',
    ),
    { calories: 2100, protein: 150, carbs: 220 },
  )
  assert.deepEqual(
    extractXunjiFoodSummary(
      [
        { date: '2026-06-30', amount: 150, unit: 'g', ntr: { cal: 100, protein: 20 } },
        { date: '2026-06-30', amount: 50, unit: 'g', ntr: { cal: 200 } },
      ],
      '2026-06-30',
    ),
    { calories: 250, protein: 30 },
    'missing nutrients must stay absent instead of being imported as zero',
  )

  await ensureDatabaseSchema()
  await ensureDatabaseSchema()
  const preferenceColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    'PRAGMA table_info("UserPreference")',
  )
  const preferenceColumnNames = new Set(preferenceColumns.map((column) => column.name))
  assert.ok(preferenceColumnNames.has('xunjiOpenValidatedAt'))
  assert.ok(preferenceColumnNames.has('xunjiFoodValidatedAt'))
  assert.ok(preferenceColumnNames.has('xunjiBodyValidatedAt'))
  const user = await prisma.user.create({
    data: {
      id: 'ux-check-user',
      username: 'ux-check-user',
      displayName: 'UX Check',
      passwordHash: 'not-used',
      role: 'member',
      updatedAt: new Date(),
    },
  })

  const mockBodyKey = ['xjbody_', '12345678901234567890'].join('')
  const mockFoodKey = ['xjfood_', '12345678901234567890'].join('')
  const mockTrainingKey = ['xjllm_', '12345678901234567890'].join('')
  const beforeInvalidPrefix = fetchCalls
  await assert.rejects(
    validateAndSaveXunjiConnection(user.id, 'food', { apiKey: mockBodyKey }),
    /xjfood_/,
  )
  assert.equal(fetchCalls, beforeInvalidPrefix, 'invalid prefix must not call upstream')

  const trainingConnections = await validateAndSaveXunjiConnection(user.id, 'training', {
    apiKey: mockTrainingKey,
  })
  assert.equal(trainingConnections.training.validationStatus, 'valid')

  const foodConnections = await validateAndSaveXunjiConnection(user.id, 'food', {
    apiKey: mockFoodKey,
  })
  assert.equal(foodConnections.food.validationStatus, 'valid')
  assert.equal(foodConnections.food.source, 'account')
  assert.ok(foodConnections.food.validatedAt)

  await prisma.userPreference.update({
    where: { userId: user.id },
    data: { xunjiBodyApiKey: mockBodyKey },
  })
  const connections = await getXunjiConnections(user.id)
  assert.equal(connections.body.validationStatus, 'unverified')
  assert.deepEqual(connections.body.capabilities, ['read', 'write'])

  const dailyPreview = await previewXunjiDailySync(user.id, '2026-06-30', { food: true, body: true })
  assert.equal(dailyPreview.sources.food.status, 'ready')
  assert.equal(dailyPreview.sources.body.status, 'unavailable')
  assert.equal(dailyPreview.sources.food.changes[0]?.unit, 'kcal')

  const dailyCommit = await commitXunjiDailySync(user.id, {
    confirmed: true,
    previewId: dailyPreview.previewId,
    foodFields: ['calories', 'protein'],
    bodyTypes: [],
  })
  assert.equal(dailyCommit.results.food.count, 2)
  assert.equal(dailyCommit.results.body.count, 0)

  const previousSync = '2026-06-29T12:00:00.000Z'
  const local = await saveLocalBodyRecords(user.id, {
    records: [{
      datestr: '2026-06-30',
      type: 'weight',
      value: 72.4,
      unit: 'kg',
      label: '体重',
      label_en: 'Weight',
      synced_at: previousSync,
    }],
  })
  assert.equal(local[0]?.origin, 'local')
  assert.equal(local[0]?.synced_at, previousSync)

  bodyQueryInvalid = false
  const requestId = 'ux-body-batch'
  const bodyPreview = await previewXunjiBodyMutation(user.id, {
    client_request_id: requestId,
    records: local,
  })
  assert.equal(bodyPreview.preview, true)
  assert.equal(bodyPreview.retryAfterMs, 0)

  const bodyCommit = await commitXunjiBodyMutation(user.id, {
    client_request_id: requestId,
    confirmed: true,
    records: local,
  })
  assert.equal(bodyCommit.bodyRecords?.[0]?.value, 72.5)
  assert.equal(bodyCommit.bodyRecords?.[0]?.origin, 'xunji')
  assert.ok(bodyCommit.bodyRecords?.[0]?.synced_at)

  const appSource = readFileSync(join(process.cwd(), 'src', 'App.tsx'), 'utf8')
  const updateBodyBlock = appSource.slice(
    appSource.indexOf('function updateBodyRecord'),
    appSource.indexOf('function applyXunjiBodySync'),
  )
  assert.doesNotMatch(updateBodyBlock, /previewXunji|commitXunji|fetchXunji/)

  const numberFieldSource = readFileSync(join(process.cwd(), 'src', 'components', 'NumberField.tsx'), 'utf8')
  assert.match(numberFieldSource, /aria-label=\{`减少\$\{label\}`\}/)
  assert.match(numberFieldSource, /h-11 w-11/)

  const settingsSource = readFileSync(
    join(process.cwd(), 'src', 'components', 'profile', 'XunjiDataSettings.tsx'),
    'utf8',
  )
  assert.doesNotMatch(settingsSource, /window\.confirm/)

  console.log('Xunji UX checks passed')
} finally {
  await prisma.$disconnect()
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const target = `${dbPath}${suffix}`
    if (existsSync(target)) rmSync(target, { force: true })
  }
}
