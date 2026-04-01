import { Badge } from "@/components/ui/badge"
import { formatDurationShort } from "@/lib/time"
import { cn } from "@/lib/utils"
import { useI18n } from "@/hooks/use-i18n"

interface FlexBadgeProps {
  minutes: number
  className?: string
  size?: "sm" | "lg"
}

export function FlexBadge({ minutes, className, size = "sm" }: FlexBadgeProps) {
  const { locale } = useI18n()
  const isPositive = minutes >= 0
  return (
    <Badge
      variant={isPositive ? "secondary" : "destructive"}
      className={cn(size === "lg" && "px-3 py-1 text-base", className)}
    >
      {formatDurationShort(minutes, locale)}
    </Badge>
  )
}
