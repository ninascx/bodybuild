import bcrypt from 'bcrypt'
import { prisma } from '../server/db'
import { ensureDatabaseSchema } from '../server/ensureDatabase'

async function createAdmin() {
  await ensureDatabaseSchema()

  const existing = await prisma.user.findUnique({
    where: { username: 'adm' }
  })

  if (existing) {
    console.log('用户 adm 已存在')
    return
  }

  const passwordHash = await bcrypt.hash('adm', 10)

  await prisma.user.create({
    data: {
      id: `user_${Date.now()}`,
      username: 'adm',
      email: 'admin@bodybuild.local',
      displayName: '管理员',
      passwordHash,
      role: 'admin',
      isActive: true,
      updatedAt: new Date()
    }
  })

  console.log('✅ 管理员账号创建成功！')
  console.log('用户名: adm')
  console.log('密码: adm')
}

createAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
