import * as XLSX from "xlsx"
import { format } from "date-fns"
import type { DaySummary } from "@/lib/flex"
import type { Settings } from "@/db"
import type { AppLocale } from "@/i18n/types"
import { getDateFnsLocale } from "@/lib/date-locale"

export interface ExcelTranslations {
  title: string
  sheetName: string
  colDate: string
  colStart: string
  colEnd: string
  colBreaks: string
  colWorked: string
  colFlexApplied: string
  colTarget: string
  colBalance: string
  rowMonthlyTotal: string
  rowDaysWorked: string
  rowTargetPerDay: string
}

// ── Cell helpers ────────────────────────────────────────────────────────────

function txt(v: string): XLSX.CellObject {
  return { t: "s", v }
}

/** Numeric cell, optionally with an Excel number-format string */
function num(v: number, z?: string): XLSX.CellObject {
  return z ? { t: "n", v, z } : { t: "n", v }
}

/** Formula cell — always numeric result, optionally formatted */
function fml(f: string, z?: string): XLSX.CellObject {
  return z ? { t: "n", f, z } : { t: "n", f }
}

function empty(): XLSX.CellObject {
  return { t: "s", v: "" }
}

/** Minutes → fraction of a 24-hour day (Excel time unit) */
const toDay = (minutes: number) => minutes / 1440

/** Set a cell and expand the sheet's ref range automatically */
function setCell(
  ws: XLSX.WorkSheet,
  col: number,
  row: number,
  cell: XLSX.CellObject,
  ref: { maxCol: number; maxRow: number }
) {
  ws[XLSX.utils.encode_cell({ c: col, r: row })] = cell
  if (col > ref.maxCol) ref.maxCol = col
  if (row > ref.maxRow) ref.maxRow = row
}

// ── Public export ───────────────────────────────────────────────────────────

