import { format, startOfWeek, addDays } from "date-fns"
import { enGB, fi, sv, pl, es } from "date-fns/locale"
import type { Locale } from "date-fns"
import type { AppLocale } from "@/i18n/types"

export const DATE_FNS_LOCALES: Record<AppLocale, Locale> = {
  en: enGB,
  fi,
  sv,
  pl,
  es,
}

export function getDateFnsLocale(locale: AppLocale): Locale {
  return DATE_FNS_LOCALES[locale] ?? DATE_FNS_LOCALES.en
}

export function formatLocaleDate(
  date: Date,
  dateFormat: string,
  locale: AppLocale
): string {
  return format(date, dateFormat, { locale: getDateFnsLocale(locale) })
}

export function getLocalizedWeekdays(locale: AppLocale): string[] {
  const dateLocale = getDateFnsLocale(locale)
  const start = startOfWeek(new Date(), { locale: dateLocale })
  return Array.from({ length: 7 }).map((_, index) =>
    format(addDays(start, index), "EEE", { locale: dateLocale })
  )
}
