import { createInstance, type i18n, type Module } from "i18next";
import { defaultLocale, type Locale } from "@aml/shared";
import ar from "./locales/ar.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import fa from "./locales/fa.json";
import tr from "./locales/tr.json";

// Every locale has the full set of keys (release 5); English stays the fallback.
const resources = {
  en: { common: en },
  de: { common: de },
  tr: { common: tr },
  ar: { common: ar },
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
