import { useCallback, useEffect, useRef, useState } from 'react'
import type { CurrentUser } from '../lib/storage'
import { fetchUserProfile, saveUserProfile } from '../lib/storage'
import type { BodyRecord, UserPlanData, UserPreference } from '../types'
import { Badge, Button, LoadingBlock } from '../components/ui'
import { FormPanel } from '../components/FormPanel'
import {
  BasicProfileSection,
  LatestBodyMetricsSection,
  PersonalizationSection,
  ProfileSaveFooter,
  ProfileGoalsSection,
} from '../components/profile/ProfileFormSections'
import { useProfileDraft } from '../components/profile/useProfileDraft'
import type { SettingsLeaveGuard } from '../lib/settingsLeaveGuard'

type ProfileTabProps = {
  currentUser: CurrentUser
  preference: UserPreference
  planData: UserPlanData
  bodyRecords: BodyRecord[]
  onSavePreference: (preference: UserPreference) => Promise<UserPreference>
  onSavePlan: (planData: UserPlanData) => Promise<UserPlanData>
  onLeaveGuardChange?: (guard: SettingsLeaveGuard | null) => void
}

export function ProfileTab({
  currentUser,
  preference,
  planData,
  bodyRecords,
  onSavePreference,
  onSavePlan,
  onLeaveGuardChange,
}: ProfileTabProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const saveForLeaveRef = useRef<() => Promise<boolean>>(async () => false)
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

  async function handleSave(): Promise<boolean> {
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
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存个人资料失败')
      return false
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    saveForLeaveRef.current = handleSave
  })

  useEffect(() => {
    if (!dirty) {
      onLeaveGuardChange?.(null)
      return
    }
    const guard: SettingsLeaveGuard = {
      sectionLabel: '资料与目标',
      save: () => saveForLeaveRef.current(),
    }
    onLeaveGuardChange?.(guard)
    return () => onLeaveGuardChange?.(null)
  }, [dirty, onLeaveGuardChange])

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
            <LatestBodyMetricsSection records={bodyRecords} />
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
            <ProfileSaveFooter
              dirty={dirty}
              saveDisabled={saveDisabled}
              saveLabel={saveLabel}
              onSave={() => void handleSave()}
            />
          </div>
        )}
      </FormPanel>
      {dirty ? (
        <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 rounded-lg border border-[var(--surface-border-strong)] bg-[var(--surface-panel)] p-3 dark:border-slate-700 dark:bg-slate-900 sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">有未保存修改</p>
            <Button onClick={() => void handleSave()} disabled={saveDisabled}>{saveLabel}</Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
