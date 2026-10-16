import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { directionOf, isLocale, locales } from "@aml/shared";
import { Providers } from "@/app/providers";
import { fontVariables } from "@/app/styles/fonts";
import "@/app/styles/globals.css";

export const metadata: Metadata = {
  title: "AML Monitor",
  description: "Transaction monitoring and anti-money laundering dashboard (portfolio demo, fictional data).",
};

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

// Routes stay thin: they read params and hand over to FSD layers in src/.
export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} dir={directionOf(locale)} className={fontVariables} suppressHydrationWarning>
      <body className="min-h-dvh bg-page text-text">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
