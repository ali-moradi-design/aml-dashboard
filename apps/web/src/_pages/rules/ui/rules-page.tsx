"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { RuleRow } from "@aml/shared";
import { RiskBadge } from "@/entities/alert";
import { useRuleText, useRules } from "@/entities/rule";
import { useCan } from "@/entities/session";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatNumber, formatPercent, formatRelative } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Panel, PanelHeader, PageHeader } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";
import { Sparkline } from "@/shared/ui/sparkline";

/** Rate bar: precision (escalated) in brand blue, noise (false positives) in red. */
const RateBar = ({ hit, fp }: { hit: number; fp: number }) => (
  <span className="flex h-1.5 w-28 overflow-hidden rounded-full bg-muted" dir="ltr" aria-hidden>
    <span className="bg-brand" style={{ width: `${hit}%` }} />
    <span className="bg-risk-high" style={{ width: `${fp}%` }} />
  </span>
);

export const RulesPage = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const router = useRouter();
  const can = useCan();
  const ruleText = useRuleText();
  const { data, isPending, isError } = useRules();

  const noisiest = data
    ?.filter((r) => r.alerts30d >= 20)
    .sort((a, b) => b.falsePositiveRate - a.falsePositiveRate)[0];
  const sharpest = data?.filter((r) => r.alerts30d >= 20).sort((a, b) => b.hitRate - a.hitRate)[0];
  const open = (r: RuleRow) => router.push(href(`/rules/${r.code}`));

  return (
    <>
      <PageHeader
        title={t("rules.title")}
        subtitle={
          data
            ? t("rules.subtitle", {
                count: data.length,
                active: formatNumber(data.filter((r) => r.enabled).length, locale),
              })
            : t("alerts.subtitleLoading")
        }
        actions={
          can("rules.manage") ? (
            <Button size="lg" asChild>
              <Link href={href("/rules/new")}>
                <Plus /> {t("rules.new")}
              </Link>
            </Button>
          ) : null
        }
      />

      {noisiest && sharpest ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Panel className="gap-2">
            <p className="text-xs text-text-secondary">{t("rules.sharpest")}</p>
            <p className="text-base">
              {t("rules.sharpestText", {
                rule: ruleText.name(sharpest.code, sharpest.name),
                rate: formatPercent(sharpest.hitRate, locale),
              })}
            </p>
          </Panel>
          <Panel className="gap-2">
            <p className="text-xs text-text-secondary">{t("rules.noisiest")}</p>
            <p className="text-base">
              {t("rules.noisiestText", {
                rule: ruleText.name(noisiest.code, noisiest.name),
                rate: formatPercent(noisiest.falsePositiveRate, locale),
              })}
            </p>
          </Panel>
        </div>
      ) : null}

      <Panel className="p-0">
        <div className="px-6 pt-5">
          <PanelHeader eyebrow={t("rules.performance")} title={t("rules.performanceTitle")} />
        </div>
        {isError ? <p className="p-6 text-text-secondary">{t("errors.generic")}</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-220 text-sm" aria-label={t("rules.title")}>
            <thead>
              <tr className="text-xs text-text-secondary">
                {(["rule", "risk", "alerts", "trend", "rates", "last", "state"] as const).map(
                  (k) => (
                    <th
                      key={k}
                      scope="col"
                      className={cn(
                        "border-b border-border px-3 py-2 font-normal first:ps-6 last:pe-6",
                        k === "alerts" ? "text-end" : "text-start",
                      )}
                    >
                      {t(`rules.col.${k}`)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {isPending
                ? Array.from({ length: 5 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-6 py-3">
                        <Skeleton className="h-8" />
                      </td>
                    </tr>
                  ))
                : data?.map((r) => (
                    <tr
                      key={r.id}
                      tabIndex={0}
                      onClick={() => open(r)}
                      onKeyDown={(e) => e.key === "Enter" && open(r)}
                      className="cursor-pointer hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <td className="border-b border-border py-3 ps-6 pe-3">
                        <span className="block">{ruleText.name(r.code, r.name)}</span>
                        <span className="font-mono text-xs text-text-secondary">{r.code}</span>
                      </td>
                      <td className="border-b border-border px-3">
                        <RiskBadge level={r.riskLevel} />
                      </td>
                      <td className="ltr-nums border-b border-border px-3 text-end">
                        {formatNumber(r.alerts30d, locale)}
                      </td>
                      <td className="border-b border-border px-3">
                        <Sparkline values={r.daily} width={110} height={28} />
                      </td>
                      <td className="border-b border-border px-3">
                        <span className="flex items-center gap-3">
                          <RateBar hit={r.hitRate} fp={r.falsePositiveRate} />
                          <span className="text-xs text-text-secondary">
                            {t("rules.rates", {
                              hit: formatPercent(r.hitRate, locale),
                              fp: formatPercent(r.falsePositiveRate, locale),
                            })}
                          </span>
                        </span>
                      </td>
                      <td className="border-b border-border px-3 text-text-secondary">
                        {r.lastAlertAt ? formatRelative(r.lastAlertAt, locale) : "—"}
                      </td>
                      <td className="border-b border-border py-3 ps-3 pe-6">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs",
                            r.enabled
                              ? "bg-risk-low-bg text-risk-low-text"
                              : "bg-muted text-text-secondary",
                          )}
                        >
                          {r.enabled ? t("rules.enabled") : t("rules.disabled")}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-center gap-4 px-6 pb-5 text-xs text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-brand" />
            {t("rules.legendHit")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-risk-high" />
            {t("rules.legendFp")}
          </span>
        </p>
      </Panel>
    </>
  );
};
