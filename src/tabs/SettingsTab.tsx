import { useState } from 'react'
import { SegmentedControl } from '../components/ui'
import { ProfileTab } from './ProfileTab'
import { PlanTab } from './PlanTab'
import type { CurrentUser } from '../lib/storage'
import type { UserPlanData, UserPreference } from '../types'

type SettingsTabProps = {
  currentUser: CurrentUser
  preference: UserPreference
  planData: UserPlanData
  onSavePreference: (preference: UserPreference) => Promise<UserPreference>
  onSavePlan: (planData: UserPlanData) => Promise<UserPlanData>
}

export function SettingsTab(props: SettingsTabProps) {
  const [view, setView] = useState<'profile' | 'plan'>('profile')

  return (
    <div className="grid gap-4">
      <div className="flex justify-center">
        <SegmentedControl
          value={view}
          options={[
            { value: 'profile', label: '个人' },
            { value: 'plan', label: '计划' },
          ]}
          onChange={(value) => setView(value as 'profile' | 'plan')}
        />
      </div>

      {view === 'profile' ? (
        <ProfileTab
          currentUser={props.currentUser}
          preference={props.preference}
          planData={props.planData}
          onSavePreference={props.onSavePreference}
          onSavePlan={props.onSavePlan}
        />
      ) : (
        <PlanTab planData={props.planData} onSave={props.onSavePlan} />
      )}
    </div>
  )
}
