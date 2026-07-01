import type { BodyMetricType, BodyRecord, DailyLog } from '../types'

export const BODY_METRIC_DEFINITIONS: ReadonlyArray<{
  type: BodyMetricType
  label: string
  label_en: string
  unit: BodyRecord['unit']
  group: 'basic' | 'upper' | 'lower'
  min: number
  max: number
}> = [
  { type: 'weight', label: '体重', label_en: 'Weight', unit: 'kg', group: 'basic', min: 20, max: 300 },
  { type: 'bodyfat', label: '体脂率', label_en: 'Body fat', unit: '%', group: 'basic', min: 1, max: 80 },
  { type: 'neck', label: '脖围', label_en: 'Neck', unit: 'cm', group: 'basic', min: 10, max: 100 },
  { type: 'chest', label: '胸围', label_en: 'Chest', unit: 'cm', group: 'upper', min: 30, max: 250 },
  { type: 'weist', label: '腰围', label_en: 'Waist', unit: 'cm', group: 'basic', min: 30, max: 250 },
  { type: 'shoulder', label: '肩宽', label_en: 'Shoulder', unit: 'cm', group: 'upper', min: 20, max: 150 },
  { type: 'bot', label: '臀围', label_en: 'Hip', unit: 'cm', group: 'lower', min: 30, max: 250 },
  { type: 'arm_left', label: '左臂围', label_en: 'Left arm', unit: 'cm', group: 'upper', min: 10, max: 100 },
  { type: 'arm_right', label: '右臂围', label_en: 'Right arm', unit: 'cm', group: 'upper', min: 10, max: 100 },
  { type: 'forearm_left', label: '左小臂围', label_en: 'Left forearm', unit: 'cm', group: 'upper', min: 8, max: 80 },
  { type: 'forearm_right', label: '右小臂围', label_en: 'Right forearm', unit: 'cm', group: 'upper', min: 8, max: 80 },
  { type: 'leg_left', label: '左腿围', label_en: 'Left leg', unit: 'cm', group: 'lower', min: 20, max: 150 },
  { type: 'leg_right', label: '右腿围', label_en: 'Right leg', unit: 'cm', group: 'lower', min: 20, max: 150 },
  { type: 'cav_left', label: '左小腿围', label_en: 'Left calf', unit: 'cm', group: 'lower', min: 10, max: 100 },
  { type: 'cav_right', label: '右小腿围', label_en: 'Right calf', unit: 'cm', group: 'lower', min: 10, max: 100 },
]

export const BODY_METRIC_TYPES = BODY_METRIC_DEFINITIONS.map((item) => item.type)

export function isBodyMetricType(value: unknown): value is BodyMetricType {
  return typeof value === 'string' && BODY_METRIC_TYPES.includes(value as BodyMetricType)
}

export function bodyMetricDefinition(type: BodyMetricType) {
  return BODY_METRIC_DEFINITIONS.find((item) => item.type === type)!
}

export function bodyRecordsForDate(records: BodyRecord[], datestr: string): BodyRecord[] {
  return records.filter((record) => record.datestr === datestr)
}

export function bodyValue(records: BodyRecord[], datestr: string, type: BodyMetricType): number | undefined {
  return records.find((record) => record.datestr === datestr && record.type === type)?.value
}

export function latestBodyRecord(
  records: BodyRecord[],
  type: BodyMetricType,
  onOrBefore?: string,
): BodyRecord | undefined {
  return records
    .filter((record) => record.type === type && (!onOrBefore || record.datestr <= onOrBefore))
    .sort((a, b) => b.datestr.localeCompare(a.datestr))[0]
}

export function upsertBodyRecords(current: BodyRecord[], incoming: BodyRecord[]): BodyRecord[] {
  const next = new Map(current.map((record) => [`${record.datestr}:${record.type}`, record]))
  incoming.forEach((record) => next.set(`${record.datestr}:${record.type}`, record))
  return Array.from(next.values()).sort((a, b) =>
    a.datestr === b.datestr ? a.type.localeCompare(b.type) : a.datestr.localeCompare(b.datestr),
  )
}

export function removeBodyRecord(current: BodyRecord[], datestr: string, type: BodyMetricType): BodyRecord[] {
  return current.filter((record) => record.datestr !== datestr || record.type !== type)
}

function averagePair(left: number | undefined, right: number | undefined): number | undefined {
  if (left === undefined) return right
  if (right === undefined) return left
  return Math.round(((left + right) / 2) * 10) / 10
}

export function dailyLogsWithBodyMetrics(logs: DailyLog[], records: BodyRecord[]): DailyLog[] {
  return logs.map((log) => ({
    ...log,
    morningWeightKg: bodyValue(records, log.date, 'weight'),
    waistCm: bodyValue(records, log.date, 'weist'),
    chestCm: bodyValue(records, log.date, 'chest'),
    upperArmCm: averagePair(
      bodyValue(records, log.date, 'arm_left'),
      bodyValue(records, log.date, 'arm_right'),
    ),
    thighCm: averagePair(
      bodyValue(records, log.date, 'leg_left'),
      bodyValue(records, log.date, 'leg_right'),
    ),
  }))
}
