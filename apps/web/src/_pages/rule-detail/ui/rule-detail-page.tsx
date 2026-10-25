"use client";

import Link from "next/link";
import type Highcharts from "highcharts";
import { ArrowLeft, ArrowRight, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { criteriaGroupSchema } from "@aml/shared";
import { RiskBadge } from "@/entities/alert";
import { CriteriaView, useRule, useRuleText } from "@/entities/rule";
import { useCan } from "@/entities/session";
import { isHttpError } from "@/shared/api";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatDate, formatNumber, formatPercent } from "@/shared/lib/format";
import { useNow } from "@/shared/lib/use-now";
import { Button } from "@/shared/ui/button";
import { Chart } from "@/shared/ui/chart";
import { Panel, PanelHeader } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";

const statusColor = { NEW: "chart-1", IN_REVIEW: "chart-3", ESCALATED: "chart-2", CLOSED_FALSE_POSITIVE: "risk-high" } as const;

export const RuleDetailPage = ({ code }: { code: string }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const can = useCan();
  const ruleText = useRuleText();
  const { data, isPending, error } = useRule(code);
  const now = useNow();
  const Back = locale === "fa" || locale === "ar" ? ArrowRight : ArrowLeft;

  if (isPending) return <Skeleton className="h-[560px]" />;
  if (error || !data) {
    return (
      <Panel>
        <p>{isHttpError(error) && error.status === 404 ? t("ruleDetail.notFound") : t("errors.generic")}</p>
        <Link href={href("/rules")} className="text-link hover:underline">{t("ruleDetail.back")}</Link>
      </Panel>
    );
  }

  const criteria = criteriaGroupSchema.safeParse(data.criteria);
  const total = data.statusMix.reduce((s, m) => s + m.count, 0);
  const today = new Date(now).setUTCHours(0, 0, 0, 0);
  const days = data.daily.map((_, i) => new Date(today - (data.daily.length - 1 - i) * 86_400_000).toISOString());
  const avg = data.daily.reduce((s, v) => s + v, 0) / Math.max(data.daily.length, 1);
  const recent = data.daily.slice(-7).reduce((s, v) => s + v, 0) / 7;
  const trend = avg ? recent / avg : 1;

  return (
    <>
      <Link href={href("/rules")} className="inline-flex w-fit items-center gap-1.5 text-sm text-text-secondary hover:text-text">
        <Back className="size-4" /> {t("ruleDetail.back")}
      </Link>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-mono text-sm text-text-secondary">{data.code} <RiskBadge level={data.riskLevel} /> {!data.enabled ? <span className="font-sans text-xs">{t("rules.disabled")}</span> : null}</p>
          <h1 className="mt-1 text-2xl text-heading">{ruleText.name(data.code, data.name)}</h1>
          <p className="mt-1 max-w-3xl text-text-secondary">{ruleText.description(data.code, data.description)}</p>
        </div>
        {can("rules.manage") ? <Button variant="outline" asChild><Link href={href(`/rules/${data.code}/edit`)}><Pencil /> {t("ruleDetail.edit")}</Link></Button> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {([
          [t("ruleDetail.kpi.alerts"), formatNumber(data.alerts30d, locale)],
          [t("ruleDetail.kpi.hit"), formatPercent(data.hitRate, locale)],
          [t("ruleDetail.kpi.fp"), formatPercent(data.falsePositiveRate, locale)],
          [t("ruleDetail.kpi.since"), formatDate(data.createdAt, locale)],
        ] as const).map(([label, value]) => (
          <Panel key={label} className="gap-1 p-5">
            <p className="text-xs text-text-secondary">{label}</p>
            <p className="text-2xl text-heading">{value}</p>
          </Panel>
        ))}
      </div>

      <div className="flex flex-col gap-6 xl:flex-row">
        <Panel className="min-w-0 flex-1">
          <PanelHeader
            eyebrow={t("ruleDetail.daily")}
            title={trend > 1.25 ? t("ruleDetail.trendUp", { pct: formatPercent((trend - 1) * 100, locale) }) : trend < 0.8 ? t("ruleDetail.trendDown", { pct: formatPercent((1 - trend) * 100, locale) }) : t("ruleDetail.trendFlat")}
          />
          <Chart
            height={240}
            options={(col): Highcharts.Options => ({
              chart: { type: "column" },
              xAxis: { type: "datetime", reversed: false, labels: { formatter() { return formatDate(new Date(Number((this as unknown as { value: number }).value)).toISOString(), locale, { day: "numeric", month: "short" }); } } },
              yAxis: { allowDecimals: false, plotLines: [{ value: avg, color: col["text-secondary"], dashStyle: "Dash", width: 1, zIndex: 3, label: { text: t("ruleDetail.average"), style: { color: col["text-secondary"] } } }] },
              plotOptions: { column: { borderRadius: 2, borderWidth: 0, pointPadding: 0.05, groupPadding: 0 } },
              tooltip: { xDateFormat: "%e %b" },
              series: [{ type: "column", name: t("ruleDetail.alerts"), color: col["chart-2"], data: data.daily.map((v, i) => [Date.parse(days[i]!), v]) }],
            })}
          />
        </Panel>
        <Panel className="w-full xl:w-[380px] xl:shrink-0">
          <PanelHeader eyebrow={t("ruleDetail.outcomes")} title={t("ruleDetail.outcomesTitle", { total: formatNumber(total, locale) })} />
          <ul className="flex flex-col gap-3">
            {data.statusMix.map((m) => (
              <li key={m.status} className="flex flex-col gap-1">
                <span className="flex justify-between text-sm"><span>{t(`alertStatus.${m.status}`)}</span><span className="text-text-secondary">{formatNumber(m.count, locale)}</span></span>
                <span className="h-2 overflow-hidden rounded-full bg-muted" dir="ltr">
                  <span className="block h-full rounded-full" style={{ width: `${total ? (m.count / total) * 100 : 0}%`, background: `var(--${statusColor[m.status]})` }} />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel>
        <PanelHeader eyebrow={t("ruleDetail.criteria")} />
        {criteria.success ? <CriteriaView group={criteria.data} /> : <p className="text-text-secondary">—</p>}
      </Panel>
    </>
  );
};
