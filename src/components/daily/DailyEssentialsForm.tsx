import { Button } from '../ui'
import { NumberField } from '../NumberField'
import type { DailyLog, DailyTarget } from '../../types'
import type { SyncState } from '../../lib/storage'

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

const quickFieldClass = 'h-12 text-base'

function getSaveLabel(syncState: SyncState, savePending: boolean, lastSyncedLabel: string) {
  if (savePending) return '待保存'
  if (syncState === 'synced') return lastSyncedLabel ? `已保存 ${lastSyncedLabel}` : '已保存'
  if (syncState === 'saving') return '保存中'
  return '离线缓存'
}

function QuickValueButton({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      className="min-h-8 rounded-md px-2 py-0.5 text-xs shadow-none"
    >
      {label}
    </Button>
  )
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

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="grid gap-1">
          <NumberField className={quickFieldClass} label="体重 kg" value={props.selectedLog.morningWeightKg} step="0.1" kind="decimal" range={{ min: 20, max: 300 }} onChange={(value) => props.onUpdateDailyLog({ morningWeightKg: value })} />
          <div className="flex flex-wrap gap-1.5">
            {props.yesterdayLog?.morningWeightKg !== undefined ? (
              <QuickValueButton label={`昨日 ${props.yesterdayLog.morningWeightKg}kg`} onClick={() => props.onQuickAction({ morningWeightKg: props.yesterdayLog!.morningWeightKg })} />
            ) : null}
            {props.selectedLog.morningWeightKg !== undefined ? (
              <>
                <QuickValueButton label="-0.2" onClick={() => props.onQuickAction({ morningWeightKg: Math.round((props.selectedLog.morningWeightKg! - 0.2) * 10) / 10 })} />
                <QuickValueButton label="+0.2" onClick={() => props.onQuickAction({ morningWeightKg: Math.round((props.selectedLog.morningWeightKg! + 0.2) * 10) / 10 })} />
              </>
            ) : null}
          </div>
        </div>

        <div className="grid gap-1">
          <NumberField className={quickFieldClass} label="热量 kcal" value={props.selectedLog.calories} range={{ min: 0, max: 10000, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ calories: value })} />
          <div className="flex flex-wrap gap-1.5">
            {props.calorieTarget !== undefined ? (
              <QuickValueButton label={`目标 ${props.calorieTarget}`} onClick={() => props.onQuickAction({ calories: props.calorieTarget })} />
            ) : null}
            {props.selectedLog.calories !== undefined ? (
              <>
                <QuickValueButton label="-200" onClick={() => props.onQuickAction({ calories: Math.max(0, props.selectedLog.calories! - 200) })} />
                <QuickValueButton label="+200" onClick={() => props.onQuickAction({ calories: props.selectedLog.calories! + 200 })} />
              </>
            ) : null}
          </div>
        </div>

        <div className="grid gap-1">
          <NumberField className={quickFieldClass} label="蛋白质 g" value={props.selectedLog.protein} range={{ min: 0, max: 500, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ protein: value })} />
          <div className="flex flex-wrap gap-1.5">
            {props.selectedTarget.protein !== undefined ? (
              <QuickValueButton label={`目标 ${props.selectedTarget.protein}g`} onClick={() => props.onQuickAction({ protein: props.selectedTarget.protein })} />
            ) : null}
            {props.yesterdayLog?.protein !== undefined ? (
              <QuickValueButton label={`昨日 ${props.yesterdayLog.protein}g`} onClick={() => props.onQuickAction({ protein: props.yesterdayLog!.protein })} />
            ) : null}
          </div>
        </div>

        <div className="grid gap-1">
          <NumberField className={quickFieldClass} label="步数" value={props.selectedLog.steps} range={{ min: 0, max: 100000, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ steps: value })} />
          <div className="flex flex-wrap gap-1.5">
            {props.selectedTarget.stepTarget !== undefined ? (
              <QuickValueButton label={`目标 ${props.selectedTarget.stepTarget}`} onClick={() => props.onQuickAction({ steps: props.selectedTarget.stepTarget })} />
            ) : null}
            {props.yesterdayLog?.steps !== undefined ? (
              <QuickValueButton label={`昨日 ${props.yesterdayLog.steps}步`} onClick={() => props.onQuickAction({ steps: props.yesterdayLog!.steps })} />
            ) : null}
          </div>
        </div>

        <div className="grid gap-1">
          <NumberField className={quickFieldClass} label="睡眠 h" value={props.selectedLog.sleepHours} step="0.1" kind="decimal" range={{ min: 0, max: 24, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ sleepHours: value })} />
          <div className="flex flex-wrap gap-1.5">
            {props.yesterdayLog?.sleepHours !== undefined ? (
              <QuickValueButton label={`昨日 ${props.yesterdayLog.sleepHours}h`} onClick={() => props.onQuickAction({ sleepHours: props.yesterdayLog!.sleepHours })} />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
