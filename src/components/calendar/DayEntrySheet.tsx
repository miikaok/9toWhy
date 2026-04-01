import { useMemo, useState } from "react"
import { createPortal } from "react-dom"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DayDetail } from "./DayDetail"
import {
  useAllEntries,
  useEntriesForDate,
  useSettings,
  addWorkEntry,
} from "@/db/hooks"
import {
  calculateFlexBeforeDate,
  getDailyWorkedMinutes,
  getEffectiveDailyTarget,
} from "@/lib/flex"
import { floorDuration, formatDuration, roundDuration } from "@/lib/time"
import { hapticSuccess, hapticTap } from "@/lib/haptics"
import { useI18n } from "@/hooks/use-i18n"
import { formatLocaleDate } from "@/lib/date-locale"

interface DayEntrySheetProps {
  date: string | null
  onClose: () => void
}

function toIso(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString()
}

export function DayEntrySheet({ date, onClose }: DayEntrySheetProps) {
  const { t, locale } = useI18n()
  const settings = useSettings()
  const entries = useEntriesForDate(date ?? "")
  const allEntries = useAllEntries()
  const [customStartTime, setCustomStartTime] = useState<string | null>(null)
  const [customEndTime, setCustomEndTime] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const startTime = customStartTime ?? settings.defaultStartTime
  const endTime = customEndTime ?? settings.defaultEndTime

  const isOpen = !!date
  const dateLabel = useMemo(
    () =>
      date
        ? formatLocaleDate(new Date(`${date}T00:00:00`), "cccc, d LLLL", locale)
        : "",
    [date, locale]
  )
  const dailyTarget = getEffectiveDailyTarget(settings)
  const worked = getDailyWorkedMinutes(entries)
  const remaining = Math.max(dailyTarget - worked, 0)
  const availableFlex = date
    ? calculateFlexBeforeDate(allEntries, settings, date)
    : 0
  const spendableDuration = floorDuration(remaining, settings.roundToMinutes)
  const canUseFlex = spendableDuration > 0

  const isRangeOverlapping = (startIso: string, endIso: string): boolean => {
    const startMs = new Date(startIso).getTime()
    const endMs = new Date(endIso).getTime()
    return entries.some((entry) => {
      const entryStartMs = new Date(entry.startTime).getTime()
      const entryEndMs = new Date(entry.endTime).getTime()
      return startMs < entryEndMs && endMs > entryStartMs
    })
  }

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 2200)
  }

  const showOverlapWarning = () => {
    showToast(t("calendar.overlapToast"))
  }

  const handleAddManual = async () => {
    if (!date) return
    const start = toIso(date, startTime)
    const end = toIso(date, endTime)
    const rawMinutes =
      (new Date(end).getTime() - new Date(start).getTime()) / 60000
    const rounded = roundDuration(
      Math.max(rawMinutes, 0),
      settings.roundToMinutes
    )
    if (rounded <= 0) return
    if (isRangeOverlapping(start, end)) {
      showOverlapWarning()
      return
    }
    hapticSuccess()
    await addWorkEntry({
      date,
      startTime: start,
      endTime: end,
      duration: rounded,
      type: "manual",
      note,
    })
    setNote("")
  }

  const handleUseFlex = async () => {
    if (!date) return
    const start = toIso(date, startTime)
    const end = toIso(date, endTime)
    if (isRangeOverlapping(start, end)) {
      showOverlapWarning()
      return
    }
    const rawMinutes =
      (new Date(end).getTime() - new Date(start).getTime()) / 60000
    const requestedDuration = roundDuration(
      Math.max(rawMinutes, 0),
      settings.roundToMinutes
    )
    if (requestedDuration <= 0) return
    hapticSuccess()
    await addWorkEntry({
      date,
      startTime: start,
      endTime: end,
      duration: requestedDuration,
      type: "flex",
      note: t("calendar.usedFlexNote"),
    })
  }

  const handleDrawerOpenChange = (open: boolean) => {
    if (open) {
      setCustomStartTime(null)
      setCustomEndTime(null)
      return
    }
    setCustomStartTime(null)
    setCustomEndTime(null)
    setNote("")
    onClose()
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleDrawerOpenChange}>
      <DrawerContent className="mx-auto flex h-[78svh] w-full max-w-md flex-col overflow-hidden">
        <DrawerHeader className="shrink-0">
          <DrawerTitle>{dateLabel}</DrawerTitle>
          <DrawerDescription>{t("calendar.manageEntries")}</DrawerDescription>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4">
          <div className="flex items-start gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">
                {t("calendar.start")}
              </label>
              <Input
                type="time"
                className="ios-time-input h-11 text-base"
                value={startTime}
                onChange={(e) => setCustomStartTime(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">
                {t("calendar.end")}
              </label>
              <Input
                type="time"
                className="ios-time-input h-11 text-base"
                value={endTime}
                onChange={(e) => setCustomEndTime(e.target.value)}
              />
            </div>
          </div>
          <Input
            placeholder={t("calendar.optionalNote")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleAddManual}
              onPointerDown={hapticTap}
            >
              {t("calendar.addEntry")}
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              disabled={!canUseFlex}
              onClick={handleUseFlex}
              onPointerDown={hapticTap}
            >
              {t("calendar.useFlexTime")}
            </Button>
          </div>
          <div className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
            <p>
              {t("calendar.availableFlex", {
                value: formatDuration(availableFlex, locale),
              })}
            </p>
            <p>
              {t("calendar.spendableNow", {
                value: formatDuration(Math.max(spendableDuration, 0), locale),
              })}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-1">
            <DayDetail entries={entries} />
          </div>
        </div>

        <DrawerFooter className="shrink-0">
          <Button variant="outline" onClick={onClose}>
            {t("calendar.close")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
      {toastMessage &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-100 flex justify-center px-4">
            <div className="rounded-lg border bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
              {toastMessage}
            </div>
          </div>,
          document.body
        )}
    </Drawer>
  )
}
