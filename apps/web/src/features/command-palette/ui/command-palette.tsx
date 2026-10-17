"use client";

import { Command } from "cmdk";
import { FilePlus2, Folder, Megaphone, Moon, Search, Star, Sun, TriangleAlert, UserPlus, Users, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useDeferredValue, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Permission } from "@aml/shared";
import { useSearch } from "@/entities/search";
import { useCan } from "@/entities/session";
import { usePreferences } from "@/entities/settings";
import { footerNav, navGroups } from "@/shared/config/navigation";
import { useHref } from "@/shared/i18n/use-locale";
import { cn } from "@/shared/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog";
import { usePaletteStore } from "../model/palette-store";

type Entry = { id: string; label: string; hint?: string; icon: LucideIcon; run: () => void };

const allPages = [...navGroups.flatMap((g) => g.items), ...footerNav];

const Group = ({ heading, entries }: { heading: string; entries: Entry[] }) =>
  entries.length ? (
    <Command.Group heading={heading} className="px-2 pb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-text-secondary">
      {entries.map((e) => (
        <Command.Item key={e.id} value={e.id} onSelect={e.run} className="flex h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm text-text data-[selected=true]:bg-muted">
          <e.icon className="size-4 shrink-0 text-text-secondary" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 truncate">{e.label}</span>
          {e.hint ? <span className="ltr-nums shrink-0 font-mono text-xs text-text-secondary">{e.hint}</span> : null}
        </Command.Item>
      ))}
    </Command.Group>
  ) : null;

/** Ctrl K / ⌘K: pages (quick access first), actions and live search over customers, cases and alerts. */
export const CommandPalette = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const href = useHref();
  const can = useCan();
  const { resolvedTheme, setTheme } = useTheme();
  const { quickAccess } = usePreferences();
  const { open, setOpen } = usePaletteStore();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim());
  const results = useSearch(open ? deferred : "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen(!usePaletteStore.getState().open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const go = (path: string) => () => {
    close();
    router.push(href(path));
  };
  const matches = (label: string) => !deferred || label.toLocaleLowerCase().includes(deferred.toLocaleLowerCase());

  const pages = allPages
    .filter((p) => can(p.permission))
    .map((p) => ({ id: `page:${p.path}`, path: p.path, label: t(`nav.${p.key}`), icon: p.icon, run: go(p.path) }))
    .filter((p) => matches(p.label));
  const pinned = quickAccess.flatMap((path) => pages.filter((p) => p.path === path)).map((p) => ({ ...p, icon: Star }));
  const rest = pages.filter((p) => !quickAccess.includes(p.path));

  const dark = resolvedTheme === "dark";
  const actions = (
    [
      { id: "action:case", label: t("palette.newCase"), icon: FilePlus2, permission: "cases.create", run: go("/cases/new") },
      { id: "action:customer", label: t("palette.newCustomer"), icon: UserPlus, permission: "customers.manage", run: go("/customers/new") },
      { id: "action:news", label: t("palette.newNews"), icon: Megaphone, permission: "news.create", run: go("/news/new") },
      { id: "action:theme", label: t(dark ? "palette.lightTheme" : "palette.darkTheme"), icon: dark ? Sun : Moon, run: () => { setTheme(dark ? "light" : "dark"); close(); } },
    ] satisfies Array<Entry & { permission?: Permission }>
  ).filter((a: Entry & { permission?: Permission }) => (!a.permission || can(a.permission)) && matches(a.label));

  const found = deferred.length >= 2 ? results.data : undefined;
  const hits: Entry[] = [
    ...(found?.customers ?? []).map((c) => ({ id: `customer:${c.code}`, label: c.name, hint: c.code, icon: Users, run: go(`/customers/${c.code}`) })),
    ...(found?.cases ?? []).map((c) => ({ id: `case:${c.code}`, label: c.title, hint: c.code, icon: Folder, run: go(`/cases/${c.code}`) })),
    ...(found?.alerts ?? []).map((a) => ({ id: `alert:${a.code}`, label: a.customerName, hint: a.code, icon: TriangleAlert, run: go(`/alerts/${a.code}`) })),
    ...(deferred && can("alerts.view") ? [{ id: "search:alerts", label: t("palette.searchAlerts", { query: deferred }), icon: Search, run: go(`/alerts?search=${encodeURIComponent(deferred)}`) }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
        <DialogTitle className="sr-only">{t("palette.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("palette.hint")}</DialogDescription>
        <Command shouldFilter={false} loop label={t("palette.title")}>
          <div className="flex h-12 items-center gap-2 border-b border-border px-4">
            <Search className="size-[18px] shrink-0 text-text-secondary" strokeWidth={1.75} />
            <Command.Input value={query} onValueChange={setQuery} placeholder={t("palette.placeholder")} className="h-full min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-secondary" />
            <kbd className="rounded-sm border border-border px-1.5 font-mono text-xs text-text-secondary">Esc</kbd>
          </div>
          <Command.List className="max-h-[420px] overflow-y-auto pt-2">
            <Command.Empty className="p-8 text-center text-sm text-text-secondary">{results.isFetching ? t("common.loading") : t("palette.empty")}</Command.Empty>
            <Group heading={t("palette.quickAccess")} entries={pinned} />
            <Group heading={t("palette.results")} entries={hits} />
            <Group heading={t("palette.actions")} entries={actions} />
            <Group heading={t("palette.pages")} entries={rest} />
          </Command.List>
          <div className="flex gap-4 border-t border-border px-4 py-2 text-xs text-text-secondary">
            <span><kbd className="font-mono">↑↓</kbd> {t("palette.move")}</span>
            <span><kbd className="font-mono">Enter</kbd> {t("palette.open")}</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

/** The app bar search box; opens the palette. */
export const PaletteTrigger = ({ className }: { className?: string }) => {
  const { t } = useTranslation();
  const setOpen = usePaletteStore((s) => s.setOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-keyshortcuts="Control+K"
      className={cn("flex h-10 w-full max-w-[400px] items-center gap-2 rounded-md border border-border bg-muted px-3 text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      <Search className="size-[18px] shrink-0" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 truncate text-start">{t("appBar.search")}</span>
      <kbd className="hidden rounded-sm border border-border bg-card px-1.5 font-mono text-xs sm:block">Ctrl K</kbd>
    </button>
  );
};
