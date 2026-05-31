import { useCallback, useEffect, useState } from 'react'
import type { CurrentUser } from '../lib/storage'
import { fetchUserProfile, saveUserProfile } from '../lib/storage'
import type { UserPlanData, UserPreference } from '../types'
import { Badge, Button, LoadingBlock } from '../components/ui'
import { FormPanel } from '../components/FormPanel'
import {
  BasicProfileSection,
  BodyMeasurementsSection,
  PersonalizationSection,
  ProfileGoalsSection,
} from '../components/profile/ProfileFormSections'
import { useProfileDraft } from '../components/profile/useProfileDraft'

type ProfileTabProps = {
  currentUser: CurrentUser
  preference: UserPreference
  planData: UserPlanData
  onSavePreference: (preference: UserPreference) => Promise<UserPreference>
  onSavePlan: (planData: UserPlanData) => Promise<UserPlanData>
}

export function ProfileTab({ currentUser, preference, planData, onSavePreference, onSavePlan }: ProfileTabProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const clearFeedback = useCallback(() => {
    setMessage('')
    setError('')
  }, [])
  const {
    profile,
    setProfile,
    preferenceDraft,
    planDraft,
    dirty,
    profileDays,
    trainingDayCount,
    averageCalories,
    averageProtein,
    averageSteps,
    updateProfile,
    updateGoalType,
    updatePreference,
    updateAllTargets,
    updateAverageCalories,
    updateWeekendUpper,
    toggleTrainingDay,
    resetAfterSave,
  } = useProfileDraft({ preference, planData, onDraftChange: clearFeedback })
  const saveDisabled = saving || loading
  const saveLabel = saving ? '保存中...' : dirty ? '保存修改' : '保存资料'

  useEffect(() => {
    if (dirty) return
    let canceled = false
    void Promise.resolve().then(async () => {
      setLoading(true)
      setError('')
      try {
        const nextProfile = await fetchUserProfile()
        if (!canceled) {
          const fallbackTrainingDays = Object.values(planData.dailyTargets)
            .filter((target) => target.isTrainingDay)
            .map((target) => target.day)
          setProfile({
            ...nextProfile,
            trainingDays: nextProfile.trainingDays && nextProfile.trainingDays.length > 0
              ? nextProfile.trainingDays
              : fallbackTrainingDays,
          })
        }
      } catch (err) {
        if (!canceled) setError(err instanceof Error ? err.message : '读取个人资料失败')
      } finally {
        if (!canceled) setLoading(false)
      }
    })
    return () => {
      canceled = true
    }
  }, [currentUser.id, dirty, planData.dailyTargets, setProfile])

  async function handleSave() {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const [savedProfile] = await Promise.all([
        saveUserProfile(profile),
        onSavePreference(preferenceDraft),
        onSavePlan(planDraft),
      ])
      resetAfterSave(savedProfile)
      setMessage('个人资料和配置已保存。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存个人资料失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4">
      <FormPanel
        title="个人主页"
        description={currentUser.displayName}
        badges={
          <>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">@{currentUser.username}</span>
            {dirty ? <Badge tone="warning">未保存</Badge> : null}
          </>
        }
        actions={
          <Button onClick={() => void handleSave()} disabled={saveDisabled}>
            {saveLabel}
          </Button>
        }
        success={message}
        error={error}
        warning={dirty ? '有未保存修改，离开前记得保存。' : undefined}
      >
        {loading ? (
          <LoadingBlock title="正在加载个人资料..." />
        ) : (
          <div className="grid gap-6">
            <BasicProfileSection profile={profile} onUpdateProfile={updateProfile} />
            <BodyMeasurementsSection profile={profile} onUpdateProfile={updateProfile} />
            <ProfileGoalsSection profile={profile} onUpdateProfile={updateProfile} />
            <PersonalizationSection
              profile={profile}
              preference={preferenceDraft}
              trainingDayCount={trainingDayCount}
              averageCalories={averageCalories}
              averageProtein={averageProtein}
              averageSteps={averageSteps}
              profileDays={profileDays}
              onUpdateGoalType={updateGoalType}
              onUpdatePreference={updatePreference}
              onUpdateAllTargets={updateAllTargets}
              onUpdateAverageCalories={updateAverageCalories}
              onUpdateWeekendUpper={updateWeekendUpper}
              onToggleTrainingDay={toggleTrainingDay}
            />
          </div>
        )}
      </FormPanel>
    </div>
  )
}