export function exportMonthReport(
  days: DaySummary[],
  settings: Settings,
  month: Date,
  locale: AppLocale,
  tr: ExcelTranslations
): void {
  const dateLocale = getDateFnsLocale(locale)
  const monthLabel = format(month, "MMMM yyyy", { locale: dateLocale })
  const fileName = `work-hours-${format(month, "yyyy-MM")}.xlsx`

  const ws: XLSX.WorkSheet = {}
  const ref = { maxCol: 7, maxRow: 0 }
  const set = (c: number, r: number, cell: XLSX.CellObject) =>
    setCell(ws, c, r, cell, ref)

  // Column indices
  const C = {
    date: 0,
    start: 1,
    end: 2,
    breaks: 3,
    worked: 4,
    flex: 5,
    target: 6,
    balance: 7,
  }

  // Formats
  const FMT_TIME = "hh:mm" // for Start / End (within a day, max 24h)
  const FMT_DUR = "[h]:mm" // for durations that may exceed 24 h in totals
  const FMT_CNT = "0" // plain integer (days count)

  // ── Row 0: Title ──────────────────────────────────────────────────────────
  set(C.date, 0, txt(`${tr.title} — ${monthLabel}`))

  // ── Row 1: Empty ──────────────────────────────────────────────────────────

  // ── Row 2: Column headers ─────────────────────────────────────────────────
  const HDR_ROW = 2
  ;[
    tr.colDate,
    tr.colStart,
    tr.colEnd,
    tr.colBreaks,
    tr.colWorked,
    tr.colFlexApplied,
    tr.colTarget,
    tr.colBalance,
  ].forEach((h, i) => set(i, HDR_ROW, txt(h)))

  // ── Rows 3…3+N-1: Data ───────────────────────────────────────────────────
  const DATA_START = 3 // 0-based row index
  let rowIdx = DATA_START

  for (const day of days) {
    const { entries } = day

    const workEntries = entries.filter((e) => e.type !== "flex")
    const flexEntries = entries.filter((e) => e.type === "flex")

    const workMinutes = workEntries.reduce((sum, e) => sum + e.duration, 0)
    const flexMinutes = flexEntries.reduce((sum, e) => sum + e.duration, 0)

    // Full span across ALL logged entries (work + flex)
    const allStartMs = entries.map((e) => new Date(e.startTime).getTime())
    const allEndMs = entries.map((e) => new Date(e.endTime).getTime())
    const spanMinutes =
      entries.length > 0
        ? (Math.max(...allEndMs) - Math.min(...allStartMs)) / 60000
        : 0
    // Breaks = unlogged time within the work span
    const breakMinutes = Math.max(0, spanMinutes - workMinutes - flexMinutes)

    // Time-of-day fractions for Start / End
    const startFrac =
      entries.length > 0
        ? (() => {
            const d = new Date(Math.min(...allStartMs))
            return (d.getHours() * 60 + d.getMinutes()) / 1440
          })()
        : 0
    const endFrac =
      entries.length > 0
        ? (() => {
            const d = new Date(Math.max(...allEndMs))
            return (d.getHours() * 60 + d.getMinutes()) / 1440
          })()
        : 0

    const dateLabel = format(
      new Date(`${day.date}T00:00:00`),
      "EEEE, d MMMM yyyy",
      { locale: dateLocale }
    )

    const excelRow = rowIdx + 1 // Excel row number (1-based)

    set(C.date, rowIdx, txt(dateLabel))
    set(
      C.start,
      rowIdx,
      entries.length > 0 ? num(startFrac, FMT_TIME) : empty()
    )
    set(C.end, rowIdx, entries.length > 0 ? num(endFrac, FMT_TIME) : empty())
    set(C.breaks, rowIdx, num(toDay(breakMinutes), FMT_DUR))
    set(C.worked, rowIdx, num(toDay(workMinutes), FMT_DUR))
    set(C.flex, rowIdx, num(toDay(flexMinutes), FMT_DUR))
    set(C.target, rowIdx, num(toDay(settings.totalWorkMinutes), FMT_DUR))

    // Balance formula: Work – Target, but only when work entries exist
    // (mirrors getDailyFlex which returns 0 for flex-only days)
    const workedCol = XLSX.utils.encode_col(C.worked)
    const targetCol = XLSX.utils.encode_col(C.target)
    set(
      C.balance,
      rowIdx,
      fml(
        `IF(${workedCol}${excelRow}>0,${workedCol}${excelRow}-${targetCol}${excelRow},0)`,
        FMT_DUR
      )
    )

    rowIdx++
  }

  const DATA_END = rowIdx - 1 // last data row (0-based)

  // Excel address helpers for formula ranges
  const ds = DATA_START + 1 // data start, 1-based
  const de = DATA_END + 1 // data end,   1-based
  const colRange = (col: number) =>
    `${XLSX.utils.encode_col(col)}${ds}:${XLSX.utils.encode_col(col)}${de}`

  // ── Spacer row ────────────────────────────────────────────────────────────
  rowIdx++

  // ── Totals row ────────────────────────────────────────────────────────────
  set(C.date, rowIdx, txt(tr.rowMonthlyTotal))
  set(C.start, rowIdx, empty())
  set(C.end, rowIdx, empty())
  set(C.breaks, rowIdx, fml(`SUM(${colRange(C.breaks)})`, FMT_DUR))
  set(C.worked, rowIdx, fml(`SUM(${colRange(C.worked)})`, FMT_DUR))
  set(C.flex, rowIdx, fml(`SUM(${colRange(C.flex)})`, FMT_DUR))
  set(C.target, rowIdx, empty())
  set(C.balance, rowIdx, fml(`SUM(${colRange(C.balance)})`, FMT_DUR))
  rowIdx++

  // ── Days worked (COUNTA formula) ─────────────────────────────────────────
  set(C.date, rowIdx, txt(`${tr.rowDaysWorked}:`))
  set(C.start, rowIdx, fml(`COUNTA(${colRange(C.date)})`, FMT_CNT))
  rowIdx++

  // ── Target per day ────────────────────────────────────────────────────────
  set(C.date, rowIdx, txt(`${tr.rowTargetPerDay}:`))
  set(C.start, rowIdx, num(toDay(settings.totalWorkMinutes), FMT_DUR))
  rowIdx++

  // ── Sheet ref range and column widths ─────────────────────────────────────
  ws["!ref"] = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: ref.maxCol, r: ref.maxRow },
  })

  ws["!cols"] = [
    { wch: 30 }, // Date
    { wch: 8 }, // Start
    { wch: 8 }, // End
    { wch: 8 }, // Breaks
    { wch: 12 }, // Work hours
    { wch: 14 }, // Flex applied
    { wch: 10 }, // Target
    { wch: 10 }, // Balance
  ]

  // ── Enable 1904 date system so negative balance times display correctly ───
  const wb = XLSX.utils.book_new()
  wb.Workbook = { WBProps: { date1904: true } }
  XLSX.utils.book_append_sheet(wb, ws, tr.sheetName)
  XLSX.writeFile(wb, fileName)
}
