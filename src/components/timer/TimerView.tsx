import { useState, useEffect, useMemo, useCallback } from "react"
import { format } from "date-fns"
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
  getEffectiveDailyTarget,
  getDailyWorkedMinutes,
  getDailyFlex,
  todayDateString,
} from "@/lib/flex"
import { roundDuration, msToMinutes, minutesToMs } from "@/lib/time"
import { hapticSuccess, hapticTap } from "@/lib/haptics"
import { useI18n } from "@/hooks/use-i18n"
import { formatLocaleDate } from "@/lib/date-locale"

export function TimerView() {
  const { t, locale } = useI18n()
  const settings = useSettings()
  const timerState = useTimerState()
  const today = todayDateString()
  const todayEntries = useEntriesForDate(today)
  const dailyTarget = getEffectiveDailyTarget(settings)
  const workedMinutes = getDailyWorkedMinutes(todayEntries)
  const dailyFlex = getDailyFlex(todayEntries, settings)

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
    if (!timerState.pausedAt) {
      totalMs += Date.now() - new Date(timerState.startedAt).getTime()
    } else {
      totalMs +=
        new Date(timerState.pausedAt).getTime() -
        new Date(timerState.startedAt).getTime()
    }

    const rawMinutes = msToMinutes(totalMs)
    const duration = roundDuration(rawMinutes, settings.roundToMinutes)

    if (duration > 0) {
      const startDate = format(new Date(timerState.startedAt), "yyyy-MM-dd")
      await addWorkEntry({
        date: startDate,
        startTime: timerState.startedAt,
        endTime: new Date().toISOString(),
        duration,
        type: "timer",
        note: "",
      })
    }

    await saveTimerState({
      running: false,
      startedAt: null,
      pausedAt: null,
      accumulatedMs: 0,
    })
  }, [timerState, settings.roundToMinutes])

  const handleTeleportStart = async () => {
    const [hours, minutes] = teleportTime.split(":").map(Number)
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return
    const now = new Date()
    const startedAt = new Date(now)
    startedAt.setHours(hours, minutes, 0, 0)
    if (startedAt.getTime() >= now.getTime()) return
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

  const totalWorkedWithTimer =
    workedMinutes +
    (isRunning || isPaused
      ? roundDuration(msToMinutes(elapsedMs), settings.roundToMinutes)
      : 0)

  return (
    <motion.div
      key="timer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex min-h-0 flex-1 flex-col items-center gap-6 overflow-hidden px-4 pt-6"
    >
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {formatLocaleDate(new Date(), "cccc, d LLLL", locale)}
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
      />

      <Card className="w-full max-w-sm bg-card/60 backdrop-blur-sm">
        <CardContent className="flex items-center justify-between py-4">
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
          {todayEntries.length > 0 && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs text-muted-foreground">
                {t("timer.flex")}
              </span>
              <FlexBadge minutes={dailyFlex} />
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={teleportOpen} onOpenChange={setTeleportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("timer.teleportTitle")}</DialogTitle>
            <DialogDescription>{t("timer.teleportDescription")}</DialogDescription>
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
            <Button variant="outline" onPointerDown={hapticTap} onClick={() => setTeleportOpen(false)}>
              {t("timer.teleportCancel")}
            </Button>
            <Button onPointerDown={hapticTap} onClick={() => void handleTeleportStart()}>
              {t("timer.teleportStart")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
