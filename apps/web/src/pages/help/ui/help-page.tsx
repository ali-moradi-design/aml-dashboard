"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useCan } from "@/entities/session";
import { footerNav, navGroups } from "@/shared/config/navigation";
import { useHref } from "@/shared/i18n/use-locale";
import { Note, PageHeader, Panel, PanelHeader } from "@/shared/ui/panel";

const SHORTCUTS = [
  { keys: ["Ctrl", "K"], key: "palette" },
  { keys: ["↑", "↓"], key: "move" },
  { keys: ["Enter"], key: "open" },
  { keys: ["Esc"], key: "close" },
  { keys: ["Tab"], key: "focus" },
  { keys: ["←", "→"], key: "segmented" },
] as const;

const ACCESS = ["permission", "region", "clearance", "membership"] as const;

export const HelpPage = () => {
  const { t } = useTranslation();
  const href = useHref();
  const can = useCan();
  const pages = [...navGroups.flatMap((g) => g.items), ...footerNav].filter((p) => p.key !== "help" && can(p.permission));

  return (
    <>
      <PageHeader title={t("help.title")} subtitle={t("help.subtitle")} />
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <Panel className="min-w-0 flex-1">
          <PanelHeader eyebrow={t("help.pagesEyebrow")} title={t("help.pagesTitle")} />
          <ul className="grid gap-3 md:grid-cols-2">
            {pages.map((p) => (
              <li key={p.key}>
                <Link href={href(p.path)} className="flex h-full gap-3 rounded-md border border-border p-4 transition-colors hover:border-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  <p.icon className="mt-0.5 size-5 shrink-0 text-text-secondary" strokeWidth={1.75} />
                  <span>
                    <span className="block text-sm text-text">{t(`nav.${p.key}`)}</span>
                    <span className="block text-xs text-text-secondary">{t(`help.pages.${p.key}`)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="flex w-full flex-col gap-6 xl:w-[400px]">
          <Panel>
            <PanelHeader eyebrow={t("help.shortcutsEyebrow")} title={t("help.shortcutsTitle")} />
            <dl className="flex flex-col divide-y divide-border">
              {SHORTCUTS.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <dt>{t(`help.shortcuts.${s.key}`)}</dt>
                  <dd className="flex shrink-0 gap-1" dir="ltr">{s.keys.map((k) => <kbd key={k} className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">{k}</kbd>)}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel>
            <PanelHeader eyebrow={t("help.accessEyebrow")} title={t("help.accessTitle")} />
            <ol className="flex flex-col gap-3">
              {ACCESS.map((a, i) => (
                <li key={a} className="flex gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs text-heading">{i + 1}</span>
                  <span>
                    <span className="block">{t(`help.access.${a}.title`)}</span>
                    <span className="block text-xs text-text-secondary">{t(`help.access.${a}.text`)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
          <Note>{t("help.demo")}</Note>
        </div>
      </div>
    </>
  );
};
