import type { Locale } from "@aml/shared";

// Every number, date and amount goes through Intl. Persian and Arabic show native digits;
// all languages use the Gregorian calendar (brief: "Gregorian calendar for every language").
const intlLocale: Record<Locale, string> = {
  en: "en-GB",
  de: "de-DE",
  tr: "tr-TR",
  ar: "ar-EG-u-ca-gregory",
  fa: "fa-IR-u-ca-gregory",
};

export const toIntlLocale = (locale: Locale) => intlLocale[locale];

export const formatNumber = (value: number, locale: Locale, options: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat(intlLocale[locale], options).format(value);

export const formatCompact = (value: number, locale: Locale) =>
  new Intl.NumberFormat(intlLocale[locale], { notation: "compact", maximumFractionDigits: 1 }).format(value);

export const formatPercent = (value: number, locale: Locale, signed = false) =>
  new Intl.NumberFormat(intlLocale[locale], { style: "percent", maximumFractionDigits: 1, signDisplay: signed ? "exceptZero" : "auto" }).format(value / 100);

export const formatMoney = (amount: number | string, currency: string, locale: Locale) =>
  new Intl.NumberFormat(intlLocale[locale], { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount));

export const formatDateTime = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export const formatDate = (iso: string, locale: Locale, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) =>
  new Intl.DateTimeFormat(intlLocale[locale], options).format(new Date(iso));

export const formatWeekday = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocale[locale], { weekday: "short", day: "numeric" }).format(new Date(iso));

export const formatRelative = (iso: string, locale: Locale, now = Date.now()) => {
  const diffMinutes = Math.round((new Date(iso).getTime() - now) / 60_000);
  const rtf = new Intl.RelativeTimeFormat(intlLocale[locale], { numeric: "auto" });
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
  if (Math.abs(diffMinutes) < 60 * 24) return rtf.format(Math.round(diffMinutes / 60), "hour");
  return rtf.format(Math.round(diffMinutes / 1440), "day");
};

const unitHour: Record<Locale, [string, string]> = { en: ["h", "m"], de: ["h", "min"], tr: ["sa", "dk"], ar: ["س", "د"], fa: ["ساعت", "دقیقه"] };

/** Hours like 3.2 → "3h 12m" / "۳ ساعت ۱۲ دقیقه" (localized digits and units). */
export const formatHours = (hours: number, locale: Locale) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const [hu, mu] = unitHour[locale];
  const spaced = locale === "fa" || locale === "ar";
  return spaced ? `${formatNumber(h, locale)} ${hu} ${formatNumber(m, locale)} ${mu}` : `${formatNumber(h, locale)}${hu} ${formatNumber(m, locale)}${mu}`;
};
