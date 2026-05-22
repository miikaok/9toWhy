import { Trash2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteWorkEntry } from "@/db/hooks"
import type { WorkEntry } from "@/db"
import { hapticTap } from "@/lib/haptics"
import { useI18n } from "@/hooks/use-i18n"
import { formatLocaleDate } from "@/lib/date-locale"
import { DurationDisplay } from "@/components/shared/DurationDisplay"
import { cn } from "@/lib/utils"

interface DayDetailProps {
  entries: WorkEntry[]
}

function typeColor(type: WorkEntry["type"]) {
  switch (type) {
    case "timer":
      return "bg-sky-500"
    case "manual":
      return "bg-emerald-500"
    case "flex":
      return "bg-amber-400"
    case "import":
      return "bg-violet-500"
    default:
      return "bg-muted-foreground"
  }
}

export function DayDetail({ entries }: DayDetailProps) {
  const { t, locale } = useI18n()

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Clock className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t("calendar.noEntriesForDay")}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      {entries.map((entry, i) => (
        <div
          key={entry.id}
          className={cn(
            "flex items-center gap-3 rounded-lg px-2 py-2.5",
            i % 2 === 0 ? "bg-muted/30" : "bg-transparent"
          )}
        >
          {/* Type dot */}
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              typeColor(entry.type)
            )}
          />

          {/* Time range + label */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium tabular-nums">
              {formatLocaleDate(new Date(entry.startTime), "p", locale)}
              {" – "}
              {formatLocaleDate(new Date(entry.endTime), "p", locale)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(`entryType.${entry.type}`)}
              {entry.note ? ` · ${entry.note}` : ""}
            </p>
          </div>

          {/* Duration */}
          <DurationDisplay
            minutes={entry.duration}
            className="text-sm font-semibold text-foreground/80 tabular-nums"
          />

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground/60 hover:text-destructive"
            onPointerDown={hapticTap}
            onClick={() => void deleteWorkEntry(entry.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  )
}
