"use client";

import { initReactI18next } from "react-i18next";
import type { Locale } from "@aml/shared";
import { createI18n } from "./create-i18n";

/** Client instance wired to react-i18next, for `useTranslation()` in Client Components. */
export const createClientI18n = (locale: Locale) => createI18n(locale, [initReactI18next]);

export { useLocale, useHref } from "./use-locale";
