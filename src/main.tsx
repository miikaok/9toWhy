/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { registerSW } from "virtual:pwa-register"
import { I18nProvider } from "@/i18n/I18nProvider.tsx"
import { useSettings } from "@/db/hooks"

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    // Poll for updates every hour so a long-lived tab picks up new versions.
    // When autoUpdate finds a new SW it calls skipWaiting + clients.claim,
    // which causes the browser to reload the page so the new CHANGELOG.md
    // is fetched and the What's New dialog fires automatically.
    if (registration) {
      setInterval(() => void registration.update(), 60 * 60 * 1000)
    }
  },
})

function AppRoot() {
  const settings = useSettings()
  return (
    <I18nProvider locale={settings.locale}>
      <App />
    </I18nProvider>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AppRoot />
    </ThemeProvider>
  </StrictMode>
)
