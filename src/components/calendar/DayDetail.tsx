import { Trash2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DurationDisplay } from "@/components/shared/DurationDisplay"
import { deleteWorkEntry } from "@/db/hooks"
import type { WorkEntry } from "@/db"
import { hapticTap } from "@/lib/haptics"
import { useI18n } from "@/hooks/use-i18n"
import { formatLocaleDate } from "@/lib/date-locale"

interface DayDetailProps {
  entries: WorkEntry[]
}

export function DayDetail({ entries }: DayDetailProps) {
  const { t, locale } = useI18n()
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Clock className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("calendar.noEntriesForDay")}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, i) => (
        <div key={entry.id}>
          {i > 0 && <Separator className="mb-2" />}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {t(`entryType.${entry.type}`)}
                </Badge>
                <DurationDisplay
                  minutes={entry.duration}
                  className="text-sm font-medium"
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {formatLocaleDate(new Date(entry.startTime), "p", locale)} –{" "}
                {formatLocaleDate(new Date(entry.endTime), "p", locale)}
              </span>
              {entry.note && (
                <span className="text-xs text-muted-foreground">
                  {entry.note}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              onPointerDown={hapticTap}
              onClick={() => deleteWorkEntry(entry.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
