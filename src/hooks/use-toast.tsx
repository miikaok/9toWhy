import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

export interface ToastController {
  /** Show a transient toast; replaces any visible one and resets its timer. */
  showToast: (message: string) => void
  /** Portal node to render somewhere in the component tree. */
  toast: ReactNode
}

const TOAST_DURATION_MS = 2200

export function useToast(): ToastController {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const showToast = (next: string) => {
    clearTimeout(timer.current)
    setMessage(next)
    timer.current = window.setTimeout(() => {
      setMessage(null)
      timer.current = undefined
    }, TOAST_DURATION_MS)
  }

  const toast =
    message !== null && typeof document !== "undefined"
      ? createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-100 flex justify-center px-4">
            <div className="rounded-lg border bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
              {message}
            </div>
          </div>,
          document.body
        )
      : null

  return { showToast, toast }
}
