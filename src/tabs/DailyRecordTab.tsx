import { Card, Field, TextArea } from '../components/ui'
import { MiniCalendar } from '../components/MiniCalendar'
import { DateNavigator } from '../components/DateNavigator'
import { NumberField } from '../components/NumberField'
import { Badge, Button } from '../components/ui'
import type { DailyLog, DailyTarget, WorkoutLog } from '../types'
import type { SyncState } from '../lib/storage'

type DailyRecordTabProps = {
  selectedDate: string
  today: string
  selectedLog: Partial<DailyLog> & { date: string }
  selectedTarget: DailyTarget
  dailyLogs: DailyLog[]
  workoutLogs: WorkoutLog[]
  syncState: SyncState
  onDateChange: (date: string) => void
  onUpdateDailyLog: (patch: Partial<DailyLog>) => void
  onQuickAction: (patch: Partial<DailyLog>) => void
}

export function DailyRecordTab(props: DailyRecordTabProps) {
  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">每日记录</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">手机端先填快捷项，完整围度和备注有时间再补。</p>
        </div>
        <DateNavigator selectedDate={props.selectedDate} today={props.today} onChange={props.onDateChange} />
      </div>

      <div className="mt-4">
        <MiniCalendar
          selectedDate={props.selectedDate}
          today={props.today}
          dailyLogs={props.dailyLogs}
          workoutLogs={props.workoutLogs}
          onSelectDate={props.onDateChange}
        />
      </div>

      <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-700/40 dark:bg-emerald-900/30">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-emerald-950 dark:text-emerald-100">1 分钟快捷记录</h3>
            <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">优先填这些字段，足够支撑今日预算、周报和趋势判断。</p>
          </div>
          <Badge tone="positive">快捷</Badge>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <NumberField label="体重 kg" value={props.selectedLog.morningWeightKg} step="0.1" kind="decimal" range={{ min: 20, max: 300 }} onChange={(value) => props.onUpdateDailyLog({ morningWeightKg: value })} />
          <NumberField label="热量 kcal" value={props.selectedLog.calories} range={{ min: 0, max: 10000, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ calories: value })} />
          <NumberField label="蛋白质 g" value={props.selectedLog.protein} range={{ min: 0, max: 500, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ protein: value })} />
          <NumberField label="步数" value={props.selectedLog.steps} range={{ min: 0, max: 100000, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ steps: value })} />
          <NumberField label="睡眠 h" value={props.selectedLog.sleepHours} step="0.1" kind="decimal" range={{ min: 0, max: 24, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ sleepHours: value })} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" className="px-3" onClick={() => props.onQuickAction({ sleepHours: 7 })}>睡眠 7h</Button>
          <Button variant="secondary" className="px-3" onClick={() => props.onQuickAction({ trained: true, workoutCompletion: 100 })}>训练 100%</Button>
          <Button variant="secondary" className="px-3" onClick={() => props.onQuickAction({ steps: props.selectedTarget.stepTarget })}>步数达标</Button>
          <span className="self-center text-xs text-emerald-800 dark:text-emerald-200">
            {props.syncState === 'synced' ? '已保存到服务器' : props.syncState === 'saving' ? '保存中...' : '离线缓存中'}
          </span>
        </div>
      </div>

      <details className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-600/40 dark:bg-amber-900/30">
        <summary className="cursor-pointer text-sm font-semibold text-amber-950">身体状态</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <NumberField label="训练完成度 %" value={props.selectedLog.workoutCompletion} range={{ min: 0, max: 100, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ workoutCompletion: value })} />
          <NumberField label="肩痛评分 0-10（可选）" value={props.selectedLog.shoulderPainScore} range={{ min: 0, max: 10, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ shoulderPainScore: value })} />
          <NumberField label="疲劳评分 0-10（可选）" value={props.selectedLog.fatigueScore} range={{ min: 0, max: 10, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ fatigueScore: value })} />
        </div>
      </details>

      <details className="mt-5 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-200">更多记录</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label="腰围 cm" value={props.selectedLog.waistCm} step="0.1" kind="decimal" range={{ min: 30, max: 200 }} onChange={(value) => props.onUpdateDailyLog({ waistCm: value })} />
          <NumberField label="胸围 cm（可选）" value={props.selectedLog.chestCm} step="0.1" kind="decimal" range={{ min: 30, max: 200 }} onChange={(value) => props.onUpdateDailyLog({ chestCm: value })} />
          <NumberField label="上臂围 cm（可选）" value={props.selectedLog.upperArmCm} step="0.1" kind="decimal" range={{ min: 30, max: 200 }} onChange={(value) => props.onUpdateDailyLog({ upperArmCm: value })} />
          <NumberField label="大腿围 cm（可选）" value={props.selectedLog.thighCm} step="0.1" kind="decimal" range={{ min: 30, max: 200 }} onChange={(value) => props.onUpdateDailyLog({ thighCm: value })} />
          <NumberField label="实际碳水 g" value={props.selectedLog.carbs} range={{ min: 0, max: 1000, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ carbs: value })} />
          <NumberField label="实际脂肪 g" value={props.selectedLog.fat} range={{ min: 0, max: 500, allowZero: true }} onChange={(value) => props.onUpdateDailyLog({ fat: value })} />
          <Field label="是否训练">
            <select
              value={props.selectedLog.trained === undefined ? '' : props.selectedLog.trained ? 'yes' : 'no'}
              onChange={(event) => props.onUpdateDailyLog({ trained: event.target.value === '' ? undefined : event.target.value === 'yes' })}
              className="h-11 rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
            >
              <option value="">未填写</option>
              <option value="yes">是</option>
              <option value="no">否</option>
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="备注">
            <TextArea value={props.selectedLog.notes ?? ''} onChange={(event) => props.onUpdateDailyLog({ notes: event.target.value })} />
          </Field>
        </div>
      </details>
    </Card>
  )
}
