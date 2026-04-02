import { useEffect, useMemo, useState } from "react"
import {
  addDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useAllEntries, useEntriesInRange, useSettings } from "@/db/hooks"
import {
  getDailyFlex,
  getDailyWorkedMinutes,
  groupEntriesByDate,
} from "@/lib/flex"
import { useI18n } from "@/hooks/use-i18n"
import { formatLocaleDate, getDateFnsLocale } from "@/lib/date-locale"
import { useTimeGradientColors } from "@/hooks/use-time-gradient"

interface ReportGraphsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportGraphsDrawer({
  open,
  onOpenChange,
}: ReportGraphsDrawerProps) {
  const { t, locale } = useI18n()
  const settings = useSettings()
  const allEntries = useAllEntries()
  const gradientColors = useTimeGradientColors()
  const todayDate = useMemo(() => new Date(), [])
  const [interactionsEnabled, setInteractionsEnabled] = useState(!open)

  useEffect(() => {
    if (!open) {
      setInteractionsEnabled(true)
      return
    }
    setInteractionsEnabled(false)
    const timer = setTimeout(() => {
      setInteractionsEnabled(true)
    }, 260)
    return () => clearTimeout(timer)
  }, [open])

  const rollingStart = format(
    startOfMonth(subMonths(todayDate, 11)),
    "yyyy-MM-dd"
  )
  const rollingEnd = format(endOfMonth(todayDate), "yyyy-MM-dd")
  const yearStart = format(startOfYear(todayDate), "yyyy-MM-dd")
  const today = format(todayDate, "yyyy-MM-dd")

  const rollingEntries = useEntriesInRange(rollingStart, rollingEnd)
  const yearEntries = useEntriesInRange(yearStart, today)

  const monthChartData = useMemo(() => {
    const monthStarts = eachMonthOfInterval({
      start: startOfMonth(subMonths(todayDate, 11)),
      end: startOfMonth(todayDate),
    })

    return monthStarts.map((monthDate) => {
      const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd")
      const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd")
      const workedMinutes = rollingEntries
        .filter((entry) => entry.date >= monthStart && entry.date <= monthEnd)
        .reduce((sum, entry) => sum + entry.duration, 0)

      return {
        month: formatLocaleDate(monthDate, "LLL", locale),
        hours: Number((workedMinutes / 60).toFixed(1)),
      }
    })
  }, [locale, rollingEntries, todayDate])

  const weekdayChartData = useMemo(() => {
    const dateLocale = getDateFnsLocale(locale)
    const byDate = groupEntriesByDate(allEntries)
    const weekdayTotals = Array.from({ length: 7 }, () => ({
      totalMinutes: 0,
      count: 0,
    }))

    for (const [date, dayEntries] of byDate) {
      const workedMinutes = getDailyWorkedMinutes(dayEntries)
      if (workedMinutes <= 0) continue
      const dayIndex = getDay(new Date(`${date}T00:00:00`))
      weekdayTotals[dayIndex].totalMinutes += workedMinutes
      weekdayTotals[dayIndex].count += 1
    }

    const weekStart = startOfWeek(new Date(), { locale: dateLocale })
    return Array.from({ length: 7 }).map((_, offset) => {
      const dayDate = addDays(weekStart, offset)
      const dayIndex = getDay(dayDate)
      const totalMinutes = weekdayTotals[dayIndex].totalMinutes
      const count = weekdayTotals[dayIndex].count
      const averageMinutes = count > 0 ? totalMinutes / count : 0

      return {
        day: formatLocaleDate(dayDate, "EEE", locale),
        avgHours: Number((averageMinutes / 60).toFixed(1)),
      }
    })
  }, [allEntries, locale])

  const flexLineData = useMemo(() => {
    const byDate = groupEntriesByDate(yearEntries)
    const range = eachDayOfInterval({
      start: startOfYear(todayDate),
      end: todayDate,
    })
    const points: Array<{ date: string; flexHours: number }> = []
    range.reduce((runningFlex, day) => {
      const date = format(day, "yyyy-MM-dd")
      const nextFlex =
        runningFlex + getDailyFlex(byDate.get(date) ?? [], settings)
      points.push({
        date,
        flexHours: Number((nextFlex / 60).toFixed(2)),
      })
      return nextFlex
    }, 0)
    return points
  }, [settings, todayDate, yearEntries])

  const monthChartConfig = {
    hours: {
      label: t("report.hours"),
      color: gradientColors.from,
    },
  } satisfies ChartConfig

  const weekdayChartConfig = {
    avgHours: {
      label: t("report.average"),
      color: gradientColors.to,
    },
  } satisfies ChartConfig

  const flexLineConfig = {
    flexHours: {
      label: t("report.flex"),
      color: gradientColors.from,
    },
  } satisfies ChartConfig

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto flex h-[82svh] w-full max-w-md flex-col overflow-hidden">
        <DrawerHeader className="shrink-0 text-left">
          <DrawerTitle>{t("report.graphsTitle")}</DrawerTitle>
          <DrawerDescription>{t("report.graphsDescription")}</DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <div
            className={`flex flex-col gap-3 pt-2 ${
              interactionsEnabled ? "" : "pointer-events-none"
            }`}
          >
            <Card className="bg-card/65 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>{t("report.hoursPerMonth")}</CardTitle>
                <CardDescription>{t("report.rolling12Months")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={monthChartConfig}
                  className="aspect-auto! h-52 w-full"
                >
                  <BarChart data={monthChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={32}
                      tickFormatter={(value) => `${value}h`}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(value) => `${value}h`}
                        />
                      }
                    />
                    <Bar dataKey="hours" fill="var(--color-hours)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/65 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>{t("report.hoursByDayAverage")}</CardTitle>
                <CardDescription>{t("report.allTime")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={weekdayChartConfig}
                  className="aspect-auto! h-52 w-full"
                >
                  <BarChart data={weekdayChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={32}
                      tickFormatter={(value) => `${value}h`}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(value) => `${value}h`}
                        />
                      }
                    />
                    <Bar
                      dataKey="avgHours"
                      fill="var(--color-avgHours)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/65 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>{t("report.flexEvolution")}</CardTitle>
                <CardDescription>
                  {t("report.currentYearToDate")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={flexLineConfig}
                  className="aspect-auto! h-56 w-full"
                >
                  <LineChart data={flexLineData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      minTickGap={28}
                      tickFormatter={(value) => {
                        const date = new Date(`${value}T00:00:00`)
                        return date.getDate() === 1
                          ? formatLocaleDate(date, "LLL", locale)
                          : ""
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={36}
                      tickFormatter={(value) => `${value}h`}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) =>
                            formatLocaleDate(
                              new Date(`${String(value)}T00:00:00`),
                              "P",
                              locale
                            )
                          }
                          formatter={(value) => `${value}h`}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="flexHours"
                      stroke="var(--color-flexHours)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
