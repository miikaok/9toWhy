import type { DaySummary } from "@/lib/flex"
import type { Settings } from "@/db"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useI18n } from "@/hooks/use-i18n"
import { formatLocaleDate } from "@/lib/date-locale"
import { formatDurationShort } from "@/lib/time"
import { cn } from "@/lib/utils"

interface DailyBreakdownProps {
  days: DaySummary[]
  settings: Settings
}

/** Colored dot for each entry type */
function TypeDot({ type }: { type: string }) {
  const color =
    type === "timer"
      ? "bg-sky-500"
      : type === "manual"
        ? "bg-emerald-500"
        : type === "flex"
          ? "bg-amber-400"
          : "bg-violet-500"
  return <span className={cn("inline-block size-1.5 rounded-full", color)} />
}

export function DailyBreakdown({ days, settings }: DailyBreakdownProps) {
  const { locale } = useI18n()
  const target = settings.totalWorkMinutes

  return (
    <ScrollArea className="h-full rounded-xl border bg-card/60 backdrop-blur-sm">
      <div className="flex flex-col divide-y divide-border/40">
        {days.map((day) => {
          const nonFlexEntries = day.entries.filter(
            (e) => e.type !== "flex" && e.type !== "import"
          )
          const flexEntries = day.entries.filter((e) => e.type === "flex")

          // Time window: earliest start → latest end across all real entries
          const allTimes = day.entries.map((e) => ({
            start: new Date(e.startTime).getTime(),
            end: new Date(e.endTime).getTime(),
          }))
          const dayStart = allTimes.length
            ? new Date(Math.min(...allTimes.map((t) => t.start)))
            : null
          const dayEnd = allTimes.length
            ? new Date(Math.max(...allTimes.map((t) => t.end)))
            : null

          // Worked minutes excluding flex/import (actual work)
          const workedOnly = nonFlexEntries.reduce((s, e) => s + e.duration, 0)
          const flexUsed = flexEntries.reduce((s, e) => s + e.duration, 0)

          // Status colour
          const isComplete = workedOnly + flexUsed >= target
          const hasAnyFlex = flexUsed > 0
          const statusColor = isComplete
            ? hasAnyFlex
              ? "bg-amber-400" // full day, flex used
              : "bg-emerald-500" // full day, pure work
            : "bg-destructive" // incomplete

          // Flex delta label: day.dailyFlex is earned (overtime over target)
          // net for the day = dailyFlex (earned) - flexUsed
          const flexDelta = day.dailyFlex - flexUsed
          const deltaLabel = formatDurationShort(flexDelta, locale)
          const deltaPositive = flexDelta >= 0

          // Unique entry types for dots
          const typeSet = Array.from(new Set(day.entries.map((e) => e.type)))

          return (
            <div key={day.date} className="flex items-center gap-3 px-3 py-2.5">
              {/* Status bar */}
              <span
                className={cn("h-8 w-1 shrink-0 rounded-full", statusColor)}
              />

              {/* Date */}
              <div className="w-12 shrink-0">
                <p className="text-sm leading-tight font-semibold">
                  {formatLocaleDate(
                    new Date(`${day.date}T00:00:00`),
                    "EEE",
                    locale
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatLocaleDate(
                    new Date(`${day.date}T00:00:00`),
                    "d",
                    locale
                  )}
                </p>
              </div>

              {/* Time range + type dots */}
              <div className="min-w-0 flex-1">
                {dayStart && dayEnd && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatLocaleDate(dayStart, "p", locale)}
                    {" – "}
                    {formatLocaleDate(dayEnd, "p", locale)}
                  </p>
                )}
                {/* Entry type dots */}
                <div className="mt-1 flex items-center gap-1">
                  {typeSet.map((type) => (
                    <TypeDot key={type} type={type} />
                  ))}
                </div>
              </div>

              {/* Worked duration */}
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {formatDurationShort(day.workedMinutes, locale)}
                </p>
                {/* Flex delta */}
                <p
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    deltaPositive
                      ? "text-emerald-500 dark:text-emerald-400"
                      : "text-destructive"
                  )}
                >
                  {deltaLabel}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
