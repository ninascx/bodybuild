import type { DailyLog, DailyTarget } from '../../types'
import type { SyncState } from '../../lib/storage'
import { NumberField } from '../NumberField'

export type DailyEssentialsFormProps = {
  selectedLog: Partial<DailyLog> & { date: string }
  selectedTarget: DailyTarget
  yesterdayLog: DailyLog | undefined
  calorieTarget: number | undefined
  syncState: SyncState
  savePending: boolean
  lastSyncedLabel: string
  onUpdateDailyLog: (patch: Partial<DailyLog>) => void
  onQuickAction: (patch: Partial<DailyLog>) => void
}

const quickFieldClass = 'h-11 text-base'

function getSaveLabel(syncState: SyncState, savePending: boolean, lastSyncedLabel: string) {
  if (savePending) return '待保存'
  if (syncState === 'synced') return lastSyncedLabel ? `已保存 ${lastSyncedLabel}` : '已保存'
  if (syncState === 'saving') return '保存中'
  return '离线缓存'
}

export function DailyEssentialsForm(props: DailyEssentialsFormProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">常用录入</h3>
          <p className="mt-0.5 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">先填每天最常用的 5 个数。</p>
        </div>
        <span className="hidden shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400 sm:inline">
          {getSaveLabel(props.syncState, props.savePending, props.lastSyncedLabel)}
        </span>
      </div>

      <div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <NumberField className={quickFieldClass} label="体重 kg" value={props.selectedLog.morningWeightKg} step="0.1" kind="decimal" range={{ min: 20, max: 300 }} onChange={(value) => props.onUpdateDailyLog({ morningWeightKg: value })} />
        <NumberField className={quickFieldClass} label="热量 kcal" value={props.selectedLog.calories} range={{ min: 0, max: 10000, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ calories: value })} />
        <NumberField className={quickFieldClass} label="蛋白质 g" value={props.selectedLog.protein} range={{ min: 0, max: 500, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ protein: value })} />
        <NumberField className={quickFieldClass} label="步数" value={props.selectedLog.steps} range={{ min: 0, max: 100000, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ steps: value })} />
        <NumberField className={quickFieldClass} label="睡眠 h" value={props.selectedLog.sleepHours} step="0.1" kind="decimal" range={{ min: 0, max: 24, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ sleepHours: value })} />
      </div>
    </section>
  )
}
