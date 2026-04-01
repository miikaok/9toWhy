/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react"
import en from "@/i18n/locales/en.json"
import fi from "@/i18n/locales/fi.json"
import sv from "@/i18n/locales/sv.json"
import pl from "@/i18n/locales/pl.json"
import es from "@/i18n/locales/es.json"
import type { AppLocale } from "@/i18n/types"

type Primitive = string | number
type InterpolationMap = Record<string, Primitive>
type MessageTree = Record<string, unknown>

const dictionaries: Record<AppLocale, MessageTree> = { en, fi, sv, pl, es }

interface I18nContextValue {
  locale: AppLocale
  t: (key: string, vars?: InterpolationMap) => string
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

function getByPath(source: MessageTree, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, segment) => {
    if (typeof acc !== "object" || acc === null) return undefined
    return (acc as Record<string, unknown>)[segment]
  }, source)
}

function interpolate(template: string, vars?: InterpolationMap): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = vars[name]
    return value === undefined ? `{${name}}` : String(value)
  })
}

export function I18nProvider({
  children,
  locale,
}: {
  children: ReactNode
  locale: AppLocale
}) {
  const dictionary = dictionaries[locale] ?? dictionaries.en

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: (key, vars) => {
        const localValue = getByPath(dictionary, key)
        const fallbackValue = getByPath(dictionaries.en, key)
        const raw =
          typeof localValue === "string"
            ? localValue
            : typeof fallbackValue === "string"
              ? fallbackValue
              : key
        return interpolate(raw, vars)
      },
    }),
    [locale, dictionary]
  )

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = value.t("app.title")
    const description = document.querySelector('meta[name="description"]')
    if (description) {
      description.setAttribute("content", value.t("app.description"))
    }
  }, [locale, value])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18nContext() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error("useI18nContext must be used within I18nProvider")
  }
  return ctx
}
