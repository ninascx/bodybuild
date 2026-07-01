import { BODY_METRIC_DEFINITIONS } from '../../lib/bodyMetrics'
import type { BodyMetricType, BodyRecord } from '../../types'
import { NumberField } from '../NumberField'
import { Badge, Button, DisclosurePanel } from '../ui'

function recordsByType(records: BodyRecord[]): Map<BodyMetricType, BodyRecord> {
  return new Map(records.map((record) => [record.type, record]))
}

function bodySummary(records: BodyRecord[]): string {
  const byType = recordsByType(records)
  return ['weight', 'bodyfat', 'weist']
    .flatMap((type) => {
      const record = byType.get(type as BodyMetricType)
      return record ? [`${record.label} ${record.value}${record.unit}`] : []
    })
    .join(' · ')
}

const commonMetricTypes: BodyMetricType[] = ['weight', 'bodyfat', 'weist']

function recordStatus(record: BodyRecord): { label: string; tone: 'positive' | 'warning' | 'neutral' } {
  if (record.origin === 'xunji') return { label: '已同步', tone: 'positive' }
  if (record.origin?.startsWith('legacy')) return { label: '旧数据', tone: 'neutral' }
  if (record.synced_at) return { label: '已修改，待同步', tone: 'warning' }
  return { label: '仅本地', tone: 'neutral' }
}

function MetricFields({
  records,
  definitions,
  onChange,
}: {
  records: BodyRecord[]
  definitions: typeof BODY_METRIC_DEFINITIONS
  onChange: (type: BodyMetricType, value: number | undefined) => void
}) {
  const byType = recordsByType(records)
  return (
    <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
      {definitions.map((definition) => {
        const record = byType.get(definition.type)
        const status = record ? recordStatus(record) : undefined
        return (
          <div
            key={definition.type}
            data-daily-focus={definition.type === 'weight' ? 'weight' : undefined}
            className="min-w-0 border-b border-[var(--surface-border)] pb-3 last:border-b-0 dark:border-slate-700 sm:[&:nth-last-child(-n+2)]:border-b-0"
          >
            <NumberField
              label={`${definition.label} ${definition.unit}`}
              value={record?.value}
              step="0.1"
              kind="decimal"
              range={{ min: definition.min, max: definition.max }}
              onChange={(value) => onChange(definition.type, value)}
            />
            {status ? (
              <div className="mt-2 flex justify-end">
                <Badge tone={status.tone}>{status.label}</Badge>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function BodyMetricFields({
  records,
  onChange,
}: {
  records: BodyRecord[]
  onChange: (type: BodyMetricType, value: number | undefined) => void
}) {
  const common = BODY_METRIC_DEFINITIONS.filter((item) => commonMetricTypes.includes(item.type))
  const upper = BODY_METRIC_DEFINITIONS.filter(
    (item) => item.group === 'upper' || (item.group === 'basic' && !commonMetricTypes.includes(item.type)),
  )
  const lower = BODY_METRIC_DEFINITIONS.filter((item) => item.group === 'lower')
  return (
    <div className="grid gap-3">
      <MetricFields records={records} definitions={common} onChange={onChange} />
      <DisclosurePanel title="上肢与躯干" contentClassName="pt-3">
        <MetricFields records={records} definitions={upper} onChange={onChange} />
      </DisclosurePanel>
      <DisclosurePanel title="下肢围度" contentClassName="pt-3">
        <MetricFields records={records} definitions={lower} onChange={onChange} />
      </DisclosurePanel>
      <DisclosurePanel title="接口字段说明" contentClassName="grid gap-2 text-xs text-slate-600 dark:text-slate-300">
        {BODY_METRIC_DEFINITIONS.map((definition) => (
          <div key={definition.type} className="flex items-center justify-between gap-4">
            <span>{definition.label}</span>
            <code>{definition.type}</code>
          </div>
        ))}
      </DisclosurePanel>
    </div>
  )
}

export function DailyMeasurementCard({
  records,
  onChange,
  onSync,
  className = '',
}: {
  records: BodyRecord[]
  onChange: (type: BodyMetricType, value: number | undefined) => void
  onSync: () => void
  className?: string
}) {
  const pendingCount = records.filter((record) => record.origin !== 'xunji').length
  return (
    <section className={`rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-4 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">身体数据</h3>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
            {bodySummary(records) || '先保存在本项目，需要时再批量同步到训记。'}
          </p>
        </div>
        {pendingCount > 0 ? (
          <Button variant="secondary" onClick={onSync}>同步 {pendingCount} 项到训记</Button>
        ) : null}
      </div>
      <BodyMetricFields records={records} onChange={onChange} />
    </section>
  )
}

export function MeasurementPanel(props: Parameters<typeof DailyMeasurementCard>[0]) {
  return <DailyMeasurementCard {...props} />
}
