import { useEffect, useState } from "react"
import type { ComponentType } from "react"
import { motion } from "framer-motion"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSettings, saveSettings } from "@/db/hooks"
import { formatTimeInput, parseTimeInput } from "@/lib/time"
import { getEffectiveDailyTarget } from "@/lib/flex"
import {
  hapticSuccess,
  hapticTap,
  setHapticMode,
  type HapticMode,
} from "@/lib/haptics"
import { useI18n } from "@/hooks/use-i18n"
import type { AppLocale } from "@/i18n/types"
import { GB, ES, FI, PL, SE } from "country-flag-icons/react/3x2"

const ROUNDING_OPTIONS = [1, 5, 10, 15, 30]
const LANGUAGE_OPTIONS: {
  value: AppLocale
  Flag: ComponentType<{ title?: string; className?: string }>
}[] = [
  { value: "en", Flag: GB },
  { value: "fi", Flag: FI },
  { value: "sv", Flag: SE },
  { value: "pl", Flag: PL },
  { value: "es", Flag: ES },
]

export function SettingsView() {
  const { t } = useI18n()
  const settings = useSettings()
  const [defaultStartTime, setDefaultStartTime] = useState(
    settings.defaultStartTime
  )
  const [defaultEndTime, setDefaultEndTime] = useState(settings.defaultEndTime)
  const [breakInput, setBreakInput] = useState(
    formatTimeInput(settings.breakMinutes)
  )
  const [maxInput, setMaxInput] = useState(
    formatTimeInput(settings.maxWorkMinutes)
  )
  const [roundTo, setRoundTo] = useState(String(settings.roundToMinutes))
  const [hapticMode, setHapticModeState] = useState<HapticMode>(
    settings.hapticMode
  )
  const [locale, setLocale] = useState<AppLocale>(settings.locale)
  const [showSavedToast, setShowSavedToast] = useState(false)

  const parseClockToMinutes = (value: string): number => {
    const [h, m] = value.split(":").map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  const getTotalWorkMinutesFromDefaults = (
    start: string,
    end: string
  ): number => {
    const startMinutes = parseClockToMinutes(start)
    const endMinutes = parseClockToMinutes(end)
    const rawDiff = endMinutes - startMinutes
    return rawDiff <= 0 ? rawDiff + 24 * 60 : rawDiff
  }

  const derivedTotalWorkMinutes = getTotalWorkMinutesFromDefaults(
    defaultStartTime,
    defaultEndTime
  )

  useEffect(() => {
    setDefaultStartTime(settings.defaultStartTime)
    setDefaultEndTime(settings.defaultEndTime)
    setBreakInput(formatTimeInput(settings.breakMinutes))
    setMaxInput(formatTimeInput(settings.maxWorkMinutes))
    setRoundTo(String(settings.roundToMinutes))
    setHapticModeState(settings.hapticMode)
    setLocale(settings.locale)
  }, [
    settings.defaultStartTime,
    settings.defaultEndTime,
    settings.breakMinutes,
    settings.maxWorkMinutes,
    settings.roundToMinutes,
    settings.hapticMode,
    settings.locale,
  ])

  const onSave = async () => {
    await saveSettings({
      defaultStartTime,
      defaultEndTime,
      totalWorkMinutes: derivedTotalWorkMinutes,
      breakMinutes: parseTimeInput(breakInput),
      maxWorkMinutes: parseTimeInput(maxInput),
      roundToMinutes: Number(roundTo),
      hapticMode,
      locale,
    })
    setHapticMode(hapticMode)
    hapticSuccess()
    setShowSavedToast(true)
  }

  useEffect(() => {
    if (!showSavedToast) return
    const timer = setTimeout(() => setShowSavedToast(false), 2200)
    return () => clearTimeout(timer)
  }, [showSavedToast])

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pt-6"
    >
      <Card className="flex min-h-0 flex-1 flex-col bg-card/65 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>{t("settings.title")}</CardTitle>
          <CardDescription>{t("settings.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              {t("settings.defaultStartTime")}
            </label>
            <Input
              type="time"
              className="ios-time-input h-11 text-base"
              value={defaultStartTime}
              onChange={(e) => setDefaultStartTime(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              {t("settings.defaultEndTime")}
            </label>
            <Input
              type="time"
              className="ios-time-input h-11 text-base"
              value={defaultEndTime}
              onChange={(e) => setDefaultEndTime(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              {t("settings.breakDuration")}
            </label>
            <Input
              value={breakInput}
              onChange={(e) => setBreakInput(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              {t("settings.maxWorkTime")}
            </label>
            <Input
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              {t("settings.roundToNearest")}
            </label>
            <Select value={roundTo} onValueChange={setRoundTo}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ROUNDING_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option} {t("time.minuteShort")}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              {t("settings.language")}
            </label>
            <Select
              value={locale}
              onValueChange={(value) => setLocale(value as AppLocale)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {LANGUAGE_OPTIONS.map(({ value, Flag }) => (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        <Flag className="h-3.5 w-5 rounded-xs" />
                        {t(`settings.languageOption.${value}`)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              {t("settings.haptics")}
            </label>
            <Select
              value={hapticMode}
              onValueChange={(value) => setHapticModeState(value as HapticMode)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="off">{t("settings.off")}</SelectItem>
                  <SelectItem value="subtle">{t("settings.subtle")}</SelectItem>
                  <SelectItem value="full">{t("settings.full")}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted/60 p-3 text-sm">
            {t("settings.effectiveTarget", {
              value: formatTimeInput(
                getEffectiveDailyTarget({
                  ...settings,
                  totalWorkMinutes: derivedTotalWorkMinutes,
                  breakMinutes: parseTimeInput(breakInput),
                })
              ),
            })}
          </div>

          <Button onPointerDown={hapticTap} onClick={onSave}>
            {t("settings.save")}
          </Button>
        </CardContent>
      </Card>
      {showSavedToast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
          <div className="rounded-lg border bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
            {t("settings.savedToast")}
          </div>
        </div>
      )}
    </motion.div>
  )
}
