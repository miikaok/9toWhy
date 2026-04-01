import Dexie, { type EntityTable } from "dexie"
import type { AppLocale } from "@/i18n/types"

export interface WorkEntry {
  id: number
  date: string // YYYY-MM-DD
  startTime: string // ISO timestamp
  endTime: string // ISO timestamp
  duration: number // minutes (rounded)
  type: "timer" | "manual" | "flex"
  note: string
}

export interface Settings {
  id: string // singleton "default"
  defaultStartTime: string // HH:MM
  defaultEndTime: string // HH:MM
  totalWorkMinutes: number
  breakMinutes: number
  maxWorkMinutes: number
  roundToMinutes: number
  hapticMode: "off" | "subtle" | "full"
  locale: AppLocale
}

export interface TimerState {
  id: string // singleton "active"
  running: boolean
  startedAt: string | null // ISO timestamp
  pausedAt: string | null // ISO timestamp
  accumulatedMs: number
}

export const DEFAULT_SETTINGS: Settings = {
  id: "default",
  defaultStartTime: "09:00",
  defaultEndTime: "17:00",
  totalWorkMinutes: 480,
  breakMinutes: 30,
  maxWorkMinutes: 720,
  roundToMinutes: 15,
  hapticMode: "full",
  locale: "en",
}

export const DEFAULT_TIMER_STATE: TimerState = {
  id: "active",
  running: false,
  startedAt: null,
  pausedAt: null,
  accumulatedMs: 0,
}

const db = new Dexie("9toWhyDB") as Dexie & {
  workEntries: EntityTable<WorkEntry, "id">
  settings: EntityTable<Settings, "id">
  timerState: EntityTable<TimerState, "id">
}

db.version(1).stores({
  workEntries: "++id, date",
  settings: "id",
  timerState: "id",
})

export { db }
