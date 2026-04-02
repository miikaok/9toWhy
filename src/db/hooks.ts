import { useLiveQuery } from "dexie-react-hooks"
import { db, DEFAULT_SETTINGS, DEFAULT_TIMER_STATE } from "./index"
import type { Settings, TimerState, WorkEntry } from "./index"

export function useSettings(): Settings {
  const settings = useLiveQuery(() => db.settings.get("default"))
  return settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS
}

export function useTimerState(): TimerState {
  const state = useLiveQuery(() => db.timerState.get("active"))
  return state ?? DEFAULT_TIMER_STATE
}

export function useEntriesForDate(date: string): WorkEntry[] {
  const entries = useLiveQuery(
    () => db.workEntries.where("date").equals(date).toArray(),
    [date]
  )
  return entries ?? []
}

export function useEntriesForMonth(year: number, month: number): WorkEntry[] {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`
  const entries = useLiveQuery(
    () =>
      db.workEntries
        .where("date")
        .between(startDate, endDate, true, true)
        .toArray(),
    [year, month]
  )
  return entries ?? []
}

export function useEntriesInRange(
  startDate: string,
  endDate: string
): WorkEntry[] {
  const entries = useLiveQuery(
    () =>
      db.workEntries
        .where("date")
        .between(startDate, endDate, true, true)
        .toArray(),
    [startDate, endDate]
  )
  return entries ?? []
}

export function useAllEntries(): WorkEntry[] {
  const entries = useLiveQuery(() => db.workEntries.toArray())
  return entries ?? []
}

export async function saveSettings(settings: Partial<Settings>) {
  await db.settings.put({ ...DEFAULT_SETTINGS, ...settings, id: "default" })
}

export async function saveTimerState(state: Partial<TimerState>) {
  const current = (await db.timerState.get("active")) ?? DEFAULT_TIMER_STATE
  await db.timerState.put({ ...current, ...state, id: "active" })
}

export async function addWorkEntry(entry: Omit<WorkEntry, "id">) {
  return db.workEntries.add(entry as WorkEntry)
}

export async function updateWorkEntry(id: number, changes: Partial<WorkEntry>) {
  return db.workEntries.update(id, changes)
}

export async function deleteWorkEntry(id: number) {
  return db.workEntries.delete(id)
}

export async function initializeDefaults() {
  const settings = await db.settings.get("default")
  if (!settings) {
    await db.settings.put(DEFAULT_SETTINGS)
  }
  const timer = await db.timerState.get("active")
  if (!timer) {
    await db.timerState.put(DEFAULT_TIMER_STATE)
  }
}
