import { useState } from "react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addWorkEntry, saveTimerState } from "@/db/hooks"
import type { TimerState, Settings, WorkEntry } from "@/db"
import { getEffectiveDailyTarget } from "@/lib/flex"
import { formatDuration, roundDuration, msToMinutes } from "@/lib/time"
import { hapticError, hapticSuccess, hapticTap } from "@/lib/haptics"
import { useI18n } from "@/hooks/use-i18n"
import { formatLocaleDate } from "@/lib/date-locale"

interface ForgotToStopDialogProps {
  timerState: TimerState
  settings: Settings
  /** Entries already saved for the day the timer started (used for auto-fill deficit calc) */
  startDateEntries: WorkEntry[]
  onResolved: () => void
}

export function ForgotToStopDialog({
  timerState,
  settings,
  startDateEntries,
  onResolved,
}: ForgotToStopDialogProps) {
  const { t, locale } = useI18n()
  const [showCustom, setShowCustom] = useState(false)
  const [customHours, setCustomHours] = useState("")
  const [customMinutes, setCustomMinutes] = useState("")
  const [customError, setCustomError] = useState(false)

  if (!timerState.startedAt) return null

  const startedAt = new Date(timerState.startedAt)

  // After Bug 2 fix, pausedAt is always set before the dialog renders.
  // The else branch is a safe fallback for any edge case where it isn't.
  let totalMs = timerState.accumulatedMs
  if (timerState.pausedAt) {
    totalMs += new Date(timerState.pausedAt).getTime() - startedAt.getTime()
  } else {
    totalMs += Date.now() - startedAt.getTime()
  }

  const elapsedMinutes = msToMinutes(totalMs)
  const dailyTarget = getEffectiveDailyTarget(settings)
  const startDate = format(startedAt, "yyyy-MM-dd")

  const saveEntry = async (durationMinutes: number) => {
    hapticSuccess()
    const rounded = roundDuration(durationMinutes, settings.roundToMinutes)

    if (rounded > 0) {
      // Bug 1 fix: endTime is derived from startTime + rounded duration so the
      // stored time range always matches the stored duration. Using wall-clock
      // "now" was wrong -- it would show a 16-hour span for a 7.5-hour entry.
      const endTime = new Date(
        startedAt.getTime() + rounded * 60000
      ).toISOString()

      await addWorkEntry({
        date: startDate,
        startTime: timerState.startedAt!,
        endTime,
        duration: rounded,
        type: "timer",
        note: t("forgot.autoRecoveredNote"),
      })

      // Bug 3 fix: honour autoFillFlexOnStop when recovering via this dialog.
      // handleStop in TimerView would have done this, but it is bypassed here.
      if (settings.autoFillFlexOnStop) {
        const nonFlexWorked = startDateEntries
          .filter((e) => e.type !== "flex")
          .reduce((sum, e) => sum + e.duration, 0)
        const totalWorkedAfter = nonFlexWorked + rounded
        const deficit = settings.totalWorkMinutes - totalWorkedAfter
        const flexDuration = roundDuration(
          Math.max(deficit, 0),
          settings.roundToMinutes
        )
        if (flexDuration > 0) {
          const flexStart = new Date(startedAt.getTime() + rounded * 60000)
          const flexEnd = new Date(flexStart.getTime() + flexDuration * 60000)
          await addWorkEntry({
            date: startDate,
            startTime: flexStart.toISOString(),
            endTime: flexEnd.toISOString(),
            duration: flexDuration,
            type: "flex",
            note: t("timer.autoFilledFlexNote"),
          })
        }
      }
    }

    await saveTimerState({
      running: false,
      startedAt: null,
      pausedAt: null,
      accumulatedMs: 0,
    })
    onResolved()
  }

  const handleDiscard = async () => {
    hapticError()
    await saveTimerState({
      running: false,
      startedAt: null,
      pausedAt: null,
      accumulatedMs: 0,
    })
    onResolved()
  }

  const handleCustomSave = async () => {
    const h = parseInt(customHours) || 0
    const m = parseInt(customMinutes) || 0
    const total = h * 60 + m
    // Bug 4 fix: reject zero and values above the configured max work time
    if (total <= 0 || total > settings.maxWorkMinutes) {
      setCustomError(true)
      hapticError()
      return
    }
    setCustomError(false)
    await saveEntry(total)
  }

  const clearError = () => setCustomError(false)

  return (
    <Dialog open>
      <DialogContent
        className="max-w-sm"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("forgot.title")}</DialogTitle>
          <DialogDescription>
            {t("forgot.description", {
              startedAt: formatLocaleDate(startedAt, "PPp", locale),
              elapsed: formatDuration(elapsedMinutes, locale),
            })}
          </DialogDescription>
        </DialogHeader>

        {showCustom ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder={t("forgot.hoursPlaceholder")}
                value={customHours}
                onChange={(e) => {
                  setCustomHours(e.target.value)
                  clearError()
                }}
                min={0}
                max={23}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                {t("time.hourShort")}
              </span>
              <Input
                type="number"
                placeholder={t("forgot.minutesPlaceholder")}
                value={customMinutes}
                onChange={(e) => {
                  setCustomMinutes(e.target.value)
                  clearError()
                }}
                min={0}
                max={59}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                {t("time.minuteShort")}
              </span>
            </div>
            {customError && (
              <p className="text-xs text-destructive">
                {t("forgot.customTimeError", {
                  max: formatDuration(settings.maxWorkMinutes, locale),
                })}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onPointerDown={hapticTap}
                onClick={() => {
                  setShowCustom(false)
                  clearError()
                }}
              >
                {t("forgot.back")}
              </Button>
              <Button
                className="flex-1"
                onPointerDown={hapticTap}
                onClick={() => void handleCustomSave()}
              >
                {t("forgot.save")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              onPointerDown={hapticTap}
              onClick={() => void saveEntry(dailyTarget)}
            >
              {t("forgot.setToDailyTarget", {
                value: formatDuration(dailyTarget, locale),
              })}
            </Button>
            <Button
              variant="secondary"
              onPointerDown={hapticTap}
              onClick={() => setShowCustom(true)}
            >
              {t("forgot.setCustomTime")}
            </Button>
            <Button
              variant="secondary"
              onPointerDown={hapticTap}
              onClick={() => void saveEntry(elapsedMinutes)}
            >
              {t("forgot.keepFullTime", {
                value: formatDuration(elapsedMinutes, locale),
              })}
            </Button>
            <Button
              variant="destructive"
              onPointerDown={hapticTap}
              onClick={() => void handleDiscard()}
            >
              {t("forgot.discard")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
