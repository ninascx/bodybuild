import { strict as assert } from 'node:assert'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'bodybuild-body-records-'))
process.env.DATABASE_URL = `file:${path.join(tempDir, 'migration.db').replaceAll('\\', '/')}`

const { prisma } = await import('../server/db')
const { ensureDatabaseSchema } = await import('../server/ensureDatabase')

try {
  await ensureDatabaseSchema()
  const user = await prisma.user.create({
    data: {
      username: 'migration-check',
      displayName: 'Migration Check',
      passwordHash: 'not-used',
    },
  })
  await prisma.dailyLog.create({
    data: {
      userId: user.id,
      date: '2026-06-01',
      morningWeightKg: 72.4,
      waistCm: 81,
      upperArmCm: 35,
      thighCm: 57,
    },
  })
  await prisma.userProfile.create({
    data: {
      userId: user.id,
      estimatedBodyFatPercent: 16.2,
      upperArmCm: 36,
      thighCm: 58,
      updatedAt: new Date('2026-06-02T08:00:00Z'),
    },
  })

  await ensureDatabaseSchema()
  const first = await prisma.bodyRecord.findMany({
    where: { userId: user.id },
    orderBy: [{ datestr: 'asc' }, { type: 'asc' }],
  })
  assert.equal(first.find((record) => record.datestr === '2026-06-01' && record.type === 'weight')?.value, 72.4)
  assert.equal(first.find((record) => record.datestr === '2026-06-01' && record.type === 'weist')?.value, 81)
  assert.equal(first.find((record) => record.datestr === '2026-06-01' && record.type === 'arm_left')?.value, 35)
  assert.equal(first.find((record) => record.datestr === '2026-06-01' && record.type === 'arm_right')?.value, 35)
  assert.equal(first.find((record) => record.datestr === '2026-06-02' && record.type === 'bodyfat')?.value, 16.2)
  assert.equal(first.find((record) => record.datestr === '2026-06-02' && record.type === 'leg_left')?.value, 58)
  assert.equal(first.find((record) => record.datestr === '2026-06-02' && record.type === 'leg_right')?.value, 58)

  await ensureDatabaseSchema()
  assert.equal(await prisma.bodyRecord.count({ where: { userId: user.id } }), first.length)
  console.log(`BodyRecord migration checks passed (${first.length} records).`)
} finally {
  await prisma.$disconnect()
  await rm(tempDir, { recursive: true, force: true })
}
