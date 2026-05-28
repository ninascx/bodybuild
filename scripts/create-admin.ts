import { cloneDefaultPlanToUser } from '../server/appData'
import { hashPassword } from '../server/auth'
import { prisma } from '../server/db'
import { ensureDatabaseSchema } from '../server/ensureDatabase'

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
}

const username = (process.env.ADMIN_USERNAME ?? readArg('username') ?? process.env.ADMIN_EMAIL ?? readArg('email') ?? '').trim().toLowerCase()
const displayName = (process.env.ADMIN_NAME ?? readArg('name') ?? username ?? '管理员').trim()
const password = process.env.ADMIN_PASSWORD ?? readArg('password') ?? ''

if (!username || !password) {
  console.error('Usage: ADMIN_USERNAME=你的昵称 ADMIN_PASSWORD=secret npm run admin:create')
  console.error('Or: npm run admin:create -- --username=你的昵称 --password=secret --name=管理员')
  process.exit(1)
}

await ensureDatabaseSchema()

const user = await prisma.user.upsert({
  where: { username },
  create: {
    username,
    email: username,
    displayName,
    passwordHash: await hashPassword(password),
    role: 'admin',
  },
  update: {
    displayName,
    email: username,
    passwordHash: await hashPassword(password),
    role: 'admin',
    isActive: true,
  },
})

await cloneDefaultPlanToUser(user.id)

console.log(`Admin ready: ${user.username} (${user.id})`)
await prisma.$disconnect()
