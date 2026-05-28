import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Badge, Button, Card, EmptyState, Field, InsightCard, LoadingBlock, MetricGrid, StatusMessage, TextInput } from '../components/ui'
import { ExportDataDialog } from '../components/ExportDataDialog'
import { formatDateInput } from '../lib/dates'
import { buildExportCsvText, buildExportResultSummary, buildExportSummaryText, buildScopedExportPayload, type ExportFormat, type ExportOptions } from '../lib/exportPayload'
import {
  type AdminUser,
  type AppData,
  type CurrentUser,
  type ServerHealth,
  cloneAdminDefaultPlan,
  createAdminSqliteBackup,
  createAdminUser,
  deleteAdminUserData,
  downloadCsv,
  downloadJson,
  downloadText,
  exportAdminUserData,
  fetchAdminUserAppData,
  fetchServerHealth,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
} from '../lib/storage'

type AdminUsersTabProps = {
  currentUser: CurrentUser
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function latestDate(items: Array<{ date: string }>): string {
  return items.reduce((latest, item) => (item.date > latest ? item.date : latest), '')
}

function latestDataDate(data: AppData): string {
  return [latestDate(data.dailyLogs), latestDate(data.workoutLogs)].reduce(
    (latest, date) => (date > latest ? date : latest),
    '',
  )
}

function formatUptime(totalSeconds: number | undefined): string {
  if (totalSeconds === undefined) return '未知'
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (days > 0) return `${days} 天 ${hours} 小时`
  if (hours > 0) return `${hours} 小时 ${minutes} 分`
  return `${Math.max(0, minutes)} 分钟`
}

function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined) return '未知大小'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function writeToClipboard(text: string): Promise<boolean> {
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

function buildLoginCredentialText(username: string, password: string, displayName?: string): string {
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

function generatePassword(): string {
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

export function AdminUsersTab({ currentUser }: AdminUsersTabProps) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [draftNames, setDraftNames] = useState<Record<string, string>>({})
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({})
  const [newUsername, setNewUsername] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<CurrentUser['role']>('member')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedData, setSelectedData] = useState<AppData | null>(null)
  const [exportTarget, setExportTarget] = useState<AdminUser | null>(null)
  const [exportSourceData, setExportSourceData] = useState<AppData | null>(null)
  const [exportAnchorDate, setExportAnchorDate] = useState<string>(() => formatDateInput())
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null)
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [backupBusy, setBackupBusy] = useState(false)
  const [exportPending, setExportPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  )

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    setError('')
    try {
      const nextUsers = await listAdminUsers()
      setUsers(nextUsers)
      setDraftNames(Object.fromEntries(nextUsers.map((user) => [user.id, user.displayName])))
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取用户列表失败')
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  const loadHealth = useCallback(async () => {
    setLoadingHealth(true)
    try {
      setServerHealth(await fetchServerHealth())
    } catch (err) {
      setServerHealth({
        ok: false,
        database: {
          ok: false,
          error: err instanceof Error ? err.message : '读取服务状态失败',
        },
      })
    } finally {
      setLoadingHealth(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(loadUsers)
  }, [loadUsers])

  useEffect(() => {
    void Promise.resolve().then(loadHealth)
  }, [loadHealth])

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setError('')
    setMessage('')
    const username = newUsername.trim().toLowerCase()
    const displayName = newDisplayName.trim() || username
    const password = newPassword.trim()
    try {
      await createAdminUser({
        username,
        displayName,
        password,
        role: newRole,
      })
      const copied = await writeToClipboard(buildLoginCredentialText(username, password, displayName))
      setNewUsername('')
      setNewDisplayName('')
      setNewPassword('')
      setNewRole('member')
      setMessage(copied ? '用户已创建，登录信息已复制。' : '用户已创建；请手动发送昵称和初始密码。')
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建用户失败')
    } finally {
      setCreating(false)
    }
  }

  async function patchUser(user: AdminUser, patch: Parameters<typeof updateAdminUser>[1], successMessage: string) {
    setBusyId(user.id)
    setError('')
    setMessage('')
    try {
      await updateAdminUser(user.id, patch)
      setMessage(successMessage)
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新用户失败')
    } finally {
      setBusyId(null)
    }
  }

  async function saveDisplayName(user: AdminUser) {
    const displayName = (draftNames[user.id] ?? '').trim()
    if (!displayName || displayName === user.displayName) return
    await patchUser(user, { displayName }, '显示名称已更新。')
  }

  async function resetPassword(user: AdminUser) {
    const password = (resetPasswords[user.id] ?? '').trim()
    if (!password) {
      setError('请输入新密码。')
      return
    }
    setBusyId(user.id)
    setError('')
    setMessage('')
    try {
      await resetAdminUserPassword(user.id, password)
      const copied = await writeToClipboard(buildLoginCredentialText(user.username, password, user.displayName))
      setResetPasswords((prev) => ({ ...prev, [user.id]: '' }))
      setMessage(copied ? '密码已重置，新的登录信息已复制。' : '密码已重置；请手动发送新的登录信息。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置密码失败')
    } finally {
      setBusyId(null)
    }
  }

  async function loadUserData(user: AdminUser) {
    setSelectedUserId(user.id)
    setSelectedData(null)
    setLoadingData(true)
    setError('')
    try {
      setSelectedData(await fetchAdminUserAppData(user.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取用户数据失败')
    } finally {
      setLoadingData(false)
    }
  }

  async function cloneDefaultPlan(user: AdminUser) {
    setBusyId(user.id)
    setError('')
    setMessage('')
    try {
      await cloneAdminDefaultPlan(user.id)
      setMessage('默认训练计划已复制给该用户。')
      if (selectedUserId === user.id) {
        setSelectedData(await fetchAdminUserAppData(user.id))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '复制默认计划失败')
    } finally {
      setBusyId(null)
    }
  }

  async function createBackup() {
    setBackupBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await createAdminSqliteBackup()
      const retained = result.retainedCount !== undefined && result.keepCount !== undefined
        ? `当前保留 ${result.retainedCount}/${result.keepCount} 个备份`
        : '备份保留数量未知'
      setMessage(`SQLite 备份已创建：${formatFileSize(result.sizeBytes)}，${retained}。${result.path}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建备份失败')
    } finally {
      setBackupBusy(false)
    }
  }

  async function openExportUserDialog(user: AdminUser) {
    setBusyId(user.id)
    setError('')
    setMessage('')
    try {
      const data = selectedUserId === user.id && selectedData
        ? selectedData
        : await fetchAdminUserAppData(user.id)
      setExportTarget(user)
      setExportSourceData(data)
      setExportAnchorDate(latestDataDate(data) || formatDateInput())
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取用户数据失败')
    } finally {
      setBusyId(null)
    }
  }

  async function exportUserData(options: ExportOptions, format: ExportFormat = 'json') {
    if (!exportTarget) return
    setExportPending(true)
    setError('')
    setMessage('')
    try {
      const payload = await exportAdminUserData(exportTarget.id)
      const scopedPayload = buildScopedExportPayload(payload, options, exportAnchorDate)
      const scope = scopedPayload.exportScope
      const rangeLabel = scope.startDate && scope.endDate ? `${scope.startDate}-${scope.endDate}` : 'all'
      if (format === 'copySummary') {
        const ok = await writeToClipboard(buildExportSummaryText(scopedPayload))
        if (!ok) throw new Error('复制摘要失败，请检查浏览器剪贴板权限。')
      } else if (format === 'summary') {
        downloadText(buildExportSummaryText(scopedPayload), `bodybuild-summary-${exportTarget.username}-${rangeLabel}`, scopedPayload.exportedAt)
      } else if (format === 'csv') {
        downloadCsv(buildExportCsvText(scopedPayload), `bodybuild-table-${exportTarget.username}-${rangeLabel}`, scopedPayload.exportedAt)
      } else {
        downloadJson(scopedPayload, `bodybuild-user-${exportTarget.username}-${rangeLabel}`)
      }
      const actionLabel = format === 'copySummary' ? '复制摘要' : format === 'summary' ? '导出摘要' : format === 'csv' ? '导出 CSV' : '导出'
      setMessage(`用户数据已${actionLabel}：${buildExportResultSummary(scopedPayload, format)}。`)
      setExportTarget(null)
      setExportSourceData(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出用户数据失败')
    } finally {
      setExportPending(false)
    }
  }

  async function deleteUserData(user: AdminUser) {
    const ok = window.confirm(`确定清空 ${user.displayName} 的所有记录、计划、资料和偏好吗？账户会保留。`)
    if (!ok) return
    setBusyId(user.id)
    setError('')
    setMessage('')
    try {
      await deleteAdminUserData(user.id)
      setMessage('用户数据已清空，账户仍保留。')
      if (selectedUserId === user.id) {
        setSelectedData(null)
      }
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除用户数据失败')
    } finally {
      setBusyId(null)
    }
  }

  const selectedSummary = selectedData
    ? [
        ['每日记录', selectedData.dailyLogs.length, latestDate(selectedData.dailyLogs)],
        ['训练记录', selectedData.workoutLogs.length, latestDate(selectedData.workoutLogs)],
        ['训练模板', selectedData.workoutTemplates.length, ''],
      ] as const
    : []

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">用户管理</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">创建昵称账户，管理登录状态、角色和密码。</p>
          </div>
          <Button variant="secondary" className="px-3" onClick={() => void loadUsers()} disabled={loadingUsers}>
            刷新
          </Button>
          <Button variant="secondary" className="px-3" onClick={() => void createBackup()} disabled={backupBusy}>
            {backupBusy ? '备份中...' : '创建备份'}
          </Button>
        </div>

        {message ? <StatusMessage className="mt-4" tone="positive">{message}</StatusMessage> : null}
        {error ? <StatusMessage className="mt-4" tone="danger">{error}</StatusMessage> : null}

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">服务状态</p>
              <Badge tone={serverHealth?.ok && serverHealth.database?.ok ? 'positive' : 'danger'}>
                {serverHealth?.ok && serverHealth.database?.ok ? '正常' : loadingHealth ? '检查中' : '异常'}
              </Badge>
            </div>
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => void loadHealth()} disabled={loadingHealth}>
              {loadingHealth ? '刷新中...' : '刷新状态'}
            </Button>
          </div>
          <MetricGrid className="mt-3 lg:grid-cols-4">
            <InsightCard title="数据库" value={loadingHealth && !serverHealth ? '检查中' : serverHealth?.database?.ok ? 'OK' : '异常'} message={serverHealth?.database?.error ?? 'SQLite 可用'} tone={serverHealth?.database?.ok ? 'positive' : loadingHealth && !serverHealth ? 'neutral' : 'danger'} />
            <InsightCard title="内存" value={serverHealth?.memory?.rssMb !== undefined ? `${serverHealth.memory.rssMb} MB` : '未知'} message="RSS" tone={(serverHealth?.memory?.rssMb ?? 0) > 500 ? 'warning' : 'neutral'} />
            <InsightCard title="运行时长" value={formatUptime(serverHealth?.uptimeSec)} message="当前进程" tone="neutral" />
            <InsightCard title="提交上限" value={serverHealth?.limits?.jsonBody ?? '未知'} message="单次 JSON" tone="neutral" />
          </MetricGrid>
          {serverHealth?.dataFile ? (
            <p className="mt-3 break-all text-xs text-slate-500 dark:text-slate-400">数据文件：{serverHealth.dataFile}</p>
          ) : null}
        </div>

        <form className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60 lg:grid-cols-[1fr_1fr_1fr_auto_auto]" onSubmit={(event) => void handleCreateUser(event)}>
          <Field label="昵称">
            <TextInput value={newUsername} onChange={(event) => setNewUsername(event.target.value)} autoComplete="off" required />
          </Field>
          <Field label="显示名称">
            <TextInput value={newDisplayName} onChange={(event) => setNewDisplayName(event.target.value)} autoComplete="off" placeholder="默认同昵称" />
          </Field>
          <Field label="初始密码">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <TextInput type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required />
              <Button variant="secondary" className="px-3" onClick={() => setNewPassword(generatePassword())}>
                生成
              </Button>
            </div>
          </Field>
          <Field label="角色">
            <select
              className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
              value={newRole}
              onChange={(event) => setNewRole(event.target.value === 'admin' ? 'admin' : 'member')}
            >
              <option value="member">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </Field>
          <div className="flex items-end">
            <Button className="w-full" type="submit" disabled={creating}>
              {creating ? '创建中...' : '创建用户'}
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">账户列表</h3>
            <Badge tone="neutral">{users.length} 个用户</Badge>
          </div>

          {loadingUsers ? (
            <LoadingBlock className="mt-4" title="正在加载用户列表..." />
          ) : users.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="还没有用户" message="先在上方创建一个昵称账户。" />
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {users.map((user) => {
                const isSelf = user.id === currentUser.id
                const rowBusy = busyId === user.id
                return (
                  <div key={user.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(11rem,0.8fr)_minmax(12rem,1fr)]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-slate-950 dark:text-slate-50">{user.displayName}</p>
                          <Badge tone={user.role === 'admin' ? 'positive' : 'neutral'}>{user.role === 'admin' ? '管理员' : '普通用户'}</Badge>
                          <Badge tone={user.isActive ? 'positive' : 'danger'}>{user.isActive ? '启用' : '停用'}</Badge>
                          {isSelf ? <Badge tone="neutral">当前账号</Badge> : null}
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">创建于 {formatDateTime(user.createdAt)}</p>
                      </div>

                      <div className="grid gap-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            checked={user.isActive}
                            disabled={isSelf || rowBusy}
                            onChange={() => void patchUser(user, { isActive: !user.isActive }, user.isActive ? '用户已停用。' : '用户已启用。')}
                          />
                          允许登录
                        </label>
                        <select
                          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
                          value={user.role}
                          disabled={isSelf || rowBusy}
                          onChange={(event) => void patchUser(user, { role: event.target.value === 'admin' ? 'admin' : 'member' }, '角色已更新。')}
                        >
                          <option value="member">普通用户</option>
                          <option value="admin">管理员</option>
                        </select>
                      </div>

                      <div className="grid gap-2">
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <TextInput
                            value={draftNames[user.id] ?? ''}
                            onChange={(event) => setDraftNames((prev) => ({ ...prev, [user.id]: event.target.value }))}
                            aria-label={`${user.displayName} 的显示名称`}
                          />
                          <Button variant="secondary" className="px-3" onClick={() => void saveDisplayName(user)} disabled={rowBusy}>
                            保存
                          </Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                          <TextInput
                            type="password"
                            value={resetPasswords[user.id] ?? ''}
                            onChange={(event) => setResetPasswords((prev) => ({ ...prev, [user.id]: event.target.value }))}
                            autoComplete="new-password"
                            placeholder="新密码"
                            disabled={isSelf}
                          />
                          <Button
                            variant="secondary"
                            className="px-3"
                            onClick={() => setResetPasswords((prev) => ({ ...prev, [user.id]: generatePassword() }))}
                            disabled={isSelf || rowBusy}
                          >
                            生成
                          </Button>
                          <Button variant="secondary" className="px-3" onClick={() => void resetPassword(user)} disabled={isSelf || rowBusy}>
                            重置
                          </Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button variant="secondary" className="px-3" onClick={() => void loadUserData(user)} disabled={loadingData && selectedUserId === user.id}>
                            查看数据
                          </Button>
                          <Button variant="secondary" className="px-3" onClick={() => void openExportUserDialog(user)} disabled={rowBusy}>
                            导出用户
                          </Button>
                          <Button variant="secondary" className="px-3" onClick={() => void cloneDefaultPlan(user)} disabled={rowBusy}>
                            默认计划
                          </Button>
                          <Button variant="secondary" className="px-3" onClick={() => void deleteUserData(user)} disabled={isSelf || rowBusy}>
                            清空数据
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="xl:sticky xl:top-20 xl:self-start">
          <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">用户数据</h3>
          {selectedUser ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedUser.displayName} @{selectedUser.username}</p>
          ) : (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">选择一个用户查看记录概况。</p>
          )}

          {loadingData ? (
            <LoadingBlock className="mt-4" title="正在读取用户数据..." lines={2} />
          ) : selectedData ? (
            <div className="mt-4 grid gap-3">
              {selectedSummary.map(([label, count, latest]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">{count}</p>
                  {latest ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">最近：{latest}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState title="尚未选择用户" message="选择一个用户后，这里会显示记录、训练和模板概况。" />
            </div>
          )}
        </Card>
      </div>
      {exportTarget && exportSourceData ? (
        <ExportDataDialog
          title={`导出 ${exportTarget.displayName}`}
          description="默认只导出近期记录；需要迁移或完整备份时点完整备份。"
          today={exportAnchorDate}
          dailyLogs={exportSourceData.dailyLogs}
          workoutLogs={exportSourceData.workoutLogs}
          workoutTemplates={exportSourceData.workoutTemplates}
          pending={exportPending}
          onClose={() => {
            setExportTarget(null)
            setExportSourceData(null)
          }}
          onExport={(options, format) => void exportUserData(options, format)}
        />
      ) : null}
    </div>
  )
}
