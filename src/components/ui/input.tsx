import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, onClick, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      onClick={(e) => {
        // Android Chrome only opens the time picker via the indicator we hide in .ios-time-input; open it on tap instead.
        if (type === "time") {
          try {
            e.currentTarget.showPicker?.()
          } catch {
            // Already open, or not a user gesture: native behaviour remains.
          }
        }
        onClick?.(e)
      }}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
