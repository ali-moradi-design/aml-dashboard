"use client";

import { Star } from "lucide-react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { locales, notificationTypes, startPages, type Locale, type Preferences } from "@aml/shared";
import { localeNames, useChangeLocale } from "@/features/language-switch";
import { useCan } from "@/entities/session";
import { usePreferences, useSavePreferences } from "@/entities/settings";
import { footerNav, navGroups } from "@/shared/config/navigation";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Checkbox } from "@/shared/ui/checkbox";
import { Note, Panel, PanelHeader } from "@/shared/ui/panel";
import { Segmented } from "@/shared/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const MAX_QUICK = 6;
const allPages = [...navGroups.flatMap((g) => g.items), ...footerNav];

/** Preferences save on every change (optimistic), so there is no Save button. */
const usePreference = () => {
  const prefs = usePreferences();
  const save = useSavePreferences();
  return { prefs, save: (patch: Partial<Preferences>) => save.mutate({ ...prefs, ...patch }), status: save };
};

const Row = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <div className="grid items-center gap-2 border-b border-border py-4 last:border-b-0 md:grid-cols-[1fr_minmax(0,320px)]">
    <div>
      <p className="text-sm">{label}</p>
      {hint ? <p className="text-xs text-text-secondary">{hint}</p> : null}
    </div>
    <div>{children}</div>
  </div>
);

const SaveState = ({ status }: { status: ReturnType<typeof useSavePreferences> }) => {
  const { t } = useTranslation();
  if (status.isError) return <span className="text-xs text-risk-high-text" role="status">{t("settings.saveFailed")}</span>;
  if (status.isSuccess) return <span className="text-xs text-risk-low-text" role="status">{t("settings.saved")}</span>;
  return null;
};

export const AppearanceSection = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const changeLocale = useChangeLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const { prefs, save, status } = usePreference();
  const nativeDigits = locale === "fa" || locale === "ar";

  return (
    <Panel className="gap-0">
      <PanelHeader eyebrow={t("settings.appearance.eyebrow")} title={t("settings.appearance.title")} actions={<SaveState status={status} />} />
      <div className="mt-2">
        <Row label={t("settings.appearance.language")} hint={t("settings.appearance.languageHint")}>
          <Select value={locale} onValueChange={(v) => changeLocale(v as Locale)}>
            <SelectTrigger aria-label={t("settings.appearance.language")}><SelectValue /></SelectTrigger>
            <SelectContent>{locales.map((l) => <SelectItem key={l} value={l}><span lang={l}>{localeNames[l]}</span></SelectItem>)}</SelectContent>
          </Select>
        </Row>
        <Row label={t("settings.appearance.theme")} hint={t("settings.appearance.themeHint")}>
          <Segmented label={t("settings.appearance.theme")} value={resolvedTheme === "dark" ? "dark" : "light"} onChange={setTheme} options={[{ value: "light", label: t("theme.light") }, { value: "dark", label: t("theme.dark") }]} />
        </Row>
        <Row label={t("settings.appearance.digits")} hint={t(nativeDigits ? "settings.appearance.digitsHint" : "settings.appearance.digitsOnlyRtl")}>
          <Segmented
            label={t("settings.appearance.digits")}
            value={prefs.digits}
            onChange={(digits) => save({ digits })}
            options={[{ value: "native", label: `${t("settings.appearance.native")} (${new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "fa-IR").format(1234)})` }, { value: "latin", label: `${t("settings.appearance.latin")} (1234)` }]}
          />
        </Row>
        <Row label={t("settings.appearance.density")} hint={t("settings.appearance.densityHint")}>
          <Segmented label={t("settings.appearance.density")} value={prefs.density} onChange={(density) => save({ density })} options={[{ value: "comfortable", label: t("settings.appearance.comfortable") }, { value: "compact", label: t("settings.appearance.compact") }]} />
        </Row>
        <Row label={t("settings.appearance.startPage")} hint={t("settings.appearance.startPageHint")}>
          <Select value={prefs.startPage} onValueChange={(v) => save({ startPage: v as Preferences["startPage"] })}>
            <SelectTrigger aria-label={t("settings.appearance.startPage")}><SelectValue /></SelectTrigger>
            <SelectContent>
              {startPages.map((p) => {
                const item = allPages.find((i) => i.path === p);
                return <SelectItem key={p} value={p}>{item ? t(`nav.${item.key}`) : p}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </Row>
      </div>
    </Panel>
  );
};

export const NotificationsSection = () => {
  const { t } = useTranslation();
  const { prefs, save, status } = usePreference();
  const on = (type: (typeof notificationTypes)[number]) => prefs.notifications[type] !== false;

  return (
    <Panel className="gap-0">
      <PanelHeader eyebrow={t("settings.notifications.eyebrow")} title={t("settings.notifications.title")} actions={<SaveState status={status} />} />
      <ul className="mt-2">
        {notificationTypes.map((type) => (
          <li key={type} className="border-b border-border py-3 last:border-b-0">
            <label className="flex items-start gap-3">
              <Checkbox checked={on(type)} onCheckedChange={(v) => save({ notifications: { ...prefs.notifications, [type]: v === true } })} className="mt-0.5" />
              <span>
                <span className="block text-sm">{t(`notifications.types.${type}`)}</span>
                <span className="block text-xs text-text-secondary">{t(`settings.notifications.hints.${type}`)}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Note>{t("settings.notifications.note")}</Note>
    </Panel>
  );
};

export const QuickAccessSection = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const can = useCan();
  const { prefs, save, status } = usePreference();
  const pages = allPages.filter((p) => can(p.permission));
  const full = prefs.quickAccess.length >= MAX_QUICK;
  const toggle = (path: string) => save({ quickAccess: prefs.quickAccess.includes(path) ? prefs.quickAccess.filter((p) => p !== path) : [...prefs.quickAccess, path] });

  return (
    <Panel>
      <PanelHeader
        eyebrow={t("settings.quickAccess.eyebrow")}
        title={t("settings.quickAccess.title", { used: formatNumber(prefs.quickAccess.length, locale), max: formatNumber(MAX_QUICK, locale) })}
        actions={<SaveState status={status} />}
      />
      <p className="-mt-2 text-sm text-text-secondary">{t("settings.quickAccess.hint")}</p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((p) => {
          const pinned = prefs.quickAccess.includes(p.path);
          const position = prefs.quickAccess.indexOf(p.path);
          return (
            <li key={p.path}>
              <button
                type="button"
                aria-pressed={pinned}
                disabled={!pinned && full}
                onClick={() => toggle(p.path)}
                className={cn(
                  "flex h-11 w-full items-center gap-3 rounded-md border px-3 text-start text-sm transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  pinned ? "border-brand bg-brand-soft text-heading" : "border-border hover:bg-muted",
                )}
              >
                <p.icon className="size-4 shrink-0 text-text-secondary" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate">{t(`nav.${p.key}`)}</span>
                {pinned ? <span className="text-xs text-text-secondary">{formatNumber(position + 1, locale)}</span> : null}
                <Star className={cn("size-4 shrink-0", pinned ? "fill-current text-heading" : "text-text-secondary")} />
              </button>
            </li>
          );
        })}
      </ul>
      {full ? <Note>{t("settings.quickAccess.full", { max: formatNumber(MAX_QUICK, locale) })}</Note> : null}
    </Panel>
  );
};
