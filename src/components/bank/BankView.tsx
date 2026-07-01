import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Plus, TrendingUp, TrendingDown, PackageOpen, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAllEntries, useSettings, addWorkEntry, deleteWorkEntry } from "@/db/hooks"
import {
  getDailyFlex,
  getEffectiveDailyTarget,
  groupEntriesByDate,
  todayDateString,
} from "@/lib/flex"
import { DurationDisplay } from "@/components/shared/DurationDisplay"
import { formatDurationShort } from "@/lib/time"
import { hapticError, hapticSuccess, hapticTap } from "@/lib/haptics"
import { useI18n } from "@/hooks/use-i18n"
import { formatLocaleDate } from "@/lib/date-locale"
import { cn } from "@/lib/utils"

interface BankTransaction {
  id: string
  kind: "earned" | "used" | "imported"
  timestamp: string
  minutes: number
  entryId?: number
}

export function BankView() {
  const { t, locale } = useI18n()
  const settings = useSettings()
  const entries = useAllEntries()

  const [importOpen, setImportOpen] = useState(false)
  const [importHours, setImportHours] = useState("")
  const [importMinutes, setImportMinutes] = useState("")
  const [importError, setImportError] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const transactions = useMemo<BankTransaction[]>(() => {
    const byDate = groupEntriesByDate(entries)
    const list: BankTransaction[] = []

    for (const [date, dayEntries] of byDate) {
      const earned = getDailyFlex(dayEntries, settings)
      if (earned > 0) {
        list.push({
          id: `earned-${date}`,
          kind: "earned",
          timestamp: `${date}T23:59:59`,
          minutes: earned,
        })
      }

      for (const entry of dayEntries) {
        if (entry.type === "flex") {
          list.push({
            id: `used-${entry.id}`,
            kind: "used",
            timestamp: entry.startTime,
            minutes: -Math.abs(entry.duration),
          })
        } else if (entry.type === "import") {
          list.push({
            id: `import-${entry.id}`,
            kind: "imported",
            timestamp: entry.startTime,
            minutes: entry.duration,
            entryId: entry.id,
          })
        }
      }
    }

    return list.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }, [entries, settings])

  const totalAvailableFlex = useMemo(
    () => transactions.reduce((sum, tx) => sum + tx.minutes, 0),
    [transactions]
  )
  const dailyOffCostMinutes = getEffectiveDailyTarget(settings)
  const fullDaysOff =
    dailyOffCostMinutes > 0
      ? Math.max(Math.floor(totalAvailableFlex / dailyOffCostMinutes), 0)
      : 0

  const isPositive = totalAvailableFlex >= 0

  const clearImportForm = () => {
    setImportHours("")
    setImportMinutes("")
    setImportError(false)
  }

  const handleImportSave = async () => {
    const h = Math.max(parseInt(importHours) || 0, 0)
    const m = Math.max(parseInt(importMinutes) || 0, 0)
    const total = h * 60 + m
    if (total <= 0) {
      setImportError(true)
      hapticError()
      return
    }
    hapticSuccess()
    const now = new Date()
    const today = todayDateString()
    await addWorkEntry({
      date: today,
      startTime: now.toISOString(),
      endTime: now.toISOString(),
      duration: total,
      type: "import",
      note: t("bank.importedNote"),
    })
    setImportOpen(false)
    clearImportForm()
  }

  const TxIcon = ({ kind }: { kind: BankTransaction["kind"] }) => {
    if (kind === "used")
      return (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
          <TrendingDown className="size-3.5 text-destructive" />
        </div>
      )
    if (kind === "imported")
      return (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <PackageOpen className="size-3.5 text-primary" />
        </div>
      )
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
        <TrendingUp className="size-3.5 text-emerald-500" />
      </div>
    )
  }

  const txLabel = (kind: BankTransaction["kind"]) => {
    if (kind === "earned") return t("bank.earnedFromWork")
    if (kind === "imported") return t("bank.importedFlex")
    return t("bank.usedFlex")
  }

  return (
    <motion.div
      key="bank"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pt-6"
    >
      {/* Balance summary card */}
      <Card className="bg-card/65 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center gap-4 pt-6 pb-5">
          {/* Balance label */}
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {t("bank.availableFlex")}
          </p>

          {/* Large balance number */}
          <p
            className={cn(
              "text-5xl font-bold tracking-tight tabular-nums",
              isPositive
                ? "text-emerald-500 dark:text-emerald-400"
                : "text-destructive"
            )}
          >
            {formatDurationShort(totalAvailableFlex, locale)}
          </p>

          {/* Days-off pill */}
          <div className="flex items-center gap-1.5 rounded-full bg-muted/70 px-3.5 py-1.5">
            <span className="text-xs text-muted-foreground">
              {t("bank.fullDaysOff")}
            </span>
            <span className="text-xs font-semibold tabular-nums">
              {t("bank.daysCount", { count: fullDaysOff })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Transactions card */}
      <Card className="flex min-h-0 flex-1 flex-col bg-card/65 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>{t("bank.transactions")}</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("bank.noTransactions")}
            </p>
          ) : (
            <ScrollArea className="h-full pr-2">
              <div className="flex flex-col">
                {transactions.map((tx, index) => (
                  <div key={tx.id}>
                    {index > 0 && <Separator className="my-2" />}
                    <div className="flex items-center gap-3">
                      <TxIcon kind={tx.kind} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-tight font-medium">
                          {txLabel(tx.kind)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatLocaleDate(
                            new Date(tx.timestamp),
                            "PP",
                            locale
                          )}
                        </p>
                      </div>
                      <DurationDisplay
                        minutes={tx.minutes}
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          tx.minutes >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        )}
                      />
                      {tx.kind === "imported" && tx.entryId !== undefined && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("bank.deleteImport")}
                          className="size-8 shrink-0 text-muted-foreground/60 hover:text-destructive"
                          onPointerDown={hapticTap}
                          onClick={() => setPendingDeleteId(tx.entryId!)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Import button */}
      <Button
        variant="outline"
        className="w-full shrink-0 gap-1.5"
        onPointerDown={hapticTap}
        onClick={() => setImportOpen(true)}
      >
        <Plus className="size-3.5" />
        {t("bank.importFlex")}
      </Button>

      {/* Import dialog */}
      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          if (!open) clearImportForm()
          setImportOpen(open)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("bank.importFlexTitle")}</DialogTitle>
            <DialogDescription>
              {t("bank.importFlexDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder={t("forgot.hoursPlaceholder")}
                value={importHours}
                min={0}
                className="w-20"
                onChange={(e) => {
                  setImportHours(e.target.value)
                  setImportError(false)
                }}
              />
              <span className="text-sm text-muted-foreground">
                {t("time.hourShort")}
              </span>
              <Input
                type="number"
                placeholder={t("forgot.minutesPlaceholder")}
                value={importMinutes}
                min={0}
                className="w-20"
                onChange={(e) => {
                  setImportMinutes(e.target.value)
                  setImportError(false)
                }}
              />
              <span className="text-sm text-muted-foreground">
                {t("time.minuteShort")}
              </span>
            </div>
            {importError && (
              <p className="text-xs text-destructive">
                {t("bank.importError")}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onPointerDown={hapticTap}
              onClick={() => {
                setImportOpen(false)
                clearImportForm()
              }}
            >
              {t("forgot.back")}
            </Button>
            <Button
              onPointerDown={hapticTap}
              onClick={() => void handleImportSave()}
            >
              {t("bank.importSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete imported flex confirm dialog */}
      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("bank.deleteImportTitle")}</DialogTitle>
            <DialogDescription>
              {t("bank.deleteImportBody")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPendingDeleteId(null)}
            >
              {t("calendar.cancel")}
            </Button>
            <Button
              variant="destructive"
              onPointerDown={hapticTap}
              onClick={() => {
                void deleteWorkEntry(pendingDeleteId!)
                hapticSuccess()
                setPendingDeleteId(null)
              }}
            >
              {t("calendar.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
