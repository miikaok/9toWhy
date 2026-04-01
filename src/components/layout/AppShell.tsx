import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { useTimeGradient } from "@/hooks/use-time-gradient"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const gradient = useTimeGradient()

  return (
    <div className="relative h-svh overflow-hidden">
      <motion.div
        className="fixed inset-0 -z-10"
        animate={{ background: gradient }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      <div className="fixed inset-0 -z-10 bg-background/80 backdrop-blur-sm" />
      <main className="box-border flex h-svh flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(56px+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  )
}
