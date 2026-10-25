"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, FolderPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { criteriaGroupSchema, type TransactionRow } from "@aml/shared";
import { DecideAlertForm } from "./decide-alert-form";
import { RiskBadge, StatusBadge, useAlert } from "@/entities/alert";
import { CriteriaView, useRuleText } from "@/entities/rule";
import { useCan } from "@/entities/session";
import { isHttpError } from "@/shared/api";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Panel, PanelHeader } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";

const Field = ({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) => (
  <div>
    <dt className="text-xs text-text-secondary">{label}</dt>
    <dd className={cn("mt-0.5 text-text", mono && "ltr-nums font-mono text-[13px]")}>{children}</dd>
  </div>
);

const TxTable = ({ rows, highlight }: { rows: TransactionRow[]; highlight?: string }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-text-secondary">
            {["date", "direction", "channel", "counterparty", "amount"].map((k) => (
              <th
                key={k}
                className={cn(
                  "border-t border-border py-2 pe-3 font-normal",
                  k === "amount" ? "text-end" : "text-start",
                )}
              >
                {t(`alertDetail.tx.${k}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={cn(r.id === highlight && "bg-risk-high-bg/60")}>
              <td className="border-t border-border py-2.5 pe-3 whitespace-nowrap">
                {formatDateTime(r.bookedAt, locale)}
              </td>
              <td className="border-t border-border py-2.5 pe-3">
                {t(`direction.${r.direction}`)}
              </td>
              <td className="border-t border-border py-2.5 pe-3">{t(`channel.${r.channel}`)}</td>
              <td className="border-t border-border py-2.5 pe-3">
                {r.counterpartyName}{" "}
                <span className="text-xs text-text-secondary">· {r.counterpartyCountry}</span>
              </td>
              <td
                className={cn(
                  "ltr-nums border-t border-border py-2.5 text-end whitespace-nowrap",
                  r.direction === "OUT" && "text-text-secondary",
                )}
              >
                {r.direction === "OUT" ? "−" : "+"}
                {formatMoney(r.amount, r.currency, locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const AlertDetailPage = ({ id }: { id: string }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const can = useCan();
  const { data, isPending, error } = useAlert(id);
  const ruleText = useRuleText();
  const Back = locale === "fa" || locale === "ar" ? ArrowRight : ArrowLeft;

  if (isPending) return <Skeleton className="h-150" />;
  if (error || !data) {
    return (
      <Panel>
        <p>
          {isHttpError(error) && error.status === 404
            ? t("alertDetail.notFound")
            : t("errors.generic")}
        </p>
        <Link href={href("/alerts")} className="text-link hover:underline">
          {t("alertDetail.back")}
        </Link>
      </Panel>
    );
  }

  const { alert, rule, customer, account, transaction, history, previousAlerts } = data;
  const open = alert.status === "NEW" || alert.status === "IN_REVIEW";
  const criteria = criteriaGroupSchema.safeParse(rule.criteria);

  return (
    <>
      <div className="flex flex-col gap-3">
        <Link
          href={href("/alerts")}
          className="flex w-fit items-center gap-1.5 text-sm text-link hover:underline"
        >
          <Back className="size-4" /> {t("alertDetail.back")}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl text-heading">{alert.code}</h1>
          <RiskBadge level={alert.riskLevel} />
          <StatusBadge status={alert.status} />
          <span className="text-text-secondary">
            {t("alertDetail.score", { score: formatNumber(alert.score, locale) })} ·{" "}
            {formatDateTime(alert.createdAt, locale)} ·{" "}
            {t(`city.${alert.branchCity}`, { defaultValue: alert.branchCity })}
          </span>
        </div>
        <p className="text-base text-text">
          {t("alertDetail.summary", {
            rule: ruleText.name(rule.code, rule.name),
            customer: customer.name,
          })}
        </p>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Panel>
            <PanelHeader
              eyebrow={t("alertDetail.trigger")}
              title={ruleText.description(rule.code, rule.description)}
            />
            {transaction ? (
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Field label={t("alertDetail.tx.amount")}>
                  {formatMoney(transaction.amount, transaction.currency, locale)}
                </Field>
                <Field label={t("alertDetail.tx.base")}>
                  {formatMoney(transaction.baseAmount, "EUR", locale)}
                </Field>
                <Field label={t("alertDetail.tx.channel")}>
                  {t(`channel.${transaction.channel}`)} · {t(`direction.${transaction.direction}`)}
                </Field>
                <Field label={t("alertDetail.tx.date")}>
                  {formatDateTime(transaction.bookedAt, locale)}
                </Field>
                <Field label={t("alertDetail.tx.counterparty")}>
                  {transaction.counterpartyName}
                </Field>
                <Field label={t("alertDetail.tx.country")}>{transaction.counterpartyCountry}</Field>
                <Field label={t("alertDetail.tx.ref")} mono>
                  {transaction.ref}
                </Field>
              </dl>
            ) : null}
            {criteria.success ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-text-secondary">
                  {t("alertDetail.ruleCriteria", { code: rule.code })}
                </p>
                <CriteriaView group={criteria.data} />
              </div>
            ) : null}
          </Panel>

          <Panel>
            <PanelHeader
              eyebrow={t("alertDetail.history")}
              title={t("alertDetail.historyTitle", { count: history.length })}
            />
            <TxTable rows={history} highlight={transaction?.id} />
          </Panel>
        </div>

        <div className="flex w-full flex-col gap-6 xl:w-95 xl:shrink-0">
          <Panel>
            <PanelHeader eyebrow={t("alertDetail.decision.eyebrow")} />
            {open && can("alerts.decide") ? (
              <DecideAlertForm alertId={alert.id} />
            ) : (
              <div className="flex flex-col gap-2 text-sm">
                <StatusBadge status={alert.status} />
                {alert.decidedByName ? (
                  <p className="text-text-secondary">
                    {t("alertDetail.decidedBy", {
                      name: alert.decidedByName,
                      date: alert.decidedAt ? formatDateTime(alert.decidedAt, locale) : "",
                    })}
                  </p>
                ) : null}
                {alert.decisionNote ? (
                  <p className="rounded-md bg-muted p-3">{alert.decisionNote}</p>
                ) : null}
                {!can("alerts.decide") && open ? (
                  <p className="text-text-secondary">{t("alertDetail.noPermission")}</p>
                ) : null}
              </div>
            )}
            {alert.caseCode ? (
              <Link
                href={href(`/cases/${alert.caseCode}`)}
                className="flex items-center justify-between rounded-md bg-muted p-3 text-sm hover:bg-border"
              >
                <span>{t("alertDetail.inCase")}</span>
                <span className="font-mono text-link">{alert.caseCode}</span>
              </Link>
            ) : alert.status === "ESCALATED" && can("cases.create") ? (
              <Button asChild variant="outline">
                <Link href={href(`/cases/new?alert=${alert.code}`)}>
                  <FolderPlus /> {t("alertDetail.createCase")}
                </Link>
              </Button>
            ) : null}
          </Panel>

          <Panel>
            <PanelHeader eyebrow={t("alertDetail.customer")} title={customer.name} />
            <dl className="grid grid-cols-2 gap-4">
              <Field label={t("alertDetail.customerCode")} mono>
                {customer.code}
              </Field>
              <Field label={t("alertDetail.customerType")}>
                {t(`customerType.${customer.type}`)}
              </Field>
              <Field label={t("alertDetail.country")}>{customer.country}</Field>
              <Field label={t("alertDetail.occupation")}>{customer.occupation ?? "—"}</Field>
              <Field label={t("alertDetail.riskScore")}>
                <span
                  className={cn(
                    customer.riskScore >= 70
                      ? "text-risk-high-text"
                      : customer.riskScore >= 40
                        ? "text-risk-medium-text"
                        : "text-risk-low-text",
                  )}
                >
                  {formatNumber(customer.riskScore, locale)} / {formatNumber(100, locale)}
                </span>
              </Field>
              <Field label={t("alertDetail.pep")}>
                {customer.pep ? t("common.yes") : t("common.no")}
              </Field>
              <Field label={t("alertDetail.iban")} mono>
                {account.iban}
              </Field>
              <Field label={t("alertDetail.opened")}>{formatDate(account.openedAt, locale)}</Field>
            </dl>
          </Panel>

          <Panel>
            <PanelHeader
              eyebrow={t("alertDetail.previous")}
              title={previousAlerts.length ? undefined : t("alertDetail.noPrevious")}
            />
            <ul className="flex flex-col gap-2">
              {previousAlerts.map((p) => (
                <li key={p.code} className="flex items-center gap-2 text-sm">
                  <Link
                    href={href(`/alerts/${p.code}`)}
                    className="font-mono text-link hover:underline"
                  >
                    {p.code}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-text-secondary">{p.ruleName}</span>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
};
