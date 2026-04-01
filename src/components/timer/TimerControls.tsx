import { Play, Pause, Square, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface TimerControlsProps {
  isRunning: boolean
  isPaused: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onTeleport?: () => void
}

export function TimerControls({
  isRunning,
  isPaused,
  onStart,
  onPause,
  onResume,
  onStop,
  onTeleport,
}: TimerControlsProps) {
  if (!isRunning && !isPaused) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center justify-center gap-6"
      >
        <Button size="lg" className="size-16 rounded-full" onClick={onStart}>
          <Play className="ml-0.5 size-5" />
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="size-14 rounded-full"
          onClick={onTeleport}
        >
          <History className="size-5" />
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center justify-center gap-6"
    >
      {isRunning ? (
        <Button
          size="lg"
          variant="secondary"
          className="size-14 rounded-full"
          onClick={onPause}
        >
          <Pause />
        </Button>
      ) : (
        <Button
          size="lg"
          variant="secondary"
          className="size-14 rounded-full"
          onClick={onResume}
        >
          <Play className="ml-0.5" />
        </Button>
      )}
      <Button
        size="lg"
        variant="destructive"
        className="size-14 rounded-full"
        onClick={onStop}
      >
        <Square />
      </Button>
    </motion.div>
  )
}
