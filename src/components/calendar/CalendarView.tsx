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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

const COLOR_WORK = "#10b981"
const COLOR_FLEX = "#3b82f6"
const COLOR_MISSING = "#ef4444"

function getDotStyle(colors: string[]): React.CSSProperties {
  if (colors.length === 0) return { background: "transparent" }
  if (colors.length === 1) return { background: colors[0] }
  if (colors.length === 2)
    return {
      background: `linear-gradient(45deg, ${colors[0]} 50%, ${colors[1]} 50%)`,
    }
  return {
    background: `linear-gradient(45deg, ${colors[0]} 33.3%, ${colors[1]} 33.3%, ${colors[1]} 66.6%, ${colors[2]} 66.6%)`,
  }
}

const LEGEND_ENTRIES: Array<{ colors: string[]; key: string }> = [
  { colors: [COLOR_WORK], key: "legendFullWork" },
  { colors: [COLOR_WORK, COLOR_FLEX], key: "legendWorkAndFlex" },
  { colors: [COLOR_FLEX], key: "legendFullFlex" },
  { colors: [COLOR_MISSING], key: "legendIncomplete" },
  { colors: [COLOR_FLEX, COLOR_MISSING], key: "legendFlexIncomplete" },
  {
    colors: [COLOR_WORK, COLOR_FLEX, COLOR_MISSING],
    key: "legendAllIncomplete",
  },
]

export function CalendarView() {
  const { t, locale } = useI18n()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [legendOpen, setLegendOpen] = useState(false)

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

  function getDayColors(dateStr: string): string[] {
    const summary = getDaySummary(dateStr, entries, settings)
    if (!summary.hasEntries) return []

    const hasWork = summary.entries.some(
      (e) => e.type !== "flex" && e.type !== "import"
    )
    const hasFlex = summary.hasFlexEntry
    const isComplete = summary.workedMinutes >= dailyTarget

    if (hasWork && !hasFlex && isComplete) return [COLOR_WORK]
    if (hasWork && hasFlex && isComplete) return [COLOR_WORK, COLOR_FLEX]
    if (!hasWork && hasFlex && isComplete) return [COLOR_FLEX]
    if (hasWork && !hasFlex && !isComplete) return [COLOR_MISSING]
    if (!hasWork && hasFlex && !isComplete) return [COLOR_FLEX, COLOR_MISSING]
    if (hasWork && hasFlex && !isComplete)
      return [COLOR_WORK, COLOR_FLEX, COLOR_MISSING]
    return []
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
    <motion.div
      key="calendar"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-0 flex-1 overflow-hidden"
    >
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
              const colors = getDayColors(dateStr)
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
                    className="size-2 rounded-full"
                    style={getDotStyle(colors)}
                  />
                </motion.button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-center pb-1">
          <button
            className="text-xs text-muted-foreground/70 underline-offset-2 hover:text-muted-foreground hover:underline"
            onClick={() => setLegendOpen(true)}
          >
            {t("calendar.legendLink")}
          </button>
        </div>

        <Dialog open={legendOpen} onOpenChange={setLegendOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("calendar.legendTitle")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 pt-1">
              {LEGEND_ENTRIES.map(({ colors, key }) => (
                <div key={key} className="flex items-center gap-4">
                  <div
                    className="size-7 shrink-0 rounded-full"
                    style={getDotStyle(colors)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {t(`calendar.${key}`)}
                  </span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <DayEntrySheet
          key={`${selectedDate ?? "no-date"}:${settings.defaultStartTime}:${settings.defaultEndTime}`}
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      </div>
    </motion.div>
  )
}
