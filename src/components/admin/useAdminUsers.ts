import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useConfirm } from '../ConfirmDialog'
import { formatDateInput } from '../../lib/dates'
import type { ExportFormat, ExportOptions } from '../../lib/exportPayload'
import {
  type AdminUser,
  type AppData,
  type CurrentUser,
  type ServerHealth,
  cloneAdminDefaultPlan,
  createAdminUser,
  deleteAdminUserData,
  fetchAdminUserAppData,
  fetchServerHealth,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
} from '../../lib/storage'
import {
  buildLoginCredentialText,
  createAdminBackupMessage,
  exportAdminUserDataWithOptions,
  generatePassword,
  latestDataDate,
  writeToClipboard,
} from './adminUserActions'

export function useAdminUsers() {
  const { confirm, dialog: confirmDialog } = useConfirm()
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
      setMessage(await createAdminBackupMessage())
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
      setMessage(await exportAdminUserDataWithOptions({ user: exportTarget, options, format, anchorDate: exportAnchorDate }))
      setExportTarget(null)
      setExportSourceData(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出用户数据失败')
    } finally {
      setExportPending(false)
    }
  }

  async function deleteUserData(user: AdminUser) {
    const ok = await confirm({
      title: '清空用户数据',
      message: `确定清空 ${user.displayName} 的所有记录、计划、资料和偏好吗？账户会保留。`,
      confirmLabel: '清空数据',
      cancelLabel: '取消',
      tone: 'danger',
    })
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

  return {
    backupBusy,
    busyId,
    confirmDialog,
    createBackup,
    creating,
    deleteUserData,
    draftNames,
    error,
    exportAnchorDate,
    exportPending,
    exportSourceData,
    exportTarget,
    exportUserData,
    generatePassword,
    handleCreateUser,
    loadHealth,
    loadUserData,
    loadUsers,
    loadingData,
    loadingHealth,
    loadingUsers,
    message,
    newDisplayName,
    newPassword,
    newRole,
    newUsername,
    openExportUserDialog,
    resetPassword,
    resetPasswords,
    saveDisplayName,
    selectedData,
    selectedUser,
    selectedUserId,
    serverHealth,
    setNewDisplayName,
    setNewPassword,
    setNewRole,
    setNewUsername,
    setDraftName: (userId: string, value: string) => setDraftNames((prev) => ({ ...prev, [userId]: value })),
    setResetPassword: (userId: string, value: string) => setResetPasswords((prev) => ({ ...prev, [userId]: value })),
    generateResetPassword: (userId: string) => setResetPasswords((prev) => ({ ...prev, [userId]: generatePassword() })),
    closeExportDialog: () => {
      setExportTarget(null)
      setExportSourceData(null)
    },
    toggleActive: (user: AdminUser) => patchUser(user, { isActive: !user.isActive }, user.isActive ? '用户已停用。' : '用户已启用。'),
    changeRole: (user: AdminUser, role: CurrentUser['role']) => patchUser(user, { role }, '角色已更新。'),
    cloneDefaultPlan,
    users,
  }
}
