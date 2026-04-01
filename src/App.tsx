import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useDrag } from "@use-gesture/react"
import { Hand } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppShell } from "@/components/layout/AppShell"
import { BottomNav, type TabId } from "@/components/layout/BottomNav"
import { TimerView } from "@/components/timer/TimerView"
import { CalendarView } from "@/components/calendar/CalendarView"
import { ReportView } from "@/components/report/ReportView"
import { BankView } from "@/components/bank/BankView"
import { SettingsView } from "@/components/settings/SettingsView"
import { ForgotToStopDialog } from "@/components/timer/ForgotToStopDialog"
import { useSettings, useTimerState, initializeDefaults } from "@/db/hooks"
import { hapticTap, setHapticMode } from "@/lib/haptics"
import { useI18n } from "@/hooks/use-i18n"

const TAB_ORDER: TabId[] = ["timer", "calendar", "report", "bank", "settings"]
const ACTIVE_TAB_STORAGE_KEY = "9towhy.activeTab"

function clampTab(index: number) {
  return Math.max(0, Math.min(TAB_ORDER.length - 1, index))
}

function isTabId(value: string | null): value is TabId {
  return (
    value === "timer" ||
    value === "calendar" ||
    value === "report" ||
    value === "bank" ||
    value === "settings"
  )
}

export function App() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window === "undefined") return "timer"
    const stored = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)
    return isTabId(stored) ? stored : "timer"
  })
  const [nowMs, setNowMs] = useState(0)
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("9towhy.swipeHintDismissed") !== "1"
  })
  const settings = useSettings()
  const timerState = useTimerState()

  useEffect(() => {
    void initializeDefaults()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setHapticMode(settings.hapticMode)
  }, [settings.hapticMode])

  useEffect(() => {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab)
  }, [activeTab])

  const showForgotDialog = useMemo(() => {
    if (!timerState.running || !timerState.startedAt) return false
    const startedAt = new Date(timerState.startedAt).getTime()
    let totalMs = timerState.accumulatedMs
    if (timerState.pausedAt) {
      totalMs += new Date(timerState.pausedAt).getTime() - startedAt
    } else {
      totalMs += nowMs - startedAt
    }
    const elapsedMinutes = totalMs / 60000
    return elapsedMinutes > settings.maxWorkMinutes
  }, [timerState, settings.maxWorkMinutes, nowMs])

  const activeTabIndex = TAB_ORDER.indexOf(activeTab)
  const bind = useDrag(
    ({ last, movement: [mx], velocity: [vx], direction: [dx] }) => {
      if (!last) return
      const swipe = Math.abs(mx) > 60 || vx > 0.4
      if (!swipe) return
      const nextIndex = clampTab(activeTabIndex + (dx > 0 ? -1 : 1))
      if (nextIndex !== activeTabIndex) {
        hapticTap()
        setActiveTab(TAB_ORDER[nextIndex])
      }
    },
    { axis: "x", filterTaps: true }
  )

  const content = useMemo(() => {
    switch (activeTab) {
      case "timer":
        return <TimerView />
      case "calendar":
        return <CalendarView />
      case "report":
        return <ReportView />
      case "bank":
        return <BankView />
      case "settings":
        return <SettingsView />
      default:
        return <TimerView />
    }
  }, [activeTab])

  return (
    <AppShell>
      <div
        className="mx-auto flex h-full min-h-0 w-full max-w-md touch-pan-y flex-col overflow-hidden"
        {...bind()}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="flex min-h-0 flex-1 overflow-hidden"
          >
            {content}
          </motion.div>
        </AnimatePresence>
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            hapticTap()
            setActiveTab(tab)
          }}
        />
      </div>
      {showForgotDialog && (
        <ForgotToStopDialog
          timerState={timerState}
          settings={settings}
          onResolved={() => undefined}
        />
      )}
      {showSwipeHint && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+12px)] z-50 flex justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-auto w-full max-w-md rounded-xl border bg-card/90 p-3 shadow-md backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md bg-muted p-2">
                <Hand className="size-4 text-muted-foreground" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-sm font-medium">{t("app.swipeTipTitle")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("app.swipeTipBody")}
                </p>
                <Button
                  size="sm"
                  className="w-fit"
                  onPointerDown={hapticTap}
                  onClick={() => {
                    localStorage.setItem("9towhy.swipeHintDismissed", "1")
                    setShowSwipeHint(false)
                  }}
                >
                  {t("app.gotIt")}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AppShell>
  )
}

export default App
