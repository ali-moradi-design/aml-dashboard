export const locales = ["en", "de", "tr", "ar", "fa"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const rtlLocales: readonly Locale[] = ["ar", "fa"];

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

export const directionOf = (locale: Locale): "rtl" | "ltr" =>
  rtlLocales.includes(locale) ? "rtl" : "ltr";
