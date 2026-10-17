"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { I18nextProvider } from "react-i18next";
import type { Locale } from "@aml/shared";
import { createClientI18n } from "@/shared/i18n/client";

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    },
  });

// next-themes inlines a script that sets the theme before paint. It must run in the server HTML,
// but switching the locale re-renders this layout on the client, where React 19 warns about any
// executable <script>. On the client the theme is already applied, so the script becomes inert data.
const themeScriptProps = typeof window === "undefined" ? undefined : { type: "application/json" };

export const Providers = ({ locale, children }: { locale: Locale; children: ReactNode }) => {
  const [queryClient] = useState(makeQueryClient);
  const [i18n] = useState(() => createClientI18n(locale));

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false} disableTransitionOnChange scriptProps={themeScriptProps}>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        <ReactQueryDevtools buttonPosition="bottom-left" />
      </QueryClientProvider>
    </ThemeProvider>
  );
};
