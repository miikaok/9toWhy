import { formatDuration } from "@/lib/time"
import { cn } from "@/lib/utils"
import { useI18n } from "@/hooks/use-i18n"

interface DurationDisplayProps {
  minutes: number
  className?: string
}

export function DurationDisplay({ minutes, className }: DurationDisplayProps) {
  const { locale } = useI18n()
  return (
    <span className={cn("tabular-nums", className)}>
      {formatDuration(minutes, locale)}
    </span>
  )
}
