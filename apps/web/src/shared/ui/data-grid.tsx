"use client";

import { AG_GRID_LOCALE_DE, AG_GRID_LOCALE_EG, AG_GRID_LOCALE_EN, AG_GRID_LOCALE_IR, AG_GRID_LOCALE_TR } from "@ag-grid-community/locale";
import { ModuleRegistry, themeQuartz } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import { directionOf, type Locale } from "@aml/shared";
import { useLocale } from "@/shared/i18n/use-locale";

// AG Grid Enterprise runs without a license key in this demo: it shows a watermark and a console
// message (see README). Register all modules once.
ModuleRegistry.registerModules([AllEnterpriseModule]);

/** Grid theme built from the design tokens, so light/dark switches with the rest of the app. */
const gridTheme = themeQuartz.withParams({
  backgroundColor: "var(--card)",
  foregroundColor: "var(--text)",
  chromeBackgroundColor: "var(--card)",
  headerBackgroundColor: "var(--card)",
  headerTextColor: "var(--text-secondary)",
  headerFontWeight: 400,
  headerFontSize: 12,
  borderColor: "var(--border)",
  rowHoverColor: "var(--muted)",
  selectedRowBackgroundColor: "var(--accent-soft)",
  accentColor: "var(--accent)",
  oddRowBackgroundColor: "var(--card)",
  fontFamily: "inherit",
  fontSize: 13,
  spacing: 6,
  rowHeight: 44,
  headerHeight: 40,
  wrapperBorderRadius: 12,
  wrapperBorder: true,
  columnBorder: false,
  iconSize: 14,
});

const gridLocale: Record<Locale, Record<string, string>> = {
  en: AG_GRID_LOCALE_EN,
  de: AG_GRID_LOCALE_DE,
  tr: AG_GRID_LOCALE_TR,
  ar: AG_GRID_LOCALE_EG,
  fa: AG_GRID_LOCALE_IR,
};

export const DataGrid = <T,>(props: AgGridReactProps<T>) => {
  const locale = useLocale();
  return (
    <AgGridReact<T>
      theme={gridTheme}
      enableRtl={directionOf(locale) === "rtl"}
      localeText={gridLocale[locale]}
      suppressCellFocus
      animateRows={false}
      {...props}
    />
  );
};
