import { format } from "date-fns"
import type { WorkEntry, Settings } from "@/db"
import { roundDuration } from "@/lib/time"

// Bug A fix: breakMinutes is for Excel export display only.
// The timer runs continuously — the target is the full totalWorkMinutes.
export function getEffectiveDailyTarget(settings: Settings): number {
  return settings.totalWorkMinutes
}

// "import" entries are flex-balance adjustments, not actual work time.
export function getDailyWorkedMinutes(entries: WorkEntry[]): number {
  return entries
    .filter((e) => e.type !== "import")
    .reduce((sum, e) => sum + e.duration, 0)
}

// Returns how many minutes over/under target the non-flex work was for a day.
// Negative means underworked; 0 if no work entries exist.
export function getDailyFlex(entries: WorkEntry[], settings: Settings): number {
  const nonFlex = entries.filter((e) => e.type !== "flex")
  if (nonFlex.length === 0) return 0
  const workedMinutes = getDailyWorkedMinutes(nonFlex)
  return roundDuration(
    workedMinutes - settings.totalWorkMinutes,
    settings.roundToMinutes
  )
}

// Bug B fix: net balance for a single day, matching BankView's formula.
// Only credit overtime (positive earned flex); always debit explicit flex entries.
// Deficit days (underworked without flex coverage) do not affect the balance,
// consistent with how BankView displays transactions.
export function netDayFlexBalance(
  dayEntries: WorkEntry[],
  settings: Settings
): number {
  const earned = getDailyFlex(dayEntries, settings)
  const used = dayEntries
    .filter((e) => e.type === "flex")
    .reduce((sum, e) => sum + e.duration, 0)
  const imported = dayEntries
    .filter((e) => e.type === "import")
    .reduce((sum, e) => sum + e.duration, 0)
  return Math.max(earned, 0) - used + imported
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
    total += netDayFlexBalance(dayEntries, settings)
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
    total += netDayFlexBalance(dayEntries, settings)
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
