"use client";

import { useTranslation } from "react-i18next";
import type { Overview } from "@aml/shared";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatHours, formatNumber, formatPercent } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Sparkline } from "@/shared/ui/sparkline";

type Kpi = {
  label: string;
  value: string;
  delta: string;
  good: boolean;
  note: string;
  spark: number[];
};

const KpiCard = ({ kpi }: { kpi: Kpi }) => (
  <article className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-5">
    <div className="flex items-start justify-between gap-2">
      <span className="text-text-secondary">{kpi.label}</span>
      <Sparkline values={kpi.spark} />
    </div>
    <span className="text-[28px] leading-9 text-heading">{kpi.value}</span>
    <div className="flex items-center gap-2 text-xs text-text-secondary">
      <span
        className={cn(
          "rounded-full px-2 py-0.5",
          kpi.good ? "bg-risk-low-bg text-risk-low-text" : "bg-risk-high-bg text-risk-high-text",
        )}
      >
        {kpi.delta}
      </span>
      {kpi.note}
    </div>
  </article>
);

export const KpiRow = ({ data }: { data: Overview }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const { kpis, sparklines } = data;
  const items: Kpi[] = [
    {
      label: t("overview.kpi.open"),
      value: formatNumber(kpis.openAlerts, locale),
      delta: formatPercent(kpis.openAlertsDelta, locale, true),
      good: kpis.openAlertsDelta <= 0,
      note: t("overview.kpi.vsLastWeek"),
      spark: sparklines.open,
    },
    {
      label: t("overview.kpi.high"),
      value: formatNumber(kpis.highRiskAlerts, locale),
      delta: `+${formatNumber(kpis.highRiskToday, locale)}`,
      good: kpis.highRiskToday === 0,
      note: t("overview.kpi.today"),
      spark: sparklines.high,
    },
    {
      label: t("overview.kpi.inReview"),
      value: formatNumber(kpis.awaitingDecision, locale),
      delta: formatNumber(kpis.overdue, locale),
      good: kpis.overdue === 0,
      note: t("overview.kpi.overdue"),
      spark: sparklines.awaiting,
    },
    {
      label: t("overview.kpi.review"),
      value: formatHours(kpis.medianReviewHours, locale),
      delta:
        kpis.medianReviewHours <= 4 ? t("overview.kpi.onTarget") : t("overview.kpi.overTarget"),
      good: kpis.medianReviewHours <= 4,
      note: t("overview.kpi.target"),
      spark: sparklines.review,
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((k) => (
        <KpiCard key={k.label} kpi={k} />
      ))}
    </div>
  );
};
