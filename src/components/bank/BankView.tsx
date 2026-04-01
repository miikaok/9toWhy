import { useMemo } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useAllEntries, useSettings } from "@/db/hooks"
import {
  getEffectiveDailyTarget,
  getNetWorkedMinutesForFlex,
  groupEntriesByDate,
} from "@/lib/flex"
import { DurationDisplay } from "@/components/shared/DurationDisplay"
import { FlexBadge } from "@/components/shared/FlexBadge"
import { useI18n } from "@/hooks/use-i18n"
import { formatLocaleDate } from "@/lib/date-locale"

interface BankTransaction {
  id: string
  kind: "earned" | "used"
  timestamp: string
  minutes: number
}

export function BankView() {
  const { t, locale } = useI18n()
  const settings = useSettings()
  const entries = useAllEntries()

  const transactions = useMemo<BankTransaction[]>(() => {
    const byDate = groupEntriesByDate(entries)
    const list: BankTransaction[] = []
    const target = getEffectiveDailyTarget(settings)

    for (const [date, dayEntries] of byDate) {
      const earned = getNetWorkedMinutesForFlex(dayEntries, settings) - target
      if (earned > 0) {
        list.push({
          id: `earned-${date}`,
          kind: "earned",
          timestamp: `${date}T23:59:59`,
          minutes: earned,
        })
      }

      for (const entry of dayEntries) {
        if (entry.type !== "flex") continue
        list.push({
          id: `used-${entry.id}`,
          kind: "used",
          timestamp: entry.startTime,
          minutes: -Math.abs(entry.duration),
        })
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

  return (
    <motion.div
      key="bank"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pt-6"
    >
      <Card className="bg-card/65 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>{t("bank.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t("bank.availableFlex")}
          </span>
          <FlexBadge minutes={totalAvailableFlex} size="lg" />
        </CardContent>
      </Card>

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
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {tx.kind === "earned"
                            ? t("bank.earnedFromWork")
                            : t("bank.usedFlex")}
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
                        className={
                          tx.minutes >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
