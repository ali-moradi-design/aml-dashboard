"use client";

import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, Globe } from "lucide-react";
import { locales, type Locale } from "@aml/shared";
import { useLocale } from "@/shared/i18n/use-locale";
import { setCookie } from "@/shared/lib/browser";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

const names: Record<Locale, string> = { en: "English", de: "Deutsch", tr: "Türkçe", ar: "العربية", fa: "فارسی" };

/** Short code in the app bar (EN, DE, ...); full names in the menu. Switching keeps the current page. */
export const LanguageSwitch = () => {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const change = (next: Locale) => {
    setCookie("aml-locale", next);
    router.push((pathname ?? "").replace(new RegExp(`^/${locale}(?=/|$)`), `/${next}`));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-10 items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring">
        <Globe className="size-[18px]" strokeWidth={1.75} />
        <span className="text-text uppercase">{locale}</span>
        <ChevronDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {locales.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => change(l)} className="justify-between gap-6">
            <span lang={l}>{names[l]}</span>
            <span className="flex items-center gap-2 text-xs text-text-secondary uppercase">
              {l}
              {l === locale ? <Check className="size-3.5" /> : null}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
