import type { ReactNode } from "react"
import { motion } from "framer-motion"
import {
  useTimeGradient,
  useGradientOverlayOpacity,
} from "@/hooks/use-time-gradient"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const gradient = useTimeGradient()
  const overlayOpacity = useGradientOverlayOpacity()

  return (
    <div className="relative h-svh overflow-hidden">
      {/* Gradient layer */}
      <motion.div
        className="fixed inset-0 -z-10"
        animate={{ background: gradient }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      {/* Dark overlay — opacity breathes with the time of day */}
      <motion.div
        className="fixed inset-0 -z-10 backdrop-blur-sm"
        animate={{ backgroundColor: `oklch(0.145 0 0 / ${overlayOpacity})` }}
        transition={{ duration: 4, ease: "easeInOut" }}
      />
      <main className="box-border flex h-svh flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(56px+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  )
}
