import { Button, Card } from '../components/ui'
import { FormPanel } from '../components/FormPanel'
import {
  AdminServiceStatus,
  AdminUserDataPanel,
  AdminUserList,
  CreateAdminUserForm,
} from '../components/admin/AdminUserPanels'
import { useAdminUsers } from '../components/admin/useAdminUsers'
import { ExportDataDialog } from '../components/ExportDataDialog'
import type { CurrentUser } from '../lib/storage'

type AdminUsersTabProps = {
  currentUser: CurrentUser
}

export function AdminUsersTab({ currentUser }: AdminUsersTabProps) {
  const adminUsers = useAdminUsers(currentUser)

  return (
    <div className="grid gap-4">
      <FormPanel
        title="用户管理"
        description="创建昵称账户，管理登录状态、角色、密码和用户数据导出。"
        badges={<span className="text-xs font-medium text-slate-500 dark:text-slate-400">{adminUsers.users.length} 个用户</span>}
        actions={
          <>
            <Button variant="secondary" className="px-3" onClick={() => void adminUsers.loadUsers()} loading={adminUsers.loadingUsers}>
              刷新
            </Button>
            <Button variant="secondary" className="px-3" onClick={() => void adminUsers.createBackup()} loading={adminUsers.backupBusy}>
              创建备份
            </Button>
          </>
        }
        success={adminUsers.message}
        error={adminUsers.error}
        contentClassName="mt-5 grid gap-5"
      >
        <AdminServiceStatus
          serverHealth={adminUsers.serverHealth}
          loadingHealth={adminUsers.loadingHealth}
          onRefresh={() => void adminUsers.loadHealth()}
        />
        <CreateAdminUserForm
          newUsername={adminUsers.newUsername}
          newDisplayName={adminUsers.newDisplayName}
          newPassword={adminUsers.newPassword}
          newRole={adminUsers.newRole}
          creating={adminUsers.creating}
          onUsernameChange={adminUsers.setNewUsername}
          onDisplayNameChange={adminUsers.setNewDisplayName}
          onPasswordChange={adminUsers.setNewPassword}
          onRoleChange={adminUsers.setNewRole}
          onGeneratePassword={() => adminUsers.setNewPassword(adminUsers.generatePassword())}
          onSubmit={(event) => void adminUsers.handleCreateUser(event)}
        />
      </FormPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">账户列表</h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{adminUsers.users.length} 个用户</span>
          </div>
          <AdminUserList
            users={adminUsers.users}
            currentUser={currentUser}
            loadingUsers={adminUsers.loadingUsers}
            loadingData={adminUsers.loadingData}
            selectedUserId={adminUsers.selectedUserId}
            busyId={adminUsers.busyId}
            draftNames={adminUsers.draftNames}
            resetPasswords={adminUsers.resetPasswords}
            rowStatuses={adminUsers.rowStatuses}
            onDraftNameChange={adminUsers.setDraftName}
            onResetPasswordChange={adminUsers.setResetPassword}
            onToggleActive={(user) => void adminUsers.toggleActive(user)}
            onChangeRole={(user, role) => void adminUsers.changeRole(user, role)}
            onSaveDisplayName={(user) => void adminUsers.saveDisplayName(user)}
            onGenerateResetPassword={adminUsers.generateResetPassword}
            onResetPassword={(user) => void adminUsers.resetPassword(user)}
            onViewData={(user) => void adminUsers.loadUserData(user)}
            onOpenExport={(user) => void adminUsers.openExportUserDialog(user)}
            onCloneDefaultPlan={(user) => void adminUsers.cloneDefaultPlan(user)}
            onDeleteData={(user) => void adminUsers.deleteUserData(user)}
          />
        </Card>

        <Card className="xl:sticky xl:top-20 xl:self-start">
          <AdminUserDataPanel selectedUser={adminUsers.selectedUser} selectedData={adminUsers.selectedData} loadingData={adminUsers.loadingData} />
        </Card>
      </div>
      {adminUsers.exportTarget && adminUsers.exportSourceData ? (
        <ExportDataDialog
          title={`导出 ${adminUsers.exportTarget.displayName}`}
          description="默认只导出近期记录；需要迁移或完整备份时点完整备份。"
          today={adminUsers.exportAnchorDate}
          dailyLogs={adminUsers.exportSourceData.dailyLogs}
          workoutLogs={adminUsers.exportSourceData.workoutLogs}
          workoutTemplates={adminUsers.exportSourceData.workoutTemplates}
          pending={adminUsers.exportPending}
          onClose={adminUsers.closeExportDialog}
          onExport={(options, format) => void adminUsers.exportUserData(options, format)}
        />
      ) : null}
      {adminUsers.confirmDialog}
    </div>
  )
}
