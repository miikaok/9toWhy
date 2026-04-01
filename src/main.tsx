/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { registerSW } from "virtual:pwa-register"
import { I18nProvider } from "@/i18n/I18nProvider.tsx"
import { useSettings } from "@/db/hooks"

registerSW({ immediate: true })

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
