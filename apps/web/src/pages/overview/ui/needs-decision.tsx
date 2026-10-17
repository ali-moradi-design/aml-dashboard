"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { Overview } from "@aml/shared";
import { RiskBadge } from "@/entities/alert";
import { useRuleText } from "@/entities/rule";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatMoney, formatNumber } from "@/shared/lib/format";
import { Panel, PanelHeader } from "@/shared/ui/panel";

const hoursWaiting = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));

/** Oldest open high-risk alerts: the analyst's first stop of the day. */
export const NeedsDecision = ({ data }: { data: Overview }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const rows = data.needsDecision;
  const ruleText = useRuleText();
  const overdue = rows.filter((r) => hoursWaiting(r.createdAt) >= 24).length;

  return (
    <Panel className="min-w-0 flex-1 gap-4">
      <PanelHeader
        eyebrow={t("overview.needs.eyebrow")}
        title={overdue ? t("overview.needs.insight", { count: overdue }) : t("overview.needs.none")}
        actions={
          <Link href={`${href("/alerts")}?riskLevel=HIGH&status=NEW&status=IN_REVIEW`} className="text-sm whitespace-nowrap text-link hover:underline">
            {t("overview.needs.viewAll")}
          </Link>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-text-secondary">
              {["alert", "customer", "rule", "amount", "waiting", "risk"].map((k) => (
                <th key={k} className={`border-t border-border py-2 pe-3 font-normal ${k === "amount" ? "text-end" : "text-start"}`}>
                  {t(`overview.needs.col.${k}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-muted">
                <td className="border-t border-border py-3 pe-3">
                  <Link href={href(`/alerts/${r.code}`)} className="font-mono text-link hover:underline">
                    {r.code}
                  </Link>
                </td>
                <td className="border-t border-border py-3 pe-3 whitespace-nowrap">{r.customerName}</td>
                <td className="border-t border-border py-3 pe-3">{ruleText.name(r.ruleCode, r.ruleName)}</td>
                <td className="ltr-nums border-t border-border py-3 pe-3 text-end whitespace-nowrap">{r.amount && r.currency ? formatMoney(r.amount, r.currency, locale) : "—"}</td>
                <td className="border-t border-border py-3 pe-3 whitespace-nowrap">
                  {hoursWaiting(r.createdAt) < 48
                    ? t("overview.needs.hours", { hours: formatNumber(hoursWaiting(r.createdAt), locale) })
                    : t("overview.needs.days", { days: formatNumber(Math.floor(hoursWaiting(r.createdAt) / 24), locale) })}
                </td>
                <td className="border-t border-border py-3">
                  <RiskBadge level={r.riskLevel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};
