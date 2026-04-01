import { haptic } from "ios-haptics"

export type HapticMode = "off" | "subtle" | "full"

const HAPTIC_MODE_KEY = "9towhy.hapticMode"

function canHaptic() {
  return typeof window !== "undefined"
}

export function getHapticMode(): HapticMode {
  if (!canHaptic()) return "full"
  const value = localStorage.getItem(HAPTIC_MODE_KEY)
  if (value === "off" || value === "subtle" || value === "full") {
    return value
  }
  return "full"
}

export function setHapticMode(mode: HapticMode) {
  if (!canHaptic()) return
  localStorage.setItem(HAPTIC_MODE_KEY, mode)
}

export function hapticTap() {
  if (!canHaptic()) return
  if (getHapticMode() === "off") return
  haptic()
}

export function hapticSuccess() {
  if (!canHaptic()) return
  const mode = getHapticMode()
  if (mode === "off") return
  if (mode === "subtle") {
    haptic()
    return
  }
  haptic.confirm()
}

export function hapticError() {
  if (!canHaptic()) return
  const mode = getHapticMode()
  if (mode === "off") return
  if (mode === "subtle") {
    haptic()
    return
  }
  haptic.error()
}
