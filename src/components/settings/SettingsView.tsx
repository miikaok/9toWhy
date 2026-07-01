import { useEffect, useRef, useState } from "react"
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
import type { Settings } from "@/db"
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
import { Switch } from "@/components/ui/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  exportDatabase,
  importDatabase,
  clearAllData,
} from "@/db/data"
import { Download, Upload, Trash2 } from "lucide-react"

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
  const [showSavedToast, setShowSavedToast] = useState(false)

  useEffect(() => {
    if (!showSavedToast) return
    const timer = setTimeout(() => setShowSavedToast(false), 2200)
    return () => clearTimeout(timer)
  }, [showSavedToast])

  // Remount the setup form when any settings field changes externally (e.g.
  // after a data import) so its local state re-initializes from the singleton.
  // A save writes identical values, so the key is stable and no flash occurs.
  const settingsFormKey = `${settings.defaultStartTime}|${settings.defaultEndTime}|${settings.breakMinutes}|${settings.maxWorkMinutes}|${settings.roundToMinutes}|${settings.hapticMode}|${settings.locale}|${settings.autoFillFlexOnStop}`

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pt-6"
    >
      <Card className="flex min-h-0 flex-1 flex-col bg-card/65 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>{t("settings.title")}</CardTitle>
          <CardDescription>{t("settings.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <Tabs
            defaultValue="setup"
            className="flex min-h-0 flex-1 flex-col gap-3"
          >
            <TabsList className="w-full">
              <TabsTrigger value="setup" onPointerDown={hapticTap}>
                {t("settings.tabSetup")}
              </TabsTrigger>
              <TabsTrigger value="data" onPointerDown={hapticTap}>
                {t("settings.tabData")}
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="setup"
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
            >
              <SettingsSetupForm
                key={settingsFormKey}
                settings={settings}
                onSaved={() => setShowSavedToast(true)}
              />
            </TabsContent>
            <TabsContent
              value="data"
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
            >
              <DataManagement />
            </TabsContent>
          </Tabs>
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

function SettingsSetupForm({
  settings,
  onSaved,
}: {
  settings: Settings
  onSaved: () => void
}) {
  const { t } = useI18n()
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
  const [autoFillFlexOnStop, setAutoFillFlexOnStop] = useState(
    settings.autoFillFlexOnStop
  )

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
      autoFillFlexOnStop,
    })
    setHapticMode(hapticMode)
    hapticSuccess()
    onSaved()
  }

  return (
    <>
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

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">
                {t("settings.autoFillFlexOnStop")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("settings.autoFillFlexOnStopDescription")}
              </span>
            </div>
            <Switch
              checked={autoFillFlexOnStop}
              onCheckedChange={setAutoFillFlexOnStop}
              onPointerDown={hapticTap}
            />
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
    </>
  )
}

type PendingAction = "import" | "delete"

function DataManagement() {
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [confirmText, setConfirmText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const closeDialog = () => {
    setPendingAction(null)
    setPendingImportFile(null)
    setConfirmText("")
    setError(null)
  }

  const flash = (message: string) => {
    setStatus(message)
    window.setTimeout(() => setStatus(null), 2600)
  }

  const onExport = async () => {
    hapticTap()
    setError(null)
    try {
      const fileName = await exportDatabase()
      hapticSuccess()
      flash(t("settings.data.exportDone", { file: fileName }))
    } catch {
      flash(t("settings.data.exportError"))
    }
  }

  const onPickImport = () => {
    hapticTap()
    fileInputRef.current?.click()
  }

  const onFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ""
    if (!file) return
    setPendingImportFile(file)
    setPendingAction("import")
    setConfirmText("")
    setError(null)
  }

  const onRequestDelete = () => {
    hapticTap()
    setPendingAction("delete")
    setConfirmText("")
    setError(null)
  }

  const confirmed = confirmText.trim().toUpperCase() === "YES"

  const onConfirm = async () => {
    if (!confirmed || busy) return
    setBusy(true)
    setError(null)
    try {
      if (pendingAction === "import" && pendingImportFile) {
        const result = await importDatabase(pendingImportFile)
        hapticSuccess()
        flash(
          t("settings.data.importDone", { count: result.workEntries })
        )
      } else if (pendingAction === "delete") {
        await clearAllData()
        hapticSuccess()
        flash(t("settings.data.deleteDone"))
      }
      closeDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : ""
      const reason =
        message === "invalid-json" ||
        message === "invalid-format" ||
        message.startsWith("invalid-workEntries")
          ? `${t("settings.data.importInvalid")} (${message})`
          : t("settings.data.actionError")
      setError(reason)
    } finally {
      setBusy(false)
    }
  }

  const dialogOpen = pendingAction !== null
  const isDelete = pendingAction === "delete"

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {t("settings.data.description")}
        </p>

        <div className="flex flex-col gap-1 rounded-lg border border-border/50 p-3">
          <span className="text-sm font-medium">
            {t("settings.data.exportTitle")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("settings.data.exportDescription")}
          </span>
          <Button
            variant="outline"
            className="mt-2 w-full"
            onClick={onExport}
          >
            <Download />
            {t("settings.data.exportButton")}
          </Button>
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-border/50 p-3">
          <span className="text-sm font-medium">
            {t("settings.data.importTitle")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("settings.data.importDescription")}
          </span>
          <Button
            variant="outline"
            className="mt-2 w-full"
            onClick={onPickImport}
          >
            <Upload />
            {t("settings.data.importButton")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".db,application/json"
            className="hidden"
            onChange={onFileChosen}
          />
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-destructive/30 p-3">
          <span className="text-sm font-medium text-destructive">
            {t("settings.data.deleteTitle")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("settings.data.deleteDescription")}
          </span>
          <Button
            variant="destructive"
            className="mt-2 w-full"
            onClick={onRequestDelete}
          >
            <Trash2 />
            {t("settings.data.deleteButton")}
          </Button>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isDelete
                ? t("settings.data.deleteConfirmTitle")
                : t("settings.data.importConfirmTitle")}
            </DialogTitle>
            <DialogDescription>
              {isDelete
                ? t("settings.data.deleteConfirmDescription")
                : t("settings.data.importConfirmDescription", {
                    file: pendingImportFile?.name ?? "",
                  })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted-foreground">
              {t("settings.data.confirmPrompt")}
            </label>
            <Input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="YES"
              aria-invalid={confirmText.length > 0 && !confirmed}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} disabled={busy}>
              {t("settings.data.cancel")}
            </Button>
            <Button
              variant={isDelete ? "destructive" : "default"}
              onClick={onConfirm}
              disabled={!confirmed || busy}
            >
              {isDelete
                ? t("settings.data.deleteButton")
                : t("settings.data.importButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {status && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
          <div className="rounded-lg border bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
            {status}
          </div>
        </div>
      )}
    </>
  )
}
