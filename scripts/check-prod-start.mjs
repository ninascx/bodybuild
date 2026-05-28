import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => {
        if (address && typeof address === 'object') {
          resolve(address.port)
        } else {
          reject(new Error('Unable to allocate a local port'))
        }
      })
    })
  })
}

async function waitForHealth(baseUrl, child) {
  const startedAt = Date.now()
  let lastError = null
  while (Date.now() - startedAt < 10_000) {
    if (child.exitCode !== null) {
      throw new Error(`Production server exited early with code ${child.exitCode}`)
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      if (response.ok) return response.json()
      lastError = new Error(`health returned ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw lastError instanceof Error ? lastError : new Error('Timed out waiting for health check')
}

function assertNoStore(response, label) {
  const cacheControl = response.headers.get('cache-control') ?? ''
  if (!cacheControl.toLowerCase().includes('no-store')) {
    throw new Error(`${label} must return Cache-Control: no-store, got "${cacheControl}"`)
  }
}

async function fetchOk(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  return response.text()
}

async function checkServiceWorkerDoesNotCacheApi() {
  const swPath = path.join(process.cwd(), 'dist', 'sw.js')
  const sw = await readFile(swPath, 'utf8')
  if (sw.includes('api-cache') || sw.includes('/api/')) {
    throw new Error('Built service worker must not cache API responses')
  }
}

async function seedAdmin(databaseUrl) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
  try {
    await prisma.user.upsert({
      where: { username: 'admin' },
      create: {
        username: 'admin',
        email: 'admin',
        displayName: '管理员',
        passwordHash: await bcrypt.hash('admin-pass', 8),
        role: 'admin',
      },
      update: {
        passwordHash: await bcrypt.hash('admin-pass', 8),
        role: 'admin',
        isActive: true,
      },
    })
  } finally {
    await prisma.$disconnect()
  }
}

function cookieFrom(response) {
  const setCookie = response.headers.get('set-cookie')
  if (!setCookie) throw new Error('Login did not return a session cookie')
  return setCookie.split(';')[0]
}

function assertCookieSecure(response, expectedSecure, label) {
  const setCookie = response.headers.get('set-cookie') ?? ''
  const hasSecure = /;\s*Secure(?:;|$)/i.test(setCookie)
  if (hasSecure !== expectedSecure) {
    throw new Error(`${label} Secure cookie expected ${expectedSecure}, got "${setCookie}"`)
  }
}

async function postJson(url, body, cookie) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${await response.text()}`)
  }
  return response
}

async function putJson(url, body, cookie) {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${await response.text()}`)
  }
  return response
}

async function getJson(url, cookie) {
  const response = await fetch(url, {
    headers: {
      Cookie: cookie,
    },
  })
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${await response.text()}`)
  }
  assertNoStore(response, url)
  return response.json()
}

async function login(baseUrl, username, password) {
  const response = await postJson(`${baseUrl}/api/auth/login`, { username, password })
  return cookieFrom(response)
}

async function checkCookieSecurity(baseUrl) {
  const httpLogin = await postJson(`${baseUrl}/api/auth/login`, { username: 'admin', password: 'admin-pass' })
  assertCookieSecure(httpLogin, false, 'plain HTTP login')

  const httpsForwarded = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-Proto': 'https',
    },
    body: JSON.stringify({ username: 'admin', password: 'admin-pass' }),
  })
  if (!httpsForwarded.ok) throw new Error(`forwarded HTTPS login returned ${httpsForwarded.status}`)
  assertCookieSecure(httpsForwarded, true, 'forwarded HTTPS login')
}

async function checkForwardedLoginLimit(baseUrl) {
  const attempt = (forwardedFor) =>
    fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': forwardedFor,
      },
      body: JSON.stringify({ username: 'proxycheck', password: 'wrong-password' }),
    })

  for (let index = 0; index < 5; index += 1) {
    const response = await attempt('198.51.100.10')
    if (response.status !== 401) {
      throw new Error(`Expected 401 before login limit, got ${response.status}`)
    }
  }
  const limited = await attempt('198.51.100.10')
  if (limited.status !== 429) {
    throw new Error(`Expected 429 after login limit, got ${limited.status}`)
  }
  const differentIp = await attempt('198.51.100.11')
  if (differentIp.status !== 401) {
    throw new Error(`Expected forwarded IP to isolate login limit, got ${differentIp.status}`)
  }
}

async function checkJsonBodyLimit(baseUrl) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'admin',
      password: 'x'.repeat(32_000),
    }),
  })
  assertNoStore(response, '/api/auth/login body limit')
  if (response.status !== 413) {
    throw new Error(`Expected 413 for oversized JSON body, got ${response.status}: ${await response.text()}`)
  }
  const payload = await response.json()
  if (typeof payload.error !== 'string' || !payload.error.includes('接收上限')) {
    throw new Error(`Oversized JSON body should return a friendly JSON error: ${JSON.stringify(payload)}`)
  }
}

