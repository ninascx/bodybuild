import { buildExportCsvText, buildExportResultSummary, buildExportSummaryText, buildScopedExportPayload, type ExportFormat, type ExportOptions } from '../../lib/exportPayload'
import {
  type AdminUser,
  type AppData,
  createAdminSqliteBackup,
  downloadCsv,
  downloadJson,
  downloadText,
  exportAdminUserData,
} from '../../lib/storage'

function latestDate(items: Array<{ date: string }>): string {
  return items.reduce((latest, item) => (item.date > latest ? item.date : latest), '')
}

export function latestDataDate(data: AppData): string {
  return [latestDate(data.dailyLogs), latestDate(data.workoutLogs)].reduce(
    (latest, date) => (date > latest ? date : latest),
    '',
  )
}

function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined) return '未知大小'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', 'true')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
    return true
  } catch (error) {
    console.warn('写入剪贴板失败：', error)
    return false
  }
}

export function buildLoginCredentialText(username: string, password: string, displayName?: string): string {
  return [
    '训练记录网站登录信息',
    displayName ? `用户：${displayName}` : '',
    `登录地址：${window.location.origin}`,
    `昵称：${username}`,
    `密码：${password}`,
    '首次登录后请先进入“个人”页确认目标和身体属性。',
  ]
    .filter(Boolean)
    .join('\n')
}

function randomIndex(max: number): number {
  const buffer = new Uint32Array(1)
  window.crypto.getRandomValues(buffer)
  return buffer[0] % max
}

export function generatePassword(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%+-'
  const pool = `${letters}${digits}${symbols}`
  const required = [
    letters[randomIndex(letters.length)],
    digits[randomIndex(digits.length)],
    symbols[randomIndex(symbols.length)],
  ]
  const chars = Array.from({ length: 11 }, () => pool[randomIndex(pool.length)]).concat(required)
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1)
    ;[chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]]
  }
  return chars.join('')
}

export async function createAdminBackupMessage(): Promise<string> {
  const result = await createAdminSqliteBackup()
  const retained = result.retainedCount !== undefined && result.keepCount !== undefined
    ? `当前保留 ${result.retainedCount}/${result.keepCount} 个备份`
    : '备份保留数量未知'
  return `SQLite 备份已创建：${formatFileSize(result.sizeBytes)}，${retained}。${result.path}`
}

export async function exportAdminUserDataWithOptions({
  user,
  options,
  format = 'json',
  anchorDate,
}: {
  user: AdminUser
  options: ExportOptions
  format?: ExportFormat
  anchorDate: string
}): Promise<string> {
  const payload = await exportAdminUserData(user.id)
  const scopedPayload = buildScopedExportPayload(payload, options, anchorDate)
  const scope = scopedPayload.exportScope
  const rangeLabel = scope.startDate && scope.endDate ? `${scope.startDate}-${scope.endDate}` : 'all'

  if (format === 'copySummary') {
    const ok = await writeToClipboard(buildExportSummaryText(scopedPayload))
    if (!ok) throw new Error('复制摘要失败，请检查浏览器剪贴板权限。')
  } else if (format === 'summary') {
    downloadText(buildExportSummaryText(scopedPayload), `bodybuild-summary-${user.username}-${rangeLabel}`, scopedPayload.exportedAt)
  } else if (format === 'csv') {
    downloadCsv(buildExportCsvText(scopedPayload), `bodybuild-table-${user.username}-${rangeLabel}`, scopedPayload.exportedAt)
  } else {
    downloadJson(scopedPayload, `bodybuild-user-${user.username}-${rangeLabel}`)
  }

  const actionLabel = format === 'copySummary' ? '复制摘要' : format === 'summary' ? '导出摘要' : format === 'csv' ? '导出 CSV' : '导出'
  return `用户数据已${actionLabel}：${buildExportResultSummary(scopedPayload, format)}。`
}
