import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
p.user.findMany({
  select: { id: true, email: true, name: true, role: true, password: true, createdAt: true }
}).then((users) => {
  console.log('Users in database:', users.length)
  for (const u of users) {
    const hasPassword = !!u.password && u.password.length > 0
    const isBcrypt = u.password?.startsWith('$2a$') || u.password?.startsWith('$2b$')
    const pwdStatus = hasPassword ? (isBcrypt ? 'bcrypt ✓' : 'plain-text (will auto-migrate)') : '❌ NONE'
    console.log(`  ${u.email.padEnd(35)} | ${(u.name || '(no name)').padEnd(20)} | ${u.role.padEnd(10)} | password: ${pwdStatus}`)
  }
  return p.$disconnect()
}).catch((e) => { console.error(e); process.exit(1) })
