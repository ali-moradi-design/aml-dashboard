"use client";

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { defaultLocale, isLocale, type Locale } from "@aml/shared";

/** Current locale from i18next (set from the URL segment). */
export const useLocale = (): Locale => {
  const { i18n } = useTranslation();
  return isLocale(i18n.language) ? i18n.language : defaultLocale;
};

/** Builds links that keep the locale prefix: href("/alerts") → "/fa/alerts". */
export const useHref = () => {
  const locale = useLocale();
  return useCallback((path: string) => `/${locale}${path === "/" ? "" : path}`, [locale]);
};