async function checkFiveUserBusinessFlow(baseUrl) {
  const adminCookie = await login(baseUrl, 'admin', 'admin-pass')
  const users = Array.from({ length: 5 }, (_, index) => ({
    username: `member${index + 1}`,
    password: `member-pass-${index + 1}`,
  }))

  await Promise.all(
    users.map((user) =>
      postJson(
        `${baseUrl}/api/admin/users`,
        {
          username: user.username,
          displayName: user.username,
          password: user.password,
          role: 'member',
        },
        adminCookie,
      ),
    ),
  )

  await Promise.all(
    users.map(async (user, index) => {
      const cookie = await login(baseUrl, user.username, user.password)
      const date = `2026-05-${String(20 + index).padStart(2, '0')}`
      await Promise.all([
        putJson(
          `${baseUrl}/api/daily-logs/${date}`,
          {
            date,
            morningWeightKg: 80 - index,
            calories: 2200 + index * 25,
            protein: 150,
            steps: 8000 + index * 100,
            sleepHours: 7,
            trained: true,
            workoutCompletion: 100,
          },
          cookie,
        ),
        putJson(
          `${baseUrl}/api/workout-logs/${date}`,
          {
            date,
            workoutName: `并发训练 ${index + 1}`,
            exercises: [
              {
                exerciseId: `bench-${index + 1}`,
                name: '卧推',
                target: '3 组 × 8-12 次',
                sets: [{ weight: 60 + index, reps: 8, rir: 2 }],
              },
            ],
          },
          cookie,
        ),
      ])
      const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } })
      if (!me.ok) throw new Error(`/api/auth/me returned ${me.status}`)
      assertNoStore(me, '/api/auth/me')

      const appData = await getJson(`${baseUrl}/api/app-data`, cookie)
      const dailyDates = appData.dailyLogs?.map((log) => log.date) ?? []
      const workoutNames = appData.workoutLogs?.map((log) => log.workoutName) ?? []
      if (dailyDates.length !== 1 || dailyDates[0] !== date) {
        throw new Error(`${user.username} data isolation failed for daily logs: ${dailyDates.join(',')}`)
      }
      if (workoutNames.length !== 1 || workoutNames[0] !== `并发训练 ${index + 1}`) {
        throw new Error(`${user.username} data isolation failed for workout logs: ${workoutNames.join(',')}`)
      }
    }),
  )
}

async function checkSqliteBackup(baseUrl, adminCookie) {
  const response = await postJson(`${baseUrl}/api/admin/backup`, {}, adminCookie)
  const payload = await response.json()
  if (typeof payload.path !== 'string' || !payload.path.endsWith('.db')) {
    throw new Error(`Backup response did not include a SQLite db path: ${JSON.stringify(payload)}`)
  }
  if (typeof payload.sizeBytes !== 'number' || payload.sizeBytes <= 0) {
    throw new Error(`Backup response did not include a positive size: ${JSON.stringify(payload)}`)
  }
  if (payload.retainedCount > payload.keepCount) {
    throw new Error(`Backup retention exceeded keep count: ${JSON.stringify(payload)}`)
  }
  const backupStats = await stat(payload.path)
  if (!backupStats.isFile() || backupStats.size <= 0) {
    throw new Error(`Backup file is empty or missing: ${payload.path}`)
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${payload.path.replaceAll('\\', '/')}`,
      },
    },
  })
  try {
    const [userCount, dailyCount, workoutCount] = await Promise.all([
      prisma.user.count(),
      prisma.dailyLog.count(),
      prisma.workoutLog.count(),
    ])
    if (userCount < 6 || dailyCount < 5 || workoutCount < 5) {
      throw new Error(`Backup content incomplete: users=${userCount}, daily=${dailyCount}, workouts=${workoutCount}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  const port = await findFreePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tempDir = await mkdtemp(path.join(tmpdir(), 'bodybuild-prod-check-'))
  const databaseUrl = `file:${path.join(tempDir, 'bodybuild.db').replaceAll('\\', '/')}`
  const child = spawn(process.execPath, ['dist-server/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NODE_OPTIONS: process.env.NODE_OPTIONS ?? '--max-old-space-size=384',
      BODYBUILD_BCRYPT_ROUNDS: process.env.BODYBUILD_BCRYPT_ROUNDS ?? '10',
      PORT: String(port),
      BODYBUILD_BIND: '127.0.0.1',
      BODYBUILD_JSON_LIMIT: '16kb',
      DATABASE_URL: databaseUrl,
      BODYBUILD_DATA_FILE: path.join(tempDir, 'bodybuild-data.json'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString()
  })
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })

  try {
    await checkServiceWorkerDoesNotCacheApi()
    await waitForHealth(baseUrl, child)
    await seedAdmin(databaseUrl)
    await checkCookieSecurity(baseUrl)
    const urls = Array.from({ length: 5 }, () => [`${baseUrl}/`, `${baseUrl}/api/health`]).flat()
    await Promise.all(urls.map(fetchOk))
    await checkFiveUserBusinessFlow(baseUrl)
    const adminCookie = await login(baseUrl, 'admin', 'admin-pass')
    await checkSqliteBackup(baseUrl, adminCookie)
    await checkForwardedLoginLimit(baseUrl)
    await checkJsonBodyLimit(baseUrl)
    const healthResponse = await fetch(`${baseUrl}/api/health`)
    if (!healthResponse.ok) throw new Error(`/api/health returned ${healthResponse.status}`)
    assertNoStore(healthResponse, '/api/health')
    const health = await healthResponse.json()
    if (!health.database?.ok) {
      throw new Error('Health check did not confirm database availability')
    }
    console.log(`Production start check passed on ${baseUrl}`)
    console.log('5-user login/write smoke passed')
    console.log('per-user data isolation check passed')
    console.log('SQLite backup checkpoint check passed')
    console.log('forwarded-IP login limit check passed')
    console.log('JSON body limit check passed')
    console.log('cookie secure-mode check passed')
    console.log('service worker API cache check passed')
    console.log(`RSS memory: ${health.memory?.rssMb ?? 'unknown'} MB`)
  } catch (error) {
    console.error('Production start check failed')
    if (stdout.trim()) console.error(`stdout:\n${stdout.trim()}`)
    if (stderr.trim()) console.error(`stderr:\n${stderr.trim()}`)
    throw error
  } finally {
    child.kill()
    await new Promise((resolve) => child.once('close', resolve))
    await rm(tempDir, { recursive: true, force: true })
  }
}

await main()
