import { useState, useEffect } from "react"

interface GradientSlot {
  start: number
  end: number
  from: string
  to: string
}

const GRADIENTS: GradientSlot[] = [
  { start: 5, end: 7, from: "#1e1b4b", to: "#fbbf7e" },
  { start: 7, end: 9, from: "#f59e0b", to: "#fde68a" },
  { start: 9, end: 12, from: "#38bdf8", to: "#e0f2fe" },
  { start: 12, end: 15, from: "#7dd3fc", to: "#fde68a" },
  { start: 15, end: 17, from: "#f97316", to: "#fb923c" },
  { start: 17, end: 19, from: "#f87171", to: "#7c3aed" },
  { start: 19, end: 22, from: "#1e1b4b", to: "#4c1d95" },
  { start: 22, end: 5, from: "#0f0a1e", to: "#1e1b4b" },
]

function getGradientForHour(hour: number): { from: string; to: string } {
  for (const slot of GRADIENTS) {
    if (slot.start < slot.end) {
      if (hour >= slot.start && hour < slot.end) {
        return { from: slot.from, to: slot.to }
      }
    } else {
      if (hour >= slot.start || hour < slot.end) {
        return { from: slot.from, to: slot.to }
      }
    }
  }
  return { from: "#0f0a1e", to: "#1e1b4b" }
}

function interpolateColor(
  color1: string,
  color2: string,
  factor: number
): string {
  const r1 = parseInt(color1.slice(1, 3), 16)
  const g1 = parseInt(color1.slice(3, 5), 16)
  const b1 = parseInt(color1.slice(5, 7), 16)
  const r2 = parseInt(color2.slice(1, 3), 16)
  const g2 = parseInt(color2.slice(3, 5), 16)
  const b2 = parseInt(color2.slice(5, 7), 16)
  const r = Math.round(r1 + (r2 - r1) * factor)
  const g = Math.round(g1 + (g2 - g1) * factor)
  const b = Math.round(b1 + (b2 - b1) * factor)
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

function getCurrentGradient(): string {
  const now = new Date()
  const hour = now.getHours()
  const minuteFraction = now.getMinutes() / 60

  const current = getGradientForHour(hour)
  const next = getGradientForHour((hour + 1) % 24)

  const currentSlot = GRADIENTS.find((s) => {
    if (s.start < s.end) return hour >= s.start && hour < s.end
    return hour >= s.start || hour < s.end
  })
  const nextSlot = GRADIENTS.find((s) => {
    if (s.start < s.end)
      return (hour + 1) % 24 >= s.start && (hour + 1) % 24 < s.end
    return (hour + 1) % 24 >= s.start || (hour + 1) % 24 < s.end
  })

  if (currentSlot !== nextSlot) {
    const blendFactor = minuteFraction
    const from = interpolateColor(current.from, next.from, blendFactor)
    const to = interpolateColor(current.to, next.to, blendFactor)
    return `linear-gradient(135deg, ${from}, ${to})`
  }

  return `linear-gradient(135deg, ${current.from}, ${current.to})`
}

export function useTimeGradient(): string {
  const [gradient, setGradient] = useState(getCurrentGradient)

  useEffect(() => {
    const interval = setInterval(() => {
      setGradient(getCurrentGradient())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  return gradient
}

export function useIsDarkGradient(): boolean {
  const now = new Date()
  const hour = now.getHours()
  return hour >= 17 || hour < 7
}
