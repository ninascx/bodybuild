import { useCallback, useEffect, useState } from 'react'
import type { CurrentUser } from '../lib/storage'
import {
  clearXunjiIntegrationConfig,
  fetchUserProfile,
  fetchXunjiIntegrationConfig,
  saveUserProfile,
  saveXunjiIntegrationConfig,
} from '../lib/storage'
import type { UserPlanData, UserPreference } from '../types'
import { Badge, Button, Field, LoadingBlock, StatusMessage, TextInput } from '../components/ui'
import { FormPanel, FormSection } from '../components/FormPanel'
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
  const [xunjiConfigLoading, setXunjiConfigLoading] = useState(true)
  const [xunjiConfigured, setXunjiConfigured] = useState(false)
  const [xunjiMaskedKey, setXunjiMaskedKey] = useState<string | undefined>()
  const [xunjiApiKeyDraft, setXunjiApiKeyDraft] = useState('')
  const [xunjiSaving, setXunjiSaving] = useState(false)
  const [xunjiMessage, setXunjiMessage] = useState('')
  const [xunjiError, setXunjiError] = useState('')
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

  useEffect(() => {
    let canceled = false
    void Promise.resolve().then(async () => {
      setXunjiConfigLoading(true)
      setXunjiError('')
      try {
        const config = await fetchXunjiIntegrationConfig()
        if (!canceled) {
          setXunjiConfigured(config.configured)
          setXunjiMaskedKey(config.maskedKey)
        }
      } catch (err) {
        if (!canceled) setXunjiError(err instanceof Error ? err.message : '读取训记配置失败')
      } finally {
        if (!canceled) setXunjiConfigLoading(false)
      }
    })
    return () => {
      canceled = true
    }
  }, [currentUser.id])

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

  async function handleSaveXunjiKey() {
    if (!xunjiApiKeyDraft.trim()) {
      setXunjiError('请输入训记 Open API Key')
      setXunjiMessage('')
      return
    }
    setXunjiSaving(true)
    setXunjiMessage('')
    setXunjiError('')
    try {
      const config = await saveXunjiIntegrationConfig(xunjiApiKeyDraft)
      setXunjiConfigured(config.configured)
      setXunjiMaskedKey(config.maskedKey)
      setXunjiApiKeyDraft('')
      setXunjiMessage('训记配置已保存。')
    } catch (err) {
      setXunjiError(err instanceof Error ? err.message : '保存训记配置失败')
    } finally {
      setXunjiSaving(false)
    }
  }

  async function handleClearXunjiKey() {
    const ok = window.confirm('确定要移除训记 Open API Key 吗？')
    if (!ok) return
    setXunjiSaving(true)
    setXunjiMessage('')
    setXunjiError('')
    try {
      const config = await clearXunjiIntegrationConfig()
      setXunjiConfigured(config.configured)
      setXunjiMaskedKey(config.maskedKey)
      setXunjiApiKeyDraft('')
      setXunjiMessage('训记配置已移除。')
    } catch (err) {
      setXunjiError(err instanceof Error ? err.message : '移除训记配置失败')
    } finally {
      setXunjiSaving(false)
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
            <FormSection
              title="训记同步"
              description={xunjiConfigLoading ? '正在读取配置...' : xunjiConfigured ? `已配置：${xunjiMaskedKey ?? '已配置'}` : '未配置'}
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <Field label="Open API Key">
                  <TextInput
                    type="password"
                    autoComplete="off"
                    value={xunjiApiKeyDraft}
                    placeholder={xunjiConfigured ? '输入新 key 后保存' : '粘贴训记 Open API Key'}
                    onChange={(event) => {
                      setXunjiApiKeyDraft(event.target.value)
                      setXunjiMessage('')
                      setXunjiError('')
                    }}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void handleSaveXunjiKey()} loading={xunjiSaving} disabled={xunjiConfigLoading}>
                    保存训记 Key
                  </Button>
                  {xunjiConfigured ? (
                    <Button variant="secondary" onClick={() => void handleClearXunjiKey()} disabled={xunjiSaving || xunjiConfigLoading}>
                      移除
                    </Button>
                  ) : null}
                </div>
              </div>
              {xunjiMessage ? <StatusMessage tone="positive">{xunjiMessage}</StatusMessage> : null}
              {xunjiError ? <StatusMessage tone="warning">{xunjiError}</StatusMessage> : null}
            </FormSection>
          </div>
        )}
      </FormPanel>
    </div>
  )
}
