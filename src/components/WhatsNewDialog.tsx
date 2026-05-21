import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ChangelogEntry } from "@/lib/changelog"
import { useI18n } from "@/hooks/use-i18n"
import { hapticSuccess } from "@/lib/haptics"

const LAST_SEEN_KEY = "9towhy.lastSeenVersion"

interface WhatsNewDialogProps {
  entry: ChangelogEntry
  onClose: () => void
}

export function WhatsNewDialog({ entry, onClose }: WhatsNewDialogProps) {
  const { t } = useI18n()

  const handleClose = () => {
    hapticSuccess()
    localStorage.setItem(LAST_SEEN_KEY, entry.version)
    onClose()
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="whats-new-backdrop"
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleClose}
      />

      {/* Dialog panel */}
      <motion.div
        key="whats-new-panel"
        className="fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] sm:max-w-sm"
        style={{ translateX: "-50%", translateY: "-50%" }}
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
      >
        <div className="overflow-hidden rounded-2xl bg-popover shadow-2xl ring-1 ring-foreground/10">
          {/* Header gradient strip */}
          <div className="relative flex items-center gap-3 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-5 py-5">
            {/* Decorative background sparkles */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-4 -right-4 size-24 rounded-full bg-primary/10 blur-2xl" />
              <div className="absolute -bottom-6 left-8 size-16 rounded-full bg-primary/8 blur-xl" />
            </div>

            <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
              <Sparkles className="size-5 text-primary" />
            </div>

            <div className="relative flex flex-col gap-1">
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                {t("whatsNew.title")}
              </p>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums">
                  v{entry.version}
                </span>
              </div>
            </div>
          </div>

          {/* Change list */}
          <div className="flex flex-col gap-1 px-5 py-4">
            {entry.changes.map((change, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-2.5 rounded-lg px-1 py-1.5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 + i * 0.05, duration: 0.22 }}
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-sm leading-snug text-foreground/90">
                  {change}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div className="-mx-0 border-t border-border/60 bg-muted/40 px-5 py-4">
            <Button className="w-full" onClick={handleClose}>
              {t("whatsNew.gotIt")}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export { LAST_SEEN_KEY }
