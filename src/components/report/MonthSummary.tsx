import { Card, CardContent } from "@/components/ui/card"
import { DurationDisplay } from "@/components/shared/DurationDisplay"
import { motion } from "framer-motion"
import { useI18n } from "@/hooks/use-i18n"

interface MonthSummaryProps {
  totalMinutes: number
  averageMinutes: number
  daysWorked: number
  weeklyWorkedMinutes: number
  weeklyTargetMinutes: number
}

export function MonthSummary({
  totalMinutes,
  averageMinutes,
  daysWorked,
  weeklyWorkedMinutes,
  weeklyTargetMinutes,
}: MonthSummaryProps) {
  const { t } = useI18n()
  const items = [
    {
      label: t("report.total"),
      value: <DurationDisplay minutes={totalMinutes} />,
    },
    {
      label: t("report.average"),
      value: <DurationDisplay minutes={averageMinutes} />,
    },
    { label: t("report.days"), value: <span>{daysWorked}</span> },
    {
      label: t("report.weeklyTotal"),
      value: (
        <span>
          <DurationDisplay minutes={weeklyWorkedMinutes} />
          <span className="text-muted-foreground"> / </span>
          <DurationDisplay minutes={weeklyTargetMinutes} />
        </span>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
        >
          <Card className="bg-card/65 backdrop-blur-sm">
            <CardContent className="flex flex-col gap-1 py-4">
              <span className="text-xs text-muted-foreground">
                {item.label}
              </span>
              <span className="text-sm font-semibold">{item.value}</span>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
