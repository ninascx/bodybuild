import type { AdminUser, CurrentUser } from '../../lib/storage'
import { Badge, Button, Checkbox, Select, StatusMessage, TextInput } from '../ui'
import type { RecommendationTone } from '../../types'

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

export function AdminUserRow({
  user,
  currentUser,
  loadingData,
  selectedUserId,
  busyId,
  draftName,
  resetPassword,
  status,
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
  user: AdminUser
  currentUser: CurrentUser
  loadingData: boolean
  selectedUserId: string | null
  busyId: string | null
  draftName: string
  resetPassword: string
  status?: { tone: RecommendationTone; message: string }
  onDraftNameChange: (value: string) => void
  onResetPasswordChange: (value: string) => void
  onToggleActive: () => void
  onChangeRole: (role: CurrentUser['role']) => void
  onSaveDisplayName: () => void
  onGenerateResetPassword: () => void
  onResetPassword: () => void
  onViewData: () => void
  onOpenExport: () => void
  onCloneDefaultPlan: () => void
  onDeleteData: () => void
}) {
  const isSelf = user.id === currentUser.id
  const rowBusy = busyId === user.id
  const dataLoadingForUser = loadingData && selectedUserId === user.id

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(11rem,0.8fr)_minmax(12rem,1fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-slate-950 dark:text-slate-50">{user.displayName}</p>
            {user.role === 'admin' ? <Badge tone="positive">管理员</Badge> : <span className="text-xs font-medium text-slate-500 dark:text-slate-400">普通用户</span>}
            <Badge tone={user.isActive ? 'positive' : 'danger'}>{user.isActive ? '启用' : '停用'}</Badge>
            {isSelf ? <span className="text-xs font-medium text-slate-500 dark:text-slate-400">当前账号</span> : null}
          </div>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">创建于 {formatDateTime(user.createdAt)}</p>
        </div>

        <div className="grid gap-2">
          <Checkbox
            label="允许登录"
            checked={user.isActive}
            disabled={isSelf || rowBusy}
            onChange={onToggleActive}
          />
          <Select
            value={user.role}
            disabled={isSelf || rowBusy}
            onChange={(event) => onChangeRole(event.target.value === 'admin' ? 'admin' : 'member')}
          >
            <option value="member">普通用户</option>
            <option value="admin">管理员</option>
          </Select>
        </div>

        <div className="grid gap-2">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <TextInput
              value={draftName}
              onChange={(event) => onDraftNameChange(event.target.value)}
              aria-label={`${user.displayName} 的显示名称`}
            />
            <Button variant="secondary" className="px-3" onClick={onSaveDisplayName} disabled={rowBusy}>
              保存
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <TextInput
              type="password"
              value={resetPassword}
              onChange={(event) => onResetPasswordChange(event.target.value)}
              autoComplete="new-password"
              placeholder={isSelf ? '修改当前账号密码' : '新密码'}
            />
            <Button variant="secondary" className="px-3" onClick={onGenerateResetPassword} disabled={rowBusy}>
              生成
            </Button>
            <Button variant="secondary" className="px-3" onClick={onResetPassword} disabled={rowBusy}>
              重置
            </Button>
          </div>
          {status ? (
            <StatusMessage className="py-2" tone={status.tone} announce>
              {status.message}
            </StatusMessage>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" className="px-3" onClick={onViewData} loading={dataLoadingForUser}>
              查看数据
            </Button>
            <Button variant="secondary" className="px-3" onClick={onOpenExport} disabled={rowBusy}>
              导出用户
            </Button>
            <Button variant="secondary" className="px-3" onClick={onCloneDefaultPlan} disabled={rowBusy}>
              默认计划
            </Button>
            <Button variant="danger" className="px-3" onClick={onDeleteData} disabled={isSelf || rowBusy}>
              清空数据
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
