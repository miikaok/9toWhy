import { useState, useEffect, useMemo, useCallback } from "react"
import { format, getISOWeek } from "date-fns"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { TimerDisplay } from "./TimerDisplay"
import { TimerControls } from "./TimerControls"
import { FlexBadge } from "@/components/shared/FlexBadge"
import { DurationDisplay } from "@/components/shared/DurationDisplay"
import {
  useSettings,
  useTimerState,
  useEntriesForDate,
  addWorkEntry,
  saveTimerState,
} from "@/db/hooks"
import {
  getDailyWorkedMinutes,
  getDailyFlex,
  todayDateString,
} from "@/lib/flex"
import { roundDuration, msToMinutes, minutesToMs, hasOverlap } from "@/lib/time"
import { hapticSuccess, hapticTap } from "@/lib/haptics"
import { useI18n } from "@/hooks/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { formatLocaleDate } from "@/lib/date-locale"

export function TimerView() {
  const { t, locale } = useI18n()
  const { showToast, toast } = useToast()
  const settings = useSettings()
  const timerState = useTimerState()
  const today = todayDateString()
  const todayEntries = useEntriesForDate(today)
  const timerStartDate = timerState.startedAt
    ? format(new Date(timerState.startedAt), "yyyy-MM-dd")
    : today
  const startDateEntries = useEntriesForDate(timerStartDate)
  const dailyTarget = settings.totalWorkMinutes
  const workedMinutes = getDailyWorkedMinutes(todayEntries)
  const dailyFlex = getDailyFlex(todayEntries, settings)
  const weekNumber = getISOWeek(new Date())

  const [nowMs, setNowMs] = useState(0)
  const [teleportOpen, setTeleportOpen] = useState(false)
  const [teleportTime, setTeleportTime] = useState(settings.defaultStartTime)

  const isRunning = timerState.running && !timerState.pausedAt
  const isPaused = timerState.running && !!timerState.pausedAt

  useEffect(() => {
    if (!timerState.running || !timerState.startedAt || timerState.pausedAt) {
      return
    }
    const frame = requestAnimationFrame(() => setNowMs(Date.now()))
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => {
      cancelAnimationFrame(frame)
      clearInterval(interval)
    }
  }, [timerState.running, timerState.startedAt, timerState.pausedAt])

  const elapsedMs = useMemo(() => {
    if (!timerState.running || !timerState.startedAt) {
      return timerState.accumulatedMs
    }
    if (timerState.pausedAt) {
      const pausedElapsed =
        new Date(timerState.pausedAt).getTime() -
        new Date(timerState.startedAt).getTime()
      return timerState.accumulatedMs + pausedElapsed
    }
    const effectiveNow =
      nowMs === 0 ? new Date(timerState.startedAt).getTime() : nowMs
    const sessionMs = effectiveNow - new Date(timerState.startedAt).getTime()
    return timerState.accumulatedMs + sessionMs
  }, [timerState, nowMs])

  useEffect(() => {
    if (!isRunning) return
    if (timerState.pausedAt) return
    const maxMs = minutesToMs(settings.maxWorkMinutes)
    if (elapsedMs <= maxMs) return
    void saveTimerState({ pausedAt: new Date().toISOString() })
  }, [elapsedMs, isRunning, timerState.pausedAt, settings.maxWorkMinutes])

  const handleStart = useCallback(async () => {
    hapticTap()
    await saveTimerState({
      running: true,
      startedAt: new Date().toISOString(),
      pausedAt: null,
      accumulatedMs: 0,
    })
  }, [])

  const handlePause = useCallback(async () => {
    hapticTap()
    await saveTimerState({
      pausedAt: new Date().toISOString(),
    })
  }, [])

  const handleResume = useCallback(async () => {
    if (!timerState.startedAt || !timerState.pausedAt) return
    hapticTap()
    const sessionMs =
      new Date(timerState.pausedAt).getTime() -
      new Date(timerState.startedAt).getTime()
    await saveTimerState({
      startedAt: new Date().toISOString(),
      pausedAt: null,
      accumulatedMs: timerState.accumulatedMs + sessionMs,
    })
  }, [timerState])

  const handleStop = useCallback(async () => {
    if (!timerState.startedAt) return
    hapticSuccess()

    let totalMs = timerState.accumulatedMs
    // Capture stop time once -- shared between the timer entry and the flex entry
    // to guarantee zero gap between them
    const stopTime = new Date()
    if (!timerState.pausedAt) {
      totalMs += stopTime.getTime() - new Date(timerState.startedAt).getTime()
    } else {
      totalMs +=
        new Date(timerState.pausedAt).getTime() -
        new Date(timerState.startedAt).getTime()
    }

    const rawMinutes = msToMinutes(totalMs)
    const duration = roundDuration(rawMinutes, settings.roundToMinutes)
    const startDate = format(new Date(timerState.startedAt), "yyyy-MM-dd")

    if (duration > 0) {
      await addWorkEntry({
        date: startDate,
        startTime: timerState.startedAt,
        endTime: stopTime.toISOString(),
        duration,
        type: "timer",
        note: "",
      })
    }

    if (settings.autoFillFlexOnStop && duration > 0) {
      // Only count non-flex entries so we don't double-fill when flex was
      // already applied manually earlier in the day
      const nonFlexWorked = startDateEntries
        .filter((e) => e.type !== "flex" && e.type !== "import")
        .reduce((sum, e) => sum + e.duration, 0)
      const totalWorkedAfter = nonFlexWorked + duration
      const deficit = settings.totalWorkMinutes - totalWorkedAfter
      // Round the deficit with the same step used for the timer entry itself.
      // Clamp to zero to avoid over-filling on days already at/over target.
      const flexDuration = roundDuration(
        Math.max(deficit, 0),
        settings.roundToMinutes
      )
      if (flexDuration > 0) {
        // Start exactly at stop time -- no gap between the work entry and flex entry
        const flexEnd = new Date(stopTime.getTime() + flexDuration * 60000)
        await addWorkEntry({
          date: startDate,
          startTime: stopTime.toISOString(),
          endTime: flexEnd.toISOString(),
          duration: flexDuration,
          type: "flex",
          note: t("timer.autoFilledFlexNote"),
        })
      }
    }

    await saveTimerState({
      running: false,
      startedAt: null,
      pausedAt: null,
      accumulatedMs: 0,
    })
  }, [timerState, settings, startDateEntries, t])

  const handleTeleportStart = async () => {
    const [hours, minutes] = teleportTime.split(":").map(Number)
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return
    const now = new Date()
    const startedAt = new Date(now)
    startedAt.setHours(hours, minutes, 0, 0)
    if (startedAt.getTime() >= now.getTime()) {
      showToast(t("timer.teleportFuture"))
      return
    }
    if (
      hasOverlap(
        startedAt.toISOString(),
        now.toISOString(),
        todayEntries.filter((entry) => entry.type !== "import")
      )
    ) {
      showToast(t("timer.teleportOverlap"))
      return
    }
    hapticSuccess()
    await saveTimerState({
      running: true,
      startedAt: startedAt.toISOString(),
      pausedAt: null,
      accumulatedMs: 0,
    })
    setNowMs(Date.now())
    setTeleportOpen(false)
  }

  const handleFillDay = useCallback(async () => {
    // Complete today to target for people who skip the timer. Fill only the
    // remaining deficit against non-flex/non-import work so repeated presses
    // never overfill (idempotent once the day is complete).
    const nonFlexWorked = todayEntries
      .filter((e) => e.type !== "flex" && e.type !== "import")
      .reduce((sum, e) => sum + e.duration, 0)
    const deficit = roundDuration(
      Math.max(settings.totalWorkMinutes - nonFlexWorked, 0),
      settings.roundToMinutes
    )
    if (deficit <= 0) {
      showToast(t("timer.fillDayComplete"))
      return
    }
    // Anchor the entry to the configured workday start so it reflects the set
    // working time rather than the current clock.
    const [hours, minutes] = settings.defaultStartTime.split(":").map(Number)
    const start = new Date()
    start.setHours(hours || 0, minutes || 0, 0, 0)
    const end = new Date(start.getTime() + deficit * 60000)
    if (
      hasOverlap(
        start.toISOString(),
        end.toISOString(),
        todayEntries.filter((entry) => entry.type !== "import")
      )
    ) {
      showToast(t("timer.fillDayOverlap"))
      return
    }
    hapticSuccess()
    await addWorkEntry({
      date: today,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      duration: deficit,
      type: "manual",
      note: t("timer.fillDayNote"),
    })
  }, [todayEntries, settings, today, showToast, t])

  const totalWorkedWithTimer =
    workedMinutes +
    (isRunning || isPaused
      ? roundDuration(msToMinutes(elapsedMs), settings.roundToMinutes)
      : 0)

  const liveDailyFlex = useMemo(() => {
    if (!isRunning && !isPaused) return dailyFlex
    const persistedNonFlexWorked = todayEntries
      .filter((entry) => entry.type !== "flex" && entry.type !== "import")
      .reduce((sum, entry) => sum + entry.duration, 0)
    const liveSessionMinutes = roundDuration(
      msToMinutes(elapsedMs),
      settings.roundToMinutes
    )
    const totalNonFlexWorked = persistedNonFlexWorked + liveSessionMinutes
    const rawFlex = totalNonFlexWorked - settings.totalWorkMinutes
    return roundDuration(rawFlex, settings.roundToMinutes)
  }, [
    dailyFlex,
    elapsedMs,
    isPaused,
    isRunning,
    settings.roundToMinutes,
    settings.totalWorkMinutes,
    todayEntries,
  ])

  const dayEntryRows = useMemo(
    () =>
      todayEntries
        .filter((e) => e.type !== "import")
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
        .map((entry) => ({
          id: entry.id,
          range: `${formatLocaleDate(new Date(entry.startTime), "HH:mm", locale)}-${formatLocaleDate(new Date(entry.endTime), "HH:mm", locale)}`,
          typeLabel: t(`entryType.${entry.type}`),
          minutes: entry.duration,
        })),
    [locale, t, todayEntries]
  )

  return (
    <motion.div
      key="timer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-0 flex-1 flex-col items-center gap-6 overflow-hidden px-4 pt-6"
    >
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {formatLocaleDate(new Date(), "cccc, d LLLL", locale)}
        </p>
        <p className="text-xs text-muted-foreground/80">
          {t("timer.weekNumber", { week: weekNumber })}
        </p>
      </div>

      <TimerDisplay
        elapsedMs={elapsedMs}
        targetMs={minutesToMs(dailyTarget)}
        isRunning={isRunning}
      />

      <TimerControls
        isRunning={isRunning}
        isPaused={isPaused}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        onTeleport={() => {
          setTeleportTime(settings.defaultStartTime)
          setTeleportOpen(true)
        }}
        onFillDay={() => void handleFillDay()}
        fillDayLabel={t("timer.fillDayLabel")}
      />

      <Card className="w-full max-w-sm bg-card/60 backdrop-blur-sm">
        <CardContent className="flex flex-col gap-2 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">
                {t("timer.today")}
              </span>
              <span className="text-sm font-medium">
                <DurationDisplay minutes={totalWorkedWithTimer} />
                <span className="text-muted-foreground"> / </span>
                <DurationDisplay minutes={dailyTarget} />
              </span>
            </div>
            {(todayEntries.length > 0 || isRunning || isPaused) && (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {t("timer.flex")}
                </span>
                <FlexBadge minutes={liveDailyFlex} />
              </div>
            )}
          </div>
          {dayEntryRows.length > 0 && (
            <div className="max-h-24 overflow-y-auto border-t border-white/10 pt-2 pr-1">
              <div className="flex flex-col gap-1">
                {dayEntryRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="truncate text-muted-foreground">
                      {row.range} · {row.typeLabel}
                    </span>
                    <DurationDisplay
                      minutes={row.minutes}
                      className="shrink-0 text-foreground/90"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={teleportOpen} onOpenChange={setTeleportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("timer.teleportTitle")}</DialogTitle>
            <DialogDescription>
              {t("timer.teleportDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted-foreground">
              {t("timer.teleportPrompt")}
            </label>
            <Input
              type="time"
              className="ios-time-input h-11 text-base"
              value={teleportTime}
              onChange={(e) => setTeleportTime(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onPointerDown={hapticTap}
              onClick={() => setTeleportOpen(false)}
            >
              {t("timer.teleportCancel")}
            </Button>
            <Button
              onPointerDown={hapticTap}
              onClick={() => void handleTeleportStart()}
            >
              {t("timer.teleportStart")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {toast}
    </motion.div>
  )
}
