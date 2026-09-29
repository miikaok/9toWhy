import test from "node:test"
import assert from "node:assert/strict"
import {
  calculateFlexBeforeDate,
  calculateTotalFlex,
  getDailyFlex,
  getDailyFlexUsed,
  getDailyOffCost,
  getFullDaysOff,
  getDailyWorkedMinutes,
  getRemainingDayMinutes,
  netDayFlexBalance,
} from "../src/lib/flex.ts"

const settings = {
  totalWorkMinutes: 480,
  breakMinutes: 30,
  roundToMinutes: 15,
}

function entry(date, type, duration, id = 1) {
  return {
    id,
    date,
    type,
    duration,
    startTime: `${date}T08:00:00.000Z`,
    endTime: `${date}T16:00:00.000Z`,
    note: "",
  }
}

test("worked days earn flex only above the full clock span", () => {
  const regular = [entry("2026-09-01", "manual", 480)]
  const overtime = [entry("2026-09-02", "timer", 495)]
  assert.equal(getDailyFlex(regular, settings), 0)
  assert.equal(getDailyFlex(overtime, settings), 15)
  assert.equal(calculateTotalFlex([...regular, ...overtime], settings), 15)
})

test("a full day off costs scheduled time less one lunch break", () => {
  const date = "2026-09-03"
  const fullSpan = [entry(date, "flex", 480)]
  const netSpan = [entry(date, "flex", 450)]
  assert.equal(getDailyOffCost(settings), 450)
  for (const entries of [fullSpan, netSpan]) {
    assert.equal(getDailyFlexUsed(entries, settings), 450)
    assert.equal(getRemainingDayMinutes(entries, settings), 0)
    assert.equal(netDayFlexBalance(entries, settings), -450)
  }
  assert.equal(getFullDaysOff(899, settings), 1)
  assert.equal(getFullDaysOff(900, settings), 2)
  assert.equal(getFullDaysOff(-450, settings), 0)
  const balanceAfterDayOff = calculateTotalFlex(
    [entry("2026-09-02", "import", 900), ...fullSpan],
    settings
  )
  assert.equal(balanceAfterDayOff, 450)
  assert.equal(getFullDaysOff(balanceAfterDayOff, settings), 1)
})

test("split full-day flex entries receive only one break allowance", () => {
  const entries = [
    entry("2026-09-04", "flex", 240),
    entry("2026-09-04", "flex", 240, 2),
  ]
  assert.equal(getDailyFlexUsed(entries, settings), 450)
  assert.equal(netDayFlexBalance(entries, settings), -450)
})

test("the allowance follows settings and never waives extra flex", () => {
  const noBreak = { ...settings, breakMinutes: 0 }
  const longBreak = { ...settings, breakMinutes: 45 }
  const extraFlex = [entry("2026-09-04", "flex", 500)]
  assert.equal(getDailyOffCost(noBreak), 480)
  assert.equal(getDailyFlexUsed(extraFlex, noBreak), 500)
  assert.equal(getDailyOffCost(longBreak), 435)
  assert.equal(getDailyFlexUsed(extraFlex, settings), 470)
  assert.equal(getDailyFlexUsed(extraFlex, longBreak), 455)
})

test("partial flex and mixed work days use their logged minutes", () => {
  const partial = [entry("2026-09-05", "flex", 240)]
  const mixed = [
    entry("2026-09-06", "manual", 240),
    entry("2026-09-06", "flex", 240, 2),
  ]
  assert.equal(getDailyFlexUsed(partial, settings), 240)
  assert.equal(getRemainingDayMinutes(partial, settings), 210)
  assert.equal(getDailyFlexUsed(mixed, settings), 240)
  assert.equal(getRemainingDayMinutes(mixed, settings), 0)
})

test("imports change only the bank, not worked time or daily flex", () => {
  const imported = [entry("2026-09-07", "import", 900)]
  assert.equal(getDailyWorkedMinutes(imported), 0)
  assert.equal(getDailyFlex(imported, settings), 0)
  assert.equal(netDayFlexBalance(imported, settings), 900)
  assert.equal(calculateFlexBeforeDate(imported, settings, "2026-09-08"), 900)
})

test("an uncovered short workday does not drain the bank", () => {
  const shortDay = [entry("2026-09-08", "manual", 420)]
  assert.equal(getDailyFlex(shortDay, settings), -60)
  assert.equal(netDayFlexBalance(shortDay, settings), 0)
  assert.equal(getRemainingDayMinutes(shortDay, settings), 60)
})
