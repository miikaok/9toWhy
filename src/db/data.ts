import { db, DEFAULT_SETTINGS, DEFAULT_TIMER_STATE } from "./index"
import type { Settings, TimerState, WorkEntry } from "./index"

const EXPORT_FORMAT = "9towhy-backup"
const EXPORT_FORMAT_VERSION = 1

export interface DatabaseExport {
  format: typeof EXPORT_FORMAT
  formatVersion: number
  schemaVersion: number
  exportedAt: string
  data: {
    workEntries: WorkEntry[]
    settings: Settings[]
    timerState: TimerState[]
  }
}

/** Serialize the entire IndexedDB into a portable, human-readable backup object. */
export async function buildDatabaseExport(): Promise<DatabaseExport> {
  const [workEntries, settings, timerState] = await Promise.all([
    db.workEntries.toArray(),
    db.settings.toArray(),
    db.timerState.toArray(),
  ])
  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    data: { workEntries, settings, timerState },
  }
}

/** Trigger a download of the full database as a pretty-printed `.db` file. */
export async function exportDatabase(): Promise<string> {
  const payload = await buildDatabaseExport()
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const stamp = payload.exportedAt.slice(0, 19).replace(/[:T]/g, "-")
  const fileName = `9towhy-backup-${stamp}.db`
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
  return fileName
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

interface BackupEnvelope {
  data: {
    workEntries: unknown[]
    settings: unknown[]
    timerState: unknown[]
  }
}

function isBackupEnvelope(value: unknown): value is BackupEnvelope {
  if (!isRecord(value)) return false
  if (value.format !== EXPORT_FORMAT) return false
  const data = value.data
  return (
    isRecord(data) &&
    Array.isArray(data.workEntries) &&
    Array.isArray(data.settings) &&
    Array.isArray(data.timerState)
  )
}

/**
 * Coerce a raw backup work entry into a valid record. Optional/legacy fields
 * such as `note` (which JSON drops when it was `undefined`) are defaulted, but
 * a missing or mistyped *essential* field rejects the whole import rather than
 * silently dropping the row.
 */
function normalizeWorkEntry(value: unknown, index: number): WorkEntry {
  if (!isRecord(value)) {
    throw new Error(`invalid-workEntries-${index}-notObject`)
  }
  const required: [keyof WorkEntry, string][] = [
    ["id", "number"],
    ["date", "string"],
    ["startTime", "string"],
    ["endTime", "string"],
    ["duration", "number"],
  ]
  for (const [field, expected] of required) {
    if (typeof value[field] !== expected) {
      throw new Error(`invalid-workEntries-${index}-${String(field)}`)
    }
  }
  const validTypes: WorkEntry["type"][] = ["timer", "manual", "flex", "import"]
  const type = validTypes.includes(value.type as WorkEntry["type"])
    ? (value.type as WorkEntry["type"])
    : "manual"
  return {
    id: value.id as number,
    date: value.date as string,
    startTime: value.startTime as string,
    endTime: value.endTime as string,
    duration: value.duration as number,
    type,
    note: typeof value.note === "string" ? value.note : "",
  }
}

/**
 * Pick the singleton settings row from a backup (ignoring any stray rows) and
 * merge it over the defaults so missing/legacy fields are filled in.
 */
function pickSettings(rows: unknown[]): Settings {
  const row = rows.find((r) => isRecord(r) && r.id === "default")
  return {
    ...DEFAULT_SETTINGS,
    ...(isRecord(row) ? (row as Partial<Settings>) : {}),
    id: "default",
  }
}

/** Pick the singleton timer row, merged over defaults; strays are ignored. */
function pickTimerState(rows: unknown[]): TimerState {
  const row = rows.find((r) => isRecord(r) && r.id === "active")
  const source = isRecord(row) ? row : {}
  const running = source.running ?? DEFAULT_TIMER_STATE.running
  const accumulatedMs = source.accumulatedMs ?? DEFAULT_TIMER_STATE.accumulatedMs
  const startedAt = source.startedAt ?? null
  const pausedAt = source.pausedAt ?? null
  return {
    id: "active",
    running: typeof running === "boolean" ? running : DEFAULT_TIMER_STATE.running,
    accumulatedMs:
      typeof accumulatedMs === "number"
        ? accumulatedMs
        : DEFAULT_TIMER_STATE.accumulatedMs,
    startedAt: typeof startedAt === "string" ? startedAt : null,
    pausedAt: typeof pausedAt === "string" ? pausedAt : null,
  }
}

export interface ImportResult {
  workEntries: number
  settings: number
  timerState: number
}

/**
 * Replace all local data with the contents of a backup file.
 * Validates the payload and applies it inside a single transaction so a
 * malformed file can never leave the database half-written.
 */
export async function importDatabase(file: File): Promise<ImportResult> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("invalid-json")
  }
  if (!isBackupEnvelope(parsed)) {
    throw new Error("invalid-format")
  }
  // Normalize/validate up front so a bad record aborts before we clear the DB.
  // Work entries are validated strictly (no silent drops); the singleton
  // settings/timer rows are selected and merged over defaults so stray or
  // legacy rows never fail the whole import.
  const workEntries = parsed.data.workEntries.map(normalizeWorkEntry)
  const settings = pickSettings(parsed.data.settings)
  const timerState = pickTimerState(parsed.data.timerState)
  await db.transaction(
    "rw",
    db.workEntries,
    db.settings,
    db.timerState,
    async () => {
      await Promise.all([
        db.workEntries.clear(),
        db.settings.clear(),
        db.timerState.clear(),
      ])
      await db.workEntries.bulkAdd(workEntries)
      await db.settings.put(settings)
      await db.timerState.put(timerState)
    }
  )
  return {
    workEntries: workEntries.length,
    settings: 1,
    timerState: 1,
  }
}

/** Wipe user data and re-seed singleton defaults so the app stays usable. */
export async function clearAllData(): Promise<void> {
  await db.transaction(
    "rw",
    db.workEntries,
    db.settings,
    db.timerState,
    async () => {
      await Promise.all([
        db.workEntries.clear(),
        db.settings.clear(),
        db.timerState.clear(),
      ])
      await db.settings.put(DEFAULT_SETTINGS)
      await db.timerState.put(DEFAULT_TIMER_STATE)
    }
  )
}
