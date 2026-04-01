import type { DaySummary } from "@/lib/flex"
import { DurationDisplay } from "@/components/shared/DurationDisplay"
import { FlexBadge } from "@/components/shared/FlexBadge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useI18n } from "@/hooks/use-i18n"
import { formatLocaleDate } from "@/lib/date-locale"

interface DailyBreakdownProps {
  days: DaySummary[]
}

export function DailyBreakdown({ days }: DailyBreakdownProps) {
  const { locale } = useI18n()
  return (
    <ScrollArea className="h-[46svh] rounded-xl border bg-card/60 backdrop-blur-sm">
      <div className="flex flex-col p-3">
        {days.map((day, index) => (
          <div key={day.date}>
            {index > 0 && <Separator className="my-2" />}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {formatLocaleDate(new Date(`${day.date}T00:00:00`), "EEE d", locale)}
                </span>
                <span className="text-xs text-muted-foreground">
                  <DurationDisplay minutes={day.workedMinutes} />
                </span>
              </div>
              <FlexBadge minutes={day.dailyFlex} />
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
