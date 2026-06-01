import type { FormEvent, ReactNode } from 'react'
import type { AdminUser, AppData, CurrentUser, ServerHealth } from '../../lib/storage'
import type { RecommendationTone } from '../../types'
import { Badge, Button, EmptyState, Field, InsightCard, LoadingBlock, MetricGrid, Select, TextInput } from '../ui'
import { FormSection } from '../FormPanel'
import { AdminUserRow } from './AdminUserRow'

function latestDate(items: Array<{ date: string }>): string {
  return items.reduce((latest, item) => (item.date > latest ? item.date : latest), '')
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

export function AdminServiceStatus({
  serverHealth,
  loadingHealth,
  onRefresh,
}: {
  serverHealth: ServerHealth | null
  loadingHealth: boolean
  onRefresh: () => void
}) {
  const databaseOk = Boolean(serverHealth?.ok && serverHealth.database?.ok)

  return (
    <FormSection
      title="服务状态"
      actions={
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={onRefresh} loading={loadingHealth}>
          刷新状态
        </Button>
      }
    >
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={databaseOk ? 'positive' : loadingHealth ? 'neutral' : 'danger'}>
            {databaseOk ? '正常' : loadingHealth ? '检查中' : '异常'}
          </Badge>
          <span className="text-sm text-slate-500 dark:text-slate-400">数据库、进程和提交限制</span>
        </div>
        <MetricGrid className="mt-3 lg:grid-cols-4">
          <InsightCard
            title="数据库"
            value={loadingHealth && !serverHealth ? '检查中' : serverHealth?.database?.ok ? 'OK' : '异常'}
            message={serverHealth?.database?.error ?? 'SQLite 可用'}
            tone={serverHealth?.database?.ok ? 'positive' : loadingHealth && !serverHealth ? 'neutral' : 'danger'}
          />
          <InsightCard
            title="内存"
            value={serverHealth?.memory?.rssMb !== undefined ? `${serverHealth.memory.rssMb} MB` : '未知'}
            message="RSS"
            tone={(serverHealth?.memory?.rssMb ?? 0) > 500 ? 'warning' : 'neutral'}
          />
          <InsightCard title="运行时长" value={formatUptime(serverHealth?.uptimeSec)} message="当前进程" tone="neutral" />
          <InsightCard title="提交上限" value={serverHealth?.limits?.jsonBody ?? '未知'} message="单次 JSON" tone="neutral" />
        </MetricGrid>
        {serverHealth?.dataFile ? (
          <p className="mt-3 break-all text-xs text-slate-500 dark:text-slate-400">数据文件：{serverHealth.dataFile}</p>
        ) : null}
      </div>
    </FormSection>
  )
}

export function CreateAdminUserForm({
  newUsername,
  newDisplayName,
  newPassword,
  newRole,
  creating,
  onUsernameChange,
  onDisplayNameChange,
  onPasswordChange,
  onRoleChange,
  onGeneratePassword,
  onSubmit,
}: {
  newUsername: string
  newDisplayName: string
  newPassword: string
  newRole: CurrentUser['role']
  creating: boolean
  onUsernameChange: (value: string) => void
  onDisplayNameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onRoleChange: (value: CurrentUser['role']) => void
  onGeneratePassword: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <FormSection title="创建账户" description="创建后会自动复制登录地址、昵称和初始密码，便于发给新用户。">
      <form
        className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60 lg:grid-cols-[1fr_1fr_1fr_auto_auto]"
        onSubmit={onSubmit}
      >
        <Field label="昵称">
          <TextInput value={newUsername} onChange={(event) => onUsernameChange(event.target.value)} autoComplete="off" required />
        </Field>
        <Field label="显示名称">
          <TextInput value={newDisplayName} onChange={(event) => onDisplayNameChange(event.target.value)} autoComplete="off" placeholder="默认同昵称" />
        </Field>
        <Field label="初始密码">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <TextInput type="password" value={newPassword} onChange={(event) => onPasswordChange(event.target.value)} autoComplete="new-password" required />
            <Button variant="secondary" className="px-3" onClick={onGeneratePassword}>
              生成
            </Button>
          </div>
        </Field>
        <Field label="角色">
          <Select value={newRole} onChange={(event) => onRoleChange(event.target.value === 'admin' ? 'admin' : 'member')}>
            <option value="member">普通用户</option>
            <option value="admin">管理员</option>
          </Select>
        </Field>
        <div className="flex items-end">
          <Button className="w-full" type="submit" loading={creating}>
            创建用户
          </Button>
        </div>
      </form>
    </FormSection>
  )
}

export function CurrentAdminAccountPanel({
  currentUser,
  currentPassword,
  currentNewPassword,
  currentConfirmPassword,
  changingOwnPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: {
  currentUser: CurrentUser
  currentPassword: string
  currentNewPassword: string
  currentConfirmPassword: string
  changingOwnPassword: boolean
  onCurrentPasswordChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <FormSection
      title="当前账号"
      description="修改自己的密码需要先确认当前密码；修改后当前设备保持登录。"
      actions={<Badge tone="positive">管理员</Badge>}
    >
      <form
        className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[1fr_1fr_1fr_auto]"
        onSubmit={onSubmit}
      >
        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800 lg:col-span-4">
          <p className="font-semibold text-slate-950 dark:text-slate-50">{currentUser.displayName}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">@{currentUser.username}</p>
        </div>
        <Field label="当前密码">
          <TextInput
            type="password"
            value={currentPassword}
            onChange={(event) => onCurrentPasswordChange(event.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <Field label="新密码">
          <TextInput
            type="password"
            value={currentNewPassword}
            onChange={(event) => onNewPasswordChange(event.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label="确认新密码">
          <TextInput
            type="password"
            value={currentConfirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        <div className="flex items-end">
          <Button className="w-full" type="submit" loading={changingOwnPassword}>
            修改密码
          </Button>
        </div>
      </form>
    </FormSection>
  )
}

export function AdminUserList({
  users,
  currentUser,
  loadingUsers,
  loadingData,
  selectedUserId,
  busyId,
  draftNames,
  resetPasswords,
  rowStatuses,
  onDraftNameChange,
  onResetPasswordChange,
  onToggleActive,
  onChangeRole,
  onSaveDisplayName,
  onGenerateResetPassword,
  onResetPassword,
  onViewData,
  onOpenExport,
  onCloneDefaultPlan,
  onDeleteData,
}: {
  users: AdminUser[]
  currentUser: CurrentUser
  loadingUsers: boolean
  loadingData: boolean
  selectedUserId: string | null
  busyId: string | null
  draftNames: Record<string, string>
  resetPasswords: Record<string, string>
  rowStatuses: Record<string, { tone: RecommendationTone; message: string }>
  onDraftNameChange: (userId: string, value: string) => void
  onResetPasswordChange: (userId: string, value: string) => void
  onToggleActive: (user: AdminUser) => void
  onChangeRole: (user: AdminUser, role: CurrentUser['role']) => void
  onSaveDisplayName: (user: AdminUser) => void
  onGenerateResetPassword: (userId: string) => void
  onResetPassword: (user: AdminUser) => void
  onViewData: (user: AdminUser) => void
  onOpenExport: (user: AdminUser) => void
  onCloneDefaultPlan: (user: AdminUser) => void
  onDeleteData: (user: AdminUser) => void
}) {
  const managedUsers = users.filter((user) => user.id !== currentUser.id)

  if (loadingUsers) {
    return <LoadingBlock className="mt-4" title="正在加载用户列表..." />
  }

  if (managedUsers.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState title="还没有其他用户" message="创建用户后，这里会显示可管理的成员账户。" />
      </div>
    )
  }

  return (
    <div className="mt-4 grid gap-3">
      {managedUsers.map((user) => (
        <AdminUserRow
          key={user.id}
          user={user}
          currentUser={currentUser}
          loadingData={loadingData}
          selectedUserId={selectedUserId}
          busyId={busyId}
          draftName={draftNames[user.id] ?? ''}
          resetPassword={resetPasswords[user.id] ?? ''}
          status={rowStatuses[user.id]}
          onDraftNameChange={(value) => onDraftNameChange(user.id, value)}
          onResetPasswordChange={(value) => onResetPasswordChange(user.id, value)}
          onToggleActive={() => onToggleActive(user)}
          onChangeRole={(role) => onChangeRole(user, role)}
          onSaveDisplayName={() => onSaveDisplayName(user)}
          onGenerateResetPassword={() => onGenerateResetPassword(user.id)}
          onResetPassword={() => onResetPassword(user)}
          onViewData={() => onViewData(user)}
          onOpenExport={() => onOpenExport(user)}
          onCloneDefaultPlan={() => onCloneDefaultPlan(user)}
          onDeleteData={() => onDeleteData(user)}
        />
      ))}
    </div>
  )
}

export function AdminUserDataPanel({
  selectedUser,
  selectedData,
  loadingData,
}: {
  selectedUser: AdminUser | null
  selectedData: AppData | null
  loadingData: boolean
}) {
  const summary: Array<[string, ReactNode, string]> = selectedData
    ? [
        ['每日记录', selectedData.dailyLogs.length, latestDate(selectedData.dailyLogs)],
        ['训练记录', selectedData.workoutLogs.length, latestDate(selectedData.workoutLogs)],
        ['训练模板', selectedData.workoutTemplates.length, ''],
      ]
    : []

  return (
    <>
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
          {summary.map(([label, count, latest]) => (
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
    </>
  )
}
