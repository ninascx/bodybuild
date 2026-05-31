import type { DailyLog, DailyTarget } from '../../types'
import type { SyncState } from '../../lib/storage'
import type { DailyFocusKey } from '../../lib/productFlow'
import { NumberField } from '../NumberField'

export type DailyEssentialsFormProps = {
  selectedLog: Partial<DailyLog> & { date: string }
  selectedTarget: DailyTarget
  yesterdayLog: DailyLog | undefined
  calorieTarget: number | undefined
  fatigueThreshold: number
  syncState: SyncState
  savePending: boolean
  lastSyncedLabel: string
  onUpdateDailyLog: (patch: Partial<DailyLog>) => void
  onQuickAction: (patch: Partial<DailyLog>) => void
  focusKey?: DailyFocusKey
}

const quickFieldClass = 'h-11 text-base'

type EssentialField = {
  key: DailyFocusKey
  label: string
  value?: number
  patch: (value: number | undefined) => Partial<DailyLog>
}

function getSaveLabel(syncState: SyncState, savePending: boolean, lastSyncedLabel: string) {
  if (savePending) return '待保存'
  if (syncState === 'synced') return lastSyncedLabel ? `已保存 ${lastSyncedLabel}` : '已保存'
  if (syncState === 'saving') return '保存中'
  return '离线缓存'
}

export function DailyEssentialsForm(props: DailyEssentialsFormProps) {
  const essentialFields: EssentialField[] = [
    { key: 'weight', label: '体重 kg', value: props.selectedLog.morningWeightKg, patch: (value: number | undefined) => ({ morningWeightKg: value }) },
    { key: 'calories', label: '热量 kcal', value: props.selectedLog.calories, patch: (value: number | undefined) => ({ calories: value }) },
    { key: 'protein', label: '蛋白质 g', value: props.selectedLog.protein, patch: (value: number | undefined) => ({ protein: value }) },
    { key: 'steps', label: '步数', value: props.selectedLog.steps, patch: (value: number | undefined) => ({ steps: value }) },
    { key: 'sleep', label: '睡眠 h', value: props.selectedLog.sleepHours, patch: (value: number | undefined) => ({ sleepHours: value }) },
    { key: 'fatigue', label: `疲劳 ≤${props.fatigueThreshold}`, value: props.selectedLog.fatigueScore, patch: (value: number | undefined) => ({ fatigueScore: value }) },
  ]
  const fieldOrder = essentialFields
    .map((item) => ({ ...item, missing: item.value === undefined }))
    .sort((a, b) => {
      if (props.focusKey === a.key) return -1
      if (props.focusKey === b.key) return 1
      if (a.missing !== b.missing) return Number(b.missing) - Number(a.missing)
      return 0
    })

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">常用录入</h3>
          <p className="mt-0.5 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">先填每天最常用的 6 个数。</p>
        </div>
        <span className="hidden shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400 sm:inline">
          {getSaveLabel(props.syncState, props.savePending, props.lastSyncedLabel)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {fieldOrder.map((field) => (
          <div key={field.key} data-daily-focus={field.key}>
            <NumberField
              className={quickFieldClass}
              label={field.label}
              value={field.value}
              step={field.key === 'weight' || field.key === 'sleep' ? '0.1' : '1'}
              kind={field.key === 'weight' || field.key === 'sleep' ? 'decimal' : 'integer'}
              range={
                field.key === 'weight'
                  ? { min: 20, max: 300 }
                  : field.key === 'calories'
                    ? { min: 0, max: 10000, allowZero: true }
                    : field.key === 'protein'
                      ? { min: 0, max: 500, allowZero: true }
                      : field.key === 'steps'
                        ? { min: 0, max: 100000, allowZero: true }
                        : field.key === 'fatigue'
                          ? { min: 0, max: 10, allowZero: true }
                          : { min: 0, max: 24, allowZero: true }
              }
              onChange={(value) => props.onUpdateDailyLog(field.patch(value))}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
