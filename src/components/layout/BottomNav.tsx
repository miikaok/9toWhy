import { Timer, Calendar, BarChart3, Wallet, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useI18n } from "@/hooks/use-i18n"

export type TabId = "timer" | "calendar" | "report" | "bank" | "settings"

const TABS: { id: TabId; icon: typeof Timer }[] = [
  { id: "timer", icon: Timer },
  { id: "calendar", icon: Calendar },
  { id: "report", icon: BarChart3 },
  { id: "bank", icon: Wallet },
  { id: "settings", icon: Settings },
]

interface BottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useI18n()
  return (
    <nav className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)*-1)] z-50 border-t border-white/10 bg-background pb-[calc(env(safe-area-inset-bottom)+2px)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2 pt-3 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon className="size-5" />
              <span className="text-[10px] font-medium">
                {t(`tabs.${tab.id}`)}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
