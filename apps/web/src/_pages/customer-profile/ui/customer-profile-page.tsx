"use client";

import Link from "next/link";
import { Share2 } from "lucide-react";
import type Highcharts from "highcharts";
import { useTranslation } from "react-i18next";
import { formatIban } from "@aml/shared";
import { EditKycDialog } from "./edit-kyc-dialog";
import { RiskBadge, StatusBadge } from "@/entities/alert";
import { CaseStatusBadge } from "@/entities/case";
import { useCustomer } from "@/entities/customer";
import { useRuleText } from "@/entities/rule";
import { useCan } from "@/entities/session";
import { isHttpError } from "@/shared/api";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import {
  formatCompact,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
} from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Chart } from "@/shared/ui/chart";
import { Gauge } from "@/shared/ui/gauge";
import { Note, Panel, PanelHeader } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";

const Item = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div>
    <dt className="text-xs text-text-secondary">{label}</dt>
    <dd className={cn("mt-0.5 text-text", mono && "ltr-nums font-mono text-[13px]")}>
      {value || "—"}
    </dd>
  </div>
);

export const CustomerProfilePage = ({ code }: { code: string }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const can = useCan();
  const ruleText = useRuleText();
  const { data, isPending, error } = useCustomer(code);

  if (isPending) return <Skeleton className="h-150" />;
  if (error || !data)
    return (
      <Panel>
        <p>
          {isHttpError(error) && error.status === 404
            ? t("customer.notFound")
            : t("errors.generic")}
        </p>
      </Panel>
    );

  const {
    customer: c,
    riskFactors,
    accounts,
    shareholders,
    monthly,
    transactions,
    alerts,
    cases,
  } = data;
  const person = c.type === "PERSON";
  const expected = Number(c.expectedMonthlyVolume ?? 0);
  const lastMonths = monthly.slice(-6);
  const avgIn = lastMonths.reduce((s, m) => s + m.incoming, 0) / Math.max(lastMonths.length, 1);
  const ratio = expected ? avgIn / expected : 0;

  return (
    <>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm text-text-secondary">{c.code}</p>
          <h1 className="text-2xl text-heading">{c.name}</h1>
          <p className="mt-1 text-text-secondary">
            {t(`customerType.${c.type}`)} · {t(`country.${c.country}`, { defaultValue: c.country })}{" "}
            · {t(`city.${c.branchCity}`, { defaultValue: c.branchCity })} ·{" "}
            {t("customer.since", { date: formatDate(c.createdAt, locale) })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("transactions.view") ? (
            <Button variant="outline" asChild>
              <Link href={href(`/network?customer=${c.code}`)}>
                <Share2 /> {t("customer.showNetwork")}
              </Link>
            </Button>
          ) : null}
          {can("customers.manage") ? <EditKycDialog customer={c} /> : null}
        </div>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Panel>
            <PanelHeader
              eyebrow={t("customer.activity")}
              title={
                expected
                  ? t(ratio > 1.5 ? "customer.activityAbove" : "customer.activityNormal", {
                      ratio: formatNumber(Math.round(ratio * 10) / 10, locale),
                    })
                  : undefined
              }
            />
            <Chart
              height={220}
              options={(col): Highcharts.Options => ({
                chart: { type: "column" },
                xAxis: {
                  categories: monthly.map((m) =>
                    formatDate(m.month, locale, { month: "short", year: "2-digit" }),
                  ),
                },
                yAxis: {
                  labels: {
                    formatter() {
                      return formatCompact(
                        Number((this as unknown as { value: number }).value),
                        locale,
                      );
                    },
                  },
                  plotLines: expected
                    ? [
                        {
                          value: expected,
                          color: col["risk-high"],
                          dashStyle: "Dash",
                          width: 1,
                          zIndex: 3,
                          label: {
                            text: t("customer.expected"),
                            style: { color: col["text-secondary"] },
                          },
                        },
                      ]
                    : [],
                },
                tooltip: { shared: true },
                plotOptions: { column: { borderRadius: 3, borderWidth: 0, groupPadding: 0.15 } },
                legend: {
                  enabled: true,
                  itemStyle: { color: col["text-secondary"], fontWeight: "400" },
                },
                series: [
                  {
                    type: "column",
                    name: t("direction.IN"),
                    color: col["chart-2"],
                    data: monthly.map((m) => m.incoming),
                  },
                  {
                    type: "column",
                    name: t("direction.OUT"),
                    color: col["chart-4"],
                    data: monthly.map((m) => m.outgoing),
                  },
                ],
              })}
            />
          </Panel>

          <Panel>
            <PanelHeader
              eyebrow={t("customer.kyc")}
              title={
                t(`kycStatus.${c.kycStatus}`) +
                (c.kycReviewedAt
                  ? ` · ${t("customer.reviewed", { date: formatDate(c.kycReviewedAt, locale) })}`
                  : "")
              }
            />
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {person ? (
                <>
                  <Item
                    label={t("fields.dateOfBirth")}
                    value={c.dateOfBirth ? formatDate(c.dateOfBirth, locale) : null}
                  />
                  <Item
                    label={t("fields.nationality")}
                    value={
                      c.nationality
                        ? t(`country.${c.nationality}`, { defaultValue: c.nationality })
                        : null
                    }
                  />
                  <Item label={t("fields.occupation")} value={c.occupation} />
                  <Item label={t("fields.employer")} value={c.employer} />
                </>
              ) : (
                <>
                  <Item label={t("fields.registrationNumber")} value={c.registrationNumber} mono />
                  <Item
                    label={t("fields.incorporationDate")}
                    value={c.incorporationDate ? formatDate(c.incorporationDate, locale) : null}
                  />
                  <Item label={t("fields.industry")} value={c.industry} />
                </>
              )}
              <Item label={t("fields.email")} value={c.email} mono />
              <Item label={t("fields.phone")} value={c.phone} mono />
              <Item
                label={t("fields.address")}
                value={[c.addressLine, c.city].filter(Boolean).join(", ")}
              />
              <Item
                label={t("fields.sourceOfFunds")}
                value={c.sourceOfFunds ? t(`sourceOfFunds.${c.sourceOfFunds}`) : null}
              />
              <Item
                label={t("fields.expectedMonthlyVolume")}
                value={expected ? formatMoney(expected, "EUR", locale) : null}
              />
              <Item label={t("fields.pep")} value={c.pep ? t("common.yes") : t("common.no")} />
            </dl>
          </Panel>

          {!person ? (
            <Panel>
              <PanelHeader
                eyebrow={t("customer.shareholders")}
                title={t("customer.shareholdersTitle", { count: shareholders.length })}
              />
              <ul className="flex flex-col gap-3">
                {shareholders.map((h, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-text">{h.name}</span>
                      <span className="text-xs text-text-secondary">
                        {t(`customerType.${h.type}`)} ·{" "}
                        {t(`country.${h.country}`, { defaultValue: h.country })} ·{" "}
                        {h.documents.map((d) => t(`documentKind.${d.kind}`)).join(", ")}
                      </span>
                    </span>
                    <span className="text-lg text-heading">
                      {formatPercent(Number(h.sharePercent), locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel>
            <PanelHeader eyebrow={t("customer.transactions")} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="border-t border-border py-2.5 pe-3 whitespace-nowrap">
                        {formatDateTime(tx.bookedAt, locale)}
                      </td>
                      <td className="border-t border-border py-2.5 pe-3">
                        {t(`channel.${tx.channel}`)}
                      </td>
                      <td className="border-t border-border py-2.5 pe-3">
                        {tx.counterpartyName}{" "}
                        <span className="text-xs text-text-secondary">
                          · {tx.counterpartyCountry}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "ltr-nums border-t border-border py-2.5 text-end whitespace-nowrap",
                          tx.direction === "OUT" && "text-text-secondary",
                        )}
                      >
                        {tx.direction === "OUT" ? "−" : "+"}
                        {formatMoney(tx.amount, tx.currency, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="flex w-full flex-col gap-6 xl:w-95 xl:shrink-0">
          <Panel>
            <PanelHeader eyebrow={t("customer.risk")} />
            <Gauge
              value={c.riskScore}
              label={`${formatNumber(c.riskScore, locale)} / ${formatNumber(100, locale)}`}
            />
            <ul className="flex flex-col gap-2 text-sm">
              {riskFactors.map((f) => (
                <li key={f.key} className="flex items-center gap-2">
                  <span className="flex-1">{t(`riskFactor.${f.key}`)}</span>
                  <span className="text-heading">+{formatNumber(f.weight, locale)}</span>
                </li>
              ))}
              {!riskFactors.length ? (
                <li className="text-text-secondary">{t("customer.noFactors")}</li>
              ) : null}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader eyebrow={t("customer.accounts")} />
            <ul className="flex flex-col gap-3">
              {accounts.map((a) => (
                <li key={a.id} className="rounded-md border border-border p-3">
                  <p className="ltr-nums font-mono text-[13px]">{formatIban(a.iban)}</p>
                  <p className="mt-1 flex justify-between text-sm">
                    <span className="text-text-secondary">
                      {t(`accountStatus.${a.status}`)} · {a.currency}
                    </span>
                    <span className="text-heading">
                      {formatMoney(a.balance, a.currency, locale)}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader
              eyebrow={t("customer.alerts")}
              title={alerts.length ? undefined : t("customer.noAlerts")}
            />
            <ul className="flex flex-col gap-2">
              {alerts.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <Link
                    href={href(`/alerts/${a.code}`)}
                    className="font-mono text-link hover:underline"
                  >
                    {a.code}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-text-secondary">
                    {ruleText.name(a.ruleCode, a.ruleName)}
                  </span>
                  <RiskBadge level={a.riskLevel} />
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          </Panel>

          {cases.length ? (
            <Panel>
              <PanelHeader eyebrow={t("customer.cases")} />
              <ul className="flex flex-col gap-2">
                {cases.map((cs) => (
                  <li key={cs.code} className="flex items-center gap-2 text-sm">
                    <Link
                      href={href(`/cases/${cs.code}`)}
                      className="font-mono text-link hover:underline"
                    >
                      {cs.code}
                    </Link>
                    <span className="min-w-0 flex-1 truncate">{cs.title}</span>
                    <CaseStatusBadge status={cs.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
          {c.pep ? <Note tone="danger">{t("customer.pepNote")}</Note> : null}
        </div>
      </div>
    </>
  );
};
