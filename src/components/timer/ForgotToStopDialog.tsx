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
import type { TimerState, Settings } from "@/db"
import { getEffectiveDailyTarget } from "@/lib/flex"
import { formatDuration, roundDuration, msToMinutes } from "@/lib/time"
import { hapticError, hapticSuccess, hapticTap } from "@/lib/haptics"
import { useI18n } from "@/hooks/use-i18n"
import { formatLocaleDate } from "@/lib/date-locale"

interface ForgotToStopDialogProps {
  timerState: TimerState
  settings: Settings
  onResolved: () => void
}

export function ForgotToStopDialog({
  timerState,
  settings,
  onResolved,
}: ForgotToStopDialogProps) {
  const { t, locale } = useI18n()
  const [showCustom, setShowCustom] = useState(false)
  const [customHours, setCustomHours] = useState("")
  const [customMinutes, setCustomMinutes] = useState("")

  if (!timerState.startedAt) return null

  const startedAt = new Date(timerState.startedAt)
  const now = new Date()
  let totalMs = timerState.accumulatedMs
  if (timerState.pausedAt) {
    totalMs += new Date(timerState.pausedAt).getTime() - startedAt.getTime()
  } else {
    totalMs += now.getTime() - startedAt.getTime()
  }

  const elapsedMinutes = msToMinutes(totalMs)
  const dailyTarget = getEffectiveDailyTarget(settings)
  const startDate = format(startedAt, "yyyy-MM-dd")

  const saveEntry = async (durationMinutes: number) => {
    hapticSuccess()
    const rounded = roundDuration(durationMinutes, settings.roundToMinutes)
    if (rounded > 0) {
      await addWorkEntry({
        date: startDate,
        startTime: timerState.startedAt!,
        endTime: now.toISOString(),
        duration: rounded,
        type: "timer",
        note: t("forgot.autoRecoveredNote"),
      })
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
    if (total > 0) {
      await saveEntry(total)
    }
  }

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
                onChange={(e) => setCustomHours(e.target.value)}
                min={0}
                max={23}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">{t("time.hourShort")}</span>
              <Input
                type="number"
                placeholder={t("forgot.minutesPlaceholder")}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                min={0}
                max={59}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">{t("time.minuteShort")}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onPointerDown={hapticTap}
                onClick={() => setShowCustom(false)}
              >
                {t("forgot.back")}
              </Button>
              <Button
                className="flex-1"
                onPointerDown={hapticTap}
                onClick={handleCustomSave}
              >
                {t("forgot.save")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              onPointerDown={hapticTap}
              onClick={() => saveEntry(dailyTarget)}
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
              onClick={() => saveEntry(elapsedMinutes)}
            >
              {t("forgot.keepFullTime", {
                value: formatDuration(elapsedMinutes, locale),
              })}
            </Button>
            <Button
              variant="destructive"
              onPointerDown={hapticTap}
              onClick={handleDiscard}
            >
              {t("forgot.discard")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
