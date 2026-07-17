import { BODY_METRIC_DEFINITIONS } from '../../lib/bodyMetrics'
import type { BodyMetricType, BodyRecord } from '../../types'
import { QuickAdjustNumberField } from '../NumberField'
import { Badge, Button, DisclosurePanel } from '../ui'
import { getBodyRecordStatus } from './bodyRecordStatus'

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

const commonMetricTypes: BodyMetricType[] = ['bodyfat', 'weist']

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
        const status = record ? getBodyRecordStatus(record) : undefined
        return (
          <div
            key={definition.type}
            className="min-w-0 border-b border-[var(--surface-border)] pb-3 last:border-b-0 dark:border-slate-700 sm:[&:nth-last-child(-n+2)]:border-b-0"
          >
            <QuickAdjustNumberField
              className="h-11 min-w-[7.5rem] text-base tabular-nums"
              label={`${definition.label} ${definition.unit}`}
              value={record?.value}
              inputStep="0.1"
              kind="decimal"
              range={{ min: definition.min, max: definition.max }}
              quickStep={0.1}
              quickStepLabel="0.1"
              controlPlacement="inline"
              footerLeading={status ? <Badge tone={status.tone}>{status.label}</Badge> : undefined}
              onChange={(value) => onChange(definition.type, value)}
            />
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
    (item) => item.type !== 'weight' && (
      item.group === 'upper' || (item.group === 'basic' && !commonMetricTypes.includes(item.type))
    ),
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
  const summary = bodySummary(records)
  return (
    <DisclosurePanel
      className={className}
      title={(
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2">
          <div className="min-w-0">
            <span className="block text-base font-semibold text-slate-950 dark:text-slate-50">身体与围度</span>
            <span className="mt-0.5 block truncate text-xs font-normal text-slate-500 dark:text-slate-400">
              {summary || '体脂率、腰围及其他围度'}
            </span>
          </div>
          {pendingCount > 0 ? <Badge tone="warning">待同步 {pendingCount}</Badge> : null}
        </div>
      )}
      contentClassName="grid gap-4 p-4"
    >
      <BodyMetricFields records={records} onChange={onChange} />
      {pendingCount > 0 ? (
        <div className="flex justify-end border-t border-[var(--surface-border)] pt-4 dark:border-slate-700">
          <Button variant="secondary" onClick={onSync}>同步 {pendingCount} 项到训记</Button>
        </div>
      ) : null}
    </DisclosurePanel>
  )
}
