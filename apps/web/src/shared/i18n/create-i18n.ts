import { createInstance, type i18n, type Module } from "i18next";
import { defaultLocale, type Locale } from "@aml/shared";
import en from "./locales/en.json";
import fa from "./locales/fa.json";

// German, Turkish and Arabic fall back to English until their files are written (release 5).
const resources = {
  en: { common: en },
  fa: { common: fa },
} as const;

/** A fresh i18next instance per request (server) or per app mount (client). */
export const createI18n = (locale: Locale, plugins: Module[] = []): i18n => {
  const instance = createInstance();
  plugins.forEach((plugin) => instance.use(plugin));
  void instance.init({
    lng: locale,
    fallbackLng: defaultLocale,
    defaultNS: "common",
    resources,
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return instance;
};

/** For Server Components: `const t = getT(locale); t("overview.title")`. */
export const getT = (locale: Locale) => createI18n(locale).t;
