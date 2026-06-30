import { useState } from "react"
import { Trash2, Clock, Pencil } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { deleteWorkEntry } from "@/db/hooks"
import type { WorkEntry } from "@/db"
import { hapticTap } from "@/lib/haptics"
import { useI18n } from "@/hooks/use-i18n"
import { formatLocaleDate } from "@/lib/date-locale"
import { dateTimeToIso } from "@/lib/time"
import { DurationDisplay } from "@/components/shared/DurationDisplay"
import { cn } from "@/lib/utils"

export type EditResult = "ok" | "overlap" | "invalid"

interface DayDetailProps {
  entries: WorkEntry[]
  onSaveEdit: (
    id: number,
    startTime: string,
    endTime: string
  ) => Promise<EditResult>
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

export function DayDetail({ entries, onSaveEdit }: DayDetailProps) {
  const { t, locale } = useI18n()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editStart, setEditStart] = useState("")
  const [editEnd, setEditEnd] = useState("")

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

  const startEdit = (entry: WorkEntry) => {
    hapticTap()
    setEditingId(entry.id)
    setEditStart(format(new Date(entry.startTime), "HH:mm"))
    setEditEnd(format(new Date(entry.endTime), "HH:mm"))
  }

  const saveEdit = async (entry: WorkEntry) => {
    const result = await onSaveEdit(
      entry.id,
      dateTimeToIso(entry.date, editStart),
      dateTimeToIso(entry.date, editEnd)
    )
    if (result === "ok") setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-0">
      {entries.map((entry, i) => {
        const editing = editingId === entry.id

        return (
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

            {editing ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    aria-label={t("calendar.start")}
                    className="ios-time-input h-11 min-w-0 flex-1 text-base"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="time"
                    aria-label={t("calendar.end")}
                    className="ios-time-input h-11 min-w-0 flex-1 text-base"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingId(null)}
                  >
                    {t("calendar.cancel")}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onPointerDown={hapticTap}
                    onClick={() => void saveEdit(entry)}
                  >
                    {t("calendar.save")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
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

                {/* Edit */}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("calendar.editEntry")}
                  className="size-8 shrink-0 text-muted-foreground/60 hover:text-foreground"
                  onPointerDown={hapticTap}
                  onClick={() => startEdit(entry)}
                >
                  <Pencil className="size-3.5" />
                </Button>

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
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
