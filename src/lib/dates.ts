import type { DayKey } from '../types'

export function formatDateInput(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isValidDateInput(value: string): boolean {
  if (typeof value !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export function parseDateInput(value: string): Date {
  if (!isValidDateInput(value)) return new Date(NaN)
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getDayKey(dateValue: string): DayKey {
  const date = parseDateInput(dateValue)
  if (Number.isNaN(date.getTime())) {
    return new Date().getDay() as DayKey
  }
  return date.getDay() as DayKey
}

export function addDays(dateValue: string, days: number): string {
  const date = parseDateInput(dateValue)
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date()
    fallback.setDate(fallback.getDate() + days)
    return formatDateInput(fallback)
  }
  date.setDate(date.getDate() + days)
  return formatDateInput(date)
}

export function startOfWeekSunday(dateValue: string): string {
  const date = parseDateInput(dateValue)
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date()
    fallback.setDate(fallback.getDate() - fallback.getDay())
    return formatDateInput(fallback)
  }
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
