import { Clock, TrendingUp, CalendarDays, Target } from "lucide-react"
import { DurationDisplay } from "@/components/shared/DurationDisplay"
import { motion } from "framer-motion"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"

interface MonthSummaryProps {
  totalMinutes: number
  averageMinutes: number
  daysWorked: number
  weeklyWorkedMinutes: number
  weeklyTargetMinutes: number
}

interface StatCardProps {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
  accent?: string
  delay?: number
}

function StatCard({ label, icon, children, accent, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex flex-col gap-2 rounded-xl bg-card/65 px-3.5 py-3 backdrop-blur-sm"
    >
      <div className="flex items-center gap-1.5">
        <span className={cn("text-muted-foreground", accent)}>{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-semibold">{children}</div>
    </motion.div>
  )
}

export function MonthSummary({
  totalMinutes,
  averageMinutes,
  daysWorked,
  weeklyWorkedMinutes,
  weeklyTargetMinutes,
}: MonthSummaryProps) {
  const { t } = useI18n()

  const weeklyPct =
    weeklyTargetMinutes > 0
      ? Math.min(weeklyWorkedMinutes / weeklyTargetMinutes, 1)
      : 0
  const weeklyOver = weeklyWorkedMinutes > weeklyTargetMinutes

  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCard
        label={t("report.total")}
        icon={<Clock className="size-3.5" />}
        delay={0}
      >
        <DurationDisplay minutes={totalMinutes} />
      </StatCard>

      <StatCard
        label={t("report.average")}
        icon={<TrendingUp className="size-3.5" />}
        delay={0.06}
      >
        <DurationDisplay minutes={averageMinutes} />
      </StatCard>

      <StatCard
        label={t("report.days")}
        icon={<CalendarDays className="size-3.5" />}
        delay={0.12}
      >
        <span>{daysWorked}</span>
      </StatCard>

      <StatCard
        label={t("report.weeklyTotal")}
        icon={<Target className="size-3.5" />}
        delay={0.18}
      >
        <span className="flex flex-col gap-1">
          <span>
            <DurationDisplay minutes={weeklyWorkedMinutes} />
            <span className="text-muted-foreground"> / </span>
            <DurationDisplay minutes={weeklyTargetMinutes} />
          </span>
          {/* Progress bar */}
          <span className="block h-1 w-full overflow-hidden rounded-full bg-muted">
            <motion.span
              className={cn(
                "block h-full rounded-full",
                weeklyOver ? "bg-emerald-500" : "bg-primary/70"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${weeklyPct * 100}%` }}
              transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
            />
          </span>
        </span>
      </StatCard>
    </div>
  )
}
