import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { FormPanel } from '../components/FormPanel'
import { useUnsavedChangesDialog } from '../components/UnsavedChangesDialog'
import { LoadingBlock, SegmentedControl } from '../components/ui'
import type { CurrentUser } from '../lib/storage'
import type { BodyRecord, UserPlanData, UserPreference } from '../types'
import type { SettingsLeaveGuard } from '../lib/settingsLeaveGuard'
import type { PlanTemplateManagerProps } from './PlanTab'

const XunjiDataSettings = lazy(() =>
  import('../components/profile/XunjiDataSettings').then((module) => ({ default: module.XunjiDataSettings })),
)
const ProfileTab = lazy(() => import('./ProfileTab').then((module) => ({ default: module.ProfileTab })))
const PlanTab = lazy(() => import('./PlanTab').then((module) => ({ default: module.PlanTab })))

type SettingsTabProps = {
  currentUser: CurrentUser
  preference: UserPreference
  planData: UserPlanData
  bodyRecords: BodyRecord[]
  onSavePreference: (preference: UserPreference) => Promise<UserPreference>
  onSavePlan: (planData: UserPlanData) => Promise<UserPlanData>
  onOpenBodyDate: (date: string) => void
  onLeaveGuardChange?: (guard: SettingsLeaveGuard | null) => void
  templateManagerProps: PlanTemplateManagerProps
}

export function SettingsTab(props: SettingsTabProps) {
  const { onLeaveGuardChange } = props
  const [view, setView] = useState<'profile' | 'plan' | 'xunji'>('profile')
  const activeGuardRef = useRef<SettingsLeaveGuard | null>(null)
  const { decide, dialog } = useUnsavedChangesDialog()
  const handleLeaveGuardChange = useCallback((guard: SettingsLeaveGuard | null) => {
    activeGuardRef.current = guard
    onLeaveGuardChange?.(guard)
  }, [onLeaveGuardChange])

  useEffect(() => () => onLeaveGuardChange?.(null), [onLeaveGuardChange])

  async function changeView(nextView: 'profile' | 'plan' | 'xunji') {
    if (nextView === view) return
    const guard = activeGuardRef.current
    if (guard) {
      const decision = await decide(guard.sectionLabel)
      if (decision === 'stay') return
      if (decision === 'save' && !(await guard.save())) return
    }
    setView(nextView)
  }

  return (
    <div className="grid gap-4">
      <div className="flex justify-center">
        <SegmentedControl
          ariaLabel="设置分类"
          value={view}
          options={[
            { value: 'profile', label: '资料与目标' },
            { value: 'plan', label: '训练计划' },
            { value: 'xunji', label: '训记连接' },
          ]}
          onChange={(value) => void changeView(value as 'profile' | 'plan' | 'xunji')}
        />
      </div>

      {view === 'profile' ? (
        <Suspense fallback={<LoadingBlock title="正在加载资料与目标…" lines={3} />}>
          <ProfileTab
            currentUser={props.currentUser}
            preference={props.preference}
            planData={props.planData}
            bodyRecords={props.bodyRecords}
            onSavePreference={props.onSavePreference}
            onSavePlan={props.onSavePlan}
            onLeaveGuardChange={handleLeaveGuardChange}
          />
        </Suspense>
      ) : view === 'plan' ? (
        <Suspense fallback={<LoadingBlock title="正在加载训练计划…" lines={3} />}>
          <PlanTab
            planData={props.planData}
            onSave={props.onSavePlan}
            onLeaveGuardChange={handleLeaveGuardChange}
            templateManagerProps={props.templateManagerProps}
          />
        </Suspense>
      ) : (
        <FormPanel
          title="训记连接"
          description="分别管理训练、饮食和身体数据连接；Key 只会发送到本项目服务端进行验证。"
        >
          <Suspense fallback={<LoadingBlock title="正在加载训记连接…" lines={2} />}>
            <XunjiDataSettings
              userId={props.currentUser.id}
              bodyRecords={props.bodyRecords}
              onOpenBodyDate={props.onOpenBodyDate}
            />
          </Suspense>
        </FormPanel>
      )}
      {dialog}
    </div>
  )
}
