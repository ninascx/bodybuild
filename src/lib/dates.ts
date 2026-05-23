import type { DayKey } from '../types'

export function formatDateInput(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getDayKey(dateValue: string): DayKey {
  return parseDateInput(dateValue).getDay() as DayKey
}

export function addDays(dateValue: string, days: number): string {
  const date = parseDateInput(dateValue)
  date.setDate(date.getDate() + days)
  return formatDateInput(date)
}

export function startOfWeekSunday(dateValue: string): string {
  const date = parseDateInput(dateValue)
  date.setDate(date.getDate() - date.getDay())
  return formatDateInput(date)
}

export function endOfWeekSaturday(dateValue: string): string {
  return addDays(startOfWeekSunday(dateValue), 6)
}

export function isDateInRange(dateValue: string, start: string, end: string): boolean {
  return dateValue >= start && dateValue <= end
}

export function sortByDateAsc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.date.localeCompare(b.date))
}

export function sortByDateDesc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date))
}

export function getRecentWindow<T extends { date: string }>(items: T[], endDate: string, days: number): T[] {
  const start = addDays(endDate, -(days - 1))
  return sortByDateAsc(items).filter((item) => isDateInRange(item.date, start, endDate))
}
