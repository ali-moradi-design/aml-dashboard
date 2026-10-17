"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "@/features/language-switch";
import { ThemeToggle } from "@/features/theme-toggle";
import { UserMenu } from "@/features/user-menu";
import { useHref } from "@/shared/i18n/use-locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

/** Plain 64px app bar (decided with the author): search, theme, language, notifications, user. */
export const AppBar = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const href = useHref();
  const [query, setQuery] = useState("");

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-card px-8">
      <form
        role="search"
        className="flex h-10 w-full max-w-[400px] items-center gap-2 rounded-md border border-border bg-muted px-3 text-text-secondary focus-within:ring-2 focus-within:ring-ring"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) router.push(`${href("/alerts")}?search=${encodeURIComponent(query.trim())}`);
        }}
      >
        <Search className="size-[18px] shrink-0" strokeWidth={1.75} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("appBar.search")}
          aria-label={t("appBar.search")}
          className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-secondary"
        />
        <kbd className="hidden rounded-sm border border-border bg-card px-1.5 font-mono text-xs sm:block">Ctrl K</kbd>
      </form>
      <div className="flex-1" />
      <ThemeToggle />
      <LanguageSwitch />
      <Popover>
        <PopoverTrigger
          aria-label={t("appBar.notifications")}
          className="relative grid size-10 place-items-center rounded-md border border-border bg-muted text-text outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="size-[18px]" strokeWidth={1.75} />
          <span className="absolute end-2.5 top-2.5 size-2 rounded-full bg-risk-high" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <p className="text-text">{t("appBar.notifications")}</p>
          <p className="mt-1 text-xs text-text-secondary">{t("appBar.notificationsSoon")}</p>
        </PopoverContent>
      </Popover>
      <span className="h-7 w-px bg-border" aria-hidden />
      <UserMenu />
    </header>
  );
};
