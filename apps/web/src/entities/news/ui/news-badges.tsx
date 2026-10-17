"use client";

import { Pin } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NewsRow } from "@aml/shared";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

const stateClass: Record<NewsRow["state"], string> = {
  scheduled: "bg-risk-medium-bg text-risk-medium-text",
  live: "bg-risk-low-bg text-risk-low-text",
  expired: "bg-muted text-text-secondary",
};

export const NewsStateBadge = ({ state }: { state: NewsRow["state"] }) => {
  const { t } = useTranslation();
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap", stateClass[state])}>{t(`news.state.${state}`)}</span>;
};

export const PinnedBadge = () => {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs text-heading">
      <Pin className="size-3" /> {t("news.pinned")}
    </span>
  );
};

/** "6 of 8 read" with a thin bar; only managers and the author get the numbers. */
export const ReadMeter = ({ read, total }: { read: number; total: number }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const pct = total ? Math.round((read / total) * 100) : 0;
  return (
    <span className="flex items-center gap-2 text-xs text-text-secondary">
      <span className="flex h-1.5 w-20 overflow-hidden rounded-full bg-muted" dir="ltr" aria-hidden>
        <span className="bg-brand" style={{ width: `${pct}%` }} />
      </span>
      {t("news.readOf", { read: formatNumber(read, locale), total: formatNumber(total, locale) })}
    </span>
  );
};
