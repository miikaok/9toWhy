import type { AppLocale } from "@/i18n/types"

export function roundDuration(minutes: number, roundTo: number): number {
  if (roundTo <= 1) return Math.round(minutes)
  return Math.round(minutes / roundTo) * roundTo
}

export function floorDuration(minutes: number, step: number): number {
  if (step <= 1) return Math.floor(minutes)
  return Math.floor(minutes / step) * step
}

const UNIT_LABELS: Record<AppLocale, { hour: string; minute: string }> = {
  en: { hour: "h", minute: "m" },
  fi: { hour: "h", minute: "min" },
  sv: { hour: "h", minute: "min" },
  pl: { hour: "g", minute: "min" },
  es: { hour: "h", minute: "min" },
}

export function formatDuration(minutes: number, locale: AppLocale = "en"): string {
  const sign = minutes < 0 ? "-" : ""
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = Math.round(abs % 60)
  const labels = UNIT_LABELS[locale] ?? UNIT_LABELS.en
  return `${sign}${h}${labels.hour} ${String(m).padStart(2, "0")}${labels.minute}`
}

export function formatDurationShort(minutes: number, locale: AppLocale = "en"): string {
  const sign = minutes < 0 ? "-" : "+"
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = Math.round(abs % 60)
  const labels = UNIT_LABELS[locale] ?? UNIT_LABELS.en
  if (h === 0) return `${sign}${m}${labels.minute}`
  return `${sign}${h}:${String(m).padStart(2, "0")}`
}

export function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function msToMinutes(ms: number): number {
  return ms / 60000
}

export function minutesToMs(minutes: number): number {
  return minutes * 60000
}

export function formatTimeInput(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function parseTimeInput(value: string): number {
  const [h, m] = value.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function dateTimeToIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}

export function hasOverlap(
  startIso: string,
  endIso: string,
  entries: ReadonlyArray<{ id: number; startTime: string; endTime: string }>,
  excludeId?: number
): boolean {
  const startMs = new Date(startIso).getTime()
  const endMs = new Date(endIso).getTime()
  return entries.some((entry) => {
    if (excludeId !== undefined && entry.id === excludeId) return false
    const entryStartMs = new Date(entry.startTime).getTime()
    const entryEndMs = new Date(entry.endTime).getTime()
    return startMs < entryEndMs && endMs > entryStartMs
  })
}
