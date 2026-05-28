import { prisma } from '../server/db'
import { ensureDatabaseSchema } from '../server/ensureDatabase'

await ensureDatabaseSchema()
console.log('Database schema is ready.')
await prisma.$disconnect()
