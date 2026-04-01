import { useState } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import { useDrag } from "@use-gesture/react"
import { Button } from "@/components/ui/button"
import { useEntriesForMonth, useSettings } from "@/db/hooks"
import { getDaySummary, getEffectiveDailyTarget } from "@/lib/flex"
import { cn } from "@/lib/utils"
import { DayEntrySheet } from "./DayEntrySheet"
import { hapticTap } from "@/lib/haptics"
import { useI18n } from "@/hooks/use-i18n"
import {
  formatLocaleDate,
  getDateFnsLocale,
  getLocalizedWeekdays,
} from "@/lib/date-locale"

export function CalendarView() {
  const { locale } = useI18n()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth() + 1
  const entries = useEntriesForMonth(year, month)
  const settings = useSettings()
  const dailyTarget = getEffectiveDailyTarget(settings)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const weekdays = getLocalizedWeekdays(locale)
  const weekStartsOn = getDateFnsLocale(locale).options?.weekStartsOn ?? 1

  const startDayOfWeek = getDay(monthStart)
  const emptyDays = (startDayOfWeek - weekStartsOn + 7) % 7

  function getDayStatus(dateStr: string): "met" | "under" | "flex" | "none" {
    const summary = getDaySummary(dateStr, entries, settings)
    if (!summary.hasEntries) return "none"
    if (summary.hasFlexEntry) return "flex"
    if (summary.workedMinutes >= dailyTarget) return "met"
    return "under"
  }

  const bind = useDrag(
    ({ last, movement: [mx], velocity: [vx], direction: [dx] }) => {
      if (!last) return
      const swipe = Math.abs(mx) > 60 || vx > 0.4
      if (!swipe) return
      hapticTap()
      setCurrentMonth(
        dx > 0 ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1)
      )
    },
    { axis: "x", filterTaps: true }
  )

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pt-6"
      {...bind()}
    >
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onPointerDown={hapticTap}
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft />
        </Button>
        <h2 className="text-lg font-semibold">
          {formatLocaleDate(currentMonth, "LLLL yyyy", locale)}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onPointerDown={hapticTap}
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-1">
        <div className="grid grid-cols-7 gap-1">
          {weekdays.map((day) => (
            <div
              key={day}
              className="py-1 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}

          {Array.from({ length: emptyDays }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd")
            const status = getDayStatus(dateStr)
            const today = isToday(day)

            return (
              <motion.button
                key={dateStr}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-lg py-2 transition-colors",
                  today && "bg-primary/10",
                  selectedDate === dateStr && "ring-2 ring-primary"
                )}
              >
                <span
                  className={cn(
                    "text-sm tabular-nums",
                    today && "font-bold",
                    !isSameMonth(day, currentMonth) &&
                      "text-muted-foreground/50"
                  )}
                >
                  {formatLocaleDate(day, "d", locale)}
                </span>
                <div
                  className={cn(
                    "size-1.5 rounded-full",
                    status === "met" && "bg-emerald-500",
                    status === "under" && "bg-destructive",
                    status === "flex" && "bg-blue-500",
                    status === "none" && "bg-transparent"
                  )}
                />
              </motion.button>
            )
          })}
        </div>
      </div>

      <DayEntrySheet
        key={`${selectedDate ?? "no-date"}:${settings.defaultStartTime}:${settings.defaultEndTime}`}
        date={selectedDate}
        onClose={() => setSelectedDate(null)}
      />
    </div>
  )
}
