import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const kib = 1024
const root = process.cwd()
const distDir = path.join(root, 'dist')
const assetsDir = path.join(distDir, 'assets')

const budgets = {
  mainJs: 108 * kib,
  mainCss: 15 * kib,
  dailyRecordTab: 7 * kib,
  workoutTab: 24 * kib,
  analyticsShell: 2 * kib,
  weeklyTab: 3 * kib,
  dashboardTab: 118 * kib,
  exportDialog: 6 * kib,
  settingsTab: 6 * kib,
  adminUsersTab: 9 * kib,
}

function formatKib(bytes) {
  return `${(bytes / kib).toFixed(2)} KiB`
}

function gzipSize(buffer) {
  return gzipSync(buffer).length
}

async function readAsset(fileName) {
  return readFile(path.join(assetsDir, fileName))
}

async function findAssetByPrefix(prefix, extension) {
  const files = await readdir(assetsDir)
  const fileName = files.find((file) => file.startsWith(prefix) && file.endsWith(extension))
  if (!fileName) {
    throw new Error(`Missing built asset matching ${prefix}*${extension}`)
  }
  return fileName
}

function findHtmlAsset(html, pattern, label) {
  const match = html.match(pattern)
  if (!match?.[1]) {
    throw new Error(`Unable to find ${label} asset in dist/index.html`)
  }
  return path.basename(match[1])
}

function assertBudget(label, actual, budget) {
  if (actual > budget) {
    throw new Error(`${label} is ${formatKib(actual)}, budget is ${formatKib(budget)}`)
  }
}

async function measure(label, fileName, budget) {
  const size = gzipSize(await readAsset(fileName))
  assertBudget(label, size, budget)
  return { label, fileName, size, budget }
}

const html = await readFile(path.join(distDir, 'index.html'), 'utf8')
const mainJs = findHtmlAsset(html, /<script[^>]+src="([^"]+index-[^"]+\.js)"/, 'main JS')
const mainCss = findHtmlAsset(html, /<link[^>]+href="([^"]+index-[^"]+\.css)"/, 'main CSS')

const results = [
  await measure('main JS gzip', mainJs, budgets.mainJs),
  await measure('main CSS gzip', mainCss, budgets.mainCss),
  await measure('daily record tab gzip', await findAssetByPrefix('DailyRecordTab-', '.js'), budgets.dailyRecordTab),
  await measure('workout tab gzip', await findAssetByPrefix('WorkoutTab-', '.js'), budgets.workoutTab),
  await measure('analytics shell gzip', await findAssetByPrefix('AnalyticsTab-', '.js'), budgets.analyticsShell),
  await measure('weekly tab gzip', await findAssetByPrefix('WeeklyTab-', '.js'), budgets.weeklyTab),
  await measure('dashboard tab gzip', await findAssetByPrefix('DashboardTab-', '.js'), budgets.dashboardTab),
  await measure('export dialog gzip', await findAssetByPrefix('ExportDataDialog-', '.js'), budgets.exportDialog),
  await measure('settings tab gzip', await findAssetByPrefix('SettingsTab-', '.js'), budgets.settingsTab),
  await measure('admin users tab gzip', await findAssetByPrefix('AdminUsersTab-', '.js'), budgets.adminUsersTab),
]

console.log('Bundle budget passed')
for (const result of results) {
  console.log(`- ${result.label}: ${formatKib(result.size)} / ${formatKib(result.budget)} (${result.fileName})`)
}
