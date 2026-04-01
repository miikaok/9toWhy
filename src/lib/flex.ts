import { format } from "date-fns"
import type { WorkEntry, Settings } from "@/db"

export function getEffectiveDailyTarget(settings: Settings): number {
  return settings.totalWorkMinutes - settings.breakMinutes
}

export function getDailyWorkedMinutes(entries: WorkEntry[]): number {
  return entries.reduce((sum, e) => sum + e.duration, 0)
}

export function getRawWorkedMinutes(entries: WorkEntry[]): number {
  return entries
    .filter((entry) => entry.type !== "flex")
    .reduce((sum, entry) => {
      const start = new Date(entry.startTime).getTime()
      const end = new Date(entry.endTime).getTime()
      const minutes = Math.max((end - start) / 60000, 0)
      return sum + minutes
    }, 0)
}

export function getNetWorkedMinutesForFlex(
  entries: WorkEntry[],
  settings: Settings
): number {
  const rawWorked = getRawWorkedMinutes(entries)
  if (rawWorked <= 0) return 0
  return Math.max(rawWorked - settings.breakMinutes, 0)
}

export function getDailyFlex(entries: WorkEntry[], settings: Settings): number {
  if (entries.length === 0) return 0
  const netWorked = getNetWorkedMinutesForFlex(entries, settings)
  return netWorked - getEffectiveDailyTarget(settings)
}

export interface DaySummary {
  date: string
  workedMinutes: number
  dailyFlex: number
  entries: WorkEntry[]
  hasEntries: boolean
  hasFlexEntry: boolean
}

export function groupEntriesByDate(
  entries: WorkEntry[]
): Map<string, WorkEntry[]> {
  const map = new Map<string, WorkEntry[]>()
  for (const entry of entries) {
    const existing = map.get(entry.date) ?? []
    existing.push(entry)
    map.set(entry.date, existing)
  }
  return map
}

export function calculateTotalFlex(
  entries: WorkEntry[],
  settings: Settings
): number {
  const byDate = groupEntriesByDate(entries)
  let total = 0
  for (const [, dayEntries] of byDate) {
    total += getDailyFlex(dayEntries, settings)
  }
  return total
}

export function calculateFlexBeforeDate(
  entries: WorkEntry[],
  settings: Settings,
  date: string
): number {
  const byDate = groupEntriesByDate(entries)
  let total = 0
  for (const [entryDate, dayEntries] of byDate) {
    if (entryDate >= date) continue
    total += getDailyFlex(dayEntries, settings)
  }
  return total
}

export function getDaySummary(
  date: string,
  entries: WorkEntry[],
  settings: Settings
): DaySummary {
  const dayEntries = entries.filter((e) => e.date === date)
  return {
    date,
    workedMinutes: getDailyWorkedMinutes(dayEntries),
    dailyFlex: getDailyFlex(dayEntries, settings),
    entries: dayEntries,
    hasEntries: dayEntries.length > 0,
    hasFlexEntry: dayEntries.some((e) => e.type === "flex"),
  }
}

export function todayDateString(): string {
  return format(new Date(), "yyyy-MM-dd")
}
