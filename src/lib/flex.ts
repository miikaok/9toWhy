import { format } from "date-fns"
import type { WorkEntry, Settings } from "@/db"
import { roundDuration } from "./time.ts"

// Logged work includes the break in its clock span, so earning flex still
// starts only after the full scheduled day.
export function getEffectiveDailyTarget(settings: Settings): number {
  return settings.totalWorkMinutes
}

// A day with no work needs flex for the scheduled work, not its unpaid break.
export function getDailyOffCost(settings: Settings): number {
  return Math.max(settings.totalWorkMinutes - settings.breakMinutes, 0)
}

export function getFullDaysOff(
  balanceMinutes: number,
  settings: Settings
): number {
  const dailyCost = getDailyOffCost(settings)
  return dailyCost > 0 ? Math.max(Math.floor(balanceMinutes / dailyCost), 0) : 0
}

function hasWork(entries: WorkEntry[]): boolean {
  return entries.some((e) => e.type === "timer" || e.type === "manual")
}

export function getDailyFlexUsed(
  entries: WorkEntry[],
  settings: Settings
): number {
  const flexMinutes = entries
    .filter((e) => e.type === "flex")
    .reduce((sum, e) => sum + e.duration, 0)
  if (hasWork(entries)) return flexMinutes

  // Full-day entries may cover the whole clock span. Waive only the part
  // above the day-off cost, up to one break per day, including split entries.
  const breakCovered = Math.min(
    Math.max(flexMinutes - getDailyOffCost(settings), 0),
    Math.max(settings.breakMinutes, 0)
  )
  return flexMinutes - breakCovered
}

export function getRemainingDayMinutes(
  entries: WorkEntry[],
  settings: Settings
): number {
  const target = hasWork(entries)
    ? getEffectiveDailyTarget(settings)
    : getDailyOffCost(settings)
  return Math.max(target - getDailyWorkedMinutes(entries), 0)
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
  const nonFlex = entries.filter(
    (e) => e.type === "timer" || e.type === "manual"
  )
  if (nonFlex.length === 0) return 0
  const workedMinutes = getDailyWorkedMinutes(nonFlex)
  return roundDuration(
    workedMinutes - settings.totalWorkMinutes,
    settings.roundToMinutes
  )
}

// Bug B fix: net balance for a single day, matching BankView's formula.
// Only credit overtime (positive earned flex); debit flex with the full-day
// break allowance when no work was logged.
// Deficit days (underworked without flex coverage) do not affect the balance,
// consistent with how BankView displays transactions.
export function netDayFlexBalance(
  dayEntries: WorkEntry[],
  settings: Settings
): number {
  const earned = getDailyFlex(dayEntries, settings)
  const used = getDailyFlexUsed(dayEntries, settings)
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
    hasEntries: dayEntries.some((e) => e.type !== "import"),
    hasFlexEntry: dayEntries.some((e) => e.type === "flex"),
  }
}

export function todayDateString(): string {
  return format(new Date(), "yyyy-MM-dd")
}
