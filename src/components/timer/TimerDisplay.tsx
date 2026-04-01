import { motion } from "framer-motion"
import { formatTimer } from "@/lib/time"

interface TimerDisplayProps {
  elapsedMs: number
  targetMs: number
  isRunning: boolean
}

export function TimerDisplay({
  elapsedMs,
  targetMs,
  isRunning,
}: TimerDisplayProps) {
  const progress = Math.min(elapsedMs / targetMs, 1)
  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference * (1 - progress)
  const overTarget = elapsedMs > targetMs

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width="280"
        height="280"
        viewBox="0 0 280 280"
        className="-rotate-90"
      >
        <circle
          cx="140"
          cy="140"
          r="120"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/30"
        />
        <motion.circle
          cx="140"
          cy="140"
          r="120"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={overTarget ? "text-destructive" : "text-primary"}
          style={{
            strokeDasharray: circumference,
          }}
          animate={{
            strokeDashoffset,
            stroke: overTarget ? "var(--destructive)" : "var(--primary)",
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-1">
        <motion.span
          className="text-4xl font-bold tracking-tight tabular-nums"
          animate={{ scale: isRunning ? [1, 1.01, 1] : 1 }}
          transition={{ duration: 1, repeat: isRunning ? Infinity : 0 }}
        >
          {formatTimer(elapsedMs)}
        </motion.span>
        {isRunning && (
          <motion.div
            className="size-2 rounded-full bg-primary"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  )
}
