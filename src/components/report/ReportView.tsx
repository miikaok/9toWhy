import { useMemo, useState } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { MonthSummary } from "./MonthSummary"
import { DailyBreakdown } from "./DailyBreakdown"
import { useAllEntries, useEntriesForMonth, useSettings } from "@/db/hooks"
import { getDaySummary } from "@/lib/flex"
import { hapticTap } from "@/lib/haptics"
import { useI18n } from "@/hooks/use-i18n"
import { formatLocaleDate, getDateFnsLocale } from "@/lib/date-locale"
import { ReportGraphsDrawer } from "./ReportGraphsDrawer"

export function ReportView() {
  const { locale, t } = useI18n()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [graphsOpen, setGraphsOpen] = useState(false)
  const settings = useSettings()
  const allEntries = useAllEntries()
  const entries = useEntriesForMonth(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1
  )

  const days = useMemo(() => {
    const range = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    })
    return range
      .map((day) => getDaySummary(format(day, "yyyy-MM-dd"), entries, settings))
      .filter((day) => day.hasEntries)
  }, [currentMonth, entries, settings])

  const totalMinutes = days.reduce((sum, d) => sum + d.workedMinutes, 0)
  const daysWorked = days.length
  const averageMinutes =
    daysWorked > 0 ? Math.round(totalMinutes / daysWorked) : 0
  const weeklyTargetMinutes = settings.totalWorkMinutes * 5
  const weeklyWorkedMinutes = useMemo(() => {
    const dateLocale = getDateFnsLocale(locale)
    const weekStart = format(
      startOfWeek(currentMonth, { locale: dateLocale }),
      "yyyy-MM-dd"
    )
    const weekEnd = format(
      endOfWeek(currentMonth, { locale: dateLocale }),
      "yyyy-MM-dd"
    )
    const weeklyEntries = allEntries.filter(
      (entry) => entry.date >= weekStart && entry.date <= weekEnd
    )
    const weeklyDays = eachDayOfInterval({
      start: new Date(`${weekStart}T00:00:00`),
      end: new Date(`${weekEnd}T00:00:00`),
    })
    return weeklyDays.reduce((sum, day) => {
      const summary = getDaySummary(
        format(day, "yyyy-MM-dd"),
        weeklyEntries,
        settings
      )
      return sum + summary.workedMinutes
    }, 0)
  }, [allEntries, currentMonth, locale, settings])

  return (
    <motion.div
      key="report"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pt-6"
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

      <MonthSummary
        totalMinutes={totalMinutes}
        averageMinutes={averageMinutes}
        daysWorked={daysWorked}
        weeklyWorkedMinutes={weeklyWorkedMinutes}
        weeklyTargetMinutes={weeklyTargetMinutes}
      />

      <div className="min-h-0 flex-1">
        <DailyBreakdown days={days} />
      </div>
      <div className="shrink-0 pt-2">
        <Button
          className="w-full"
          variant="secondary"
          onPointerDown={hapticTap}
          onClick={() => setGraphsOpen(true)}
        >
          {t("report.showGraphs")}
        </Button>
      </div>
      <ReportGraphsDrawer open={graphsOpen} onOpenChange={setGraphsOpen} />
    </motion.div>
  )
}
