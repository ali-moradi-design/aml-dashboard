"use client";

import Link from "next/link";
import { AtSign, Folder, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { localized, type MyWork } from "@aml/shared";
import { RiskBadge, StatusBadge } from "@/entities/alert";
import { CaseStatusBadge } from "@/entities/case";
import { useMyWork, useMyWorkLive } from "@/entities/my-work";
import { useRuleText } from "@/entities/rule";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatDuration, formatNumber, formatRelative } from "@/shared/lib/format";
import { useNow } from "@/shared/lib/use-now";
import { cn } from "@/shared/lib/utils";
import { PageHeader, Panel, PanelHeader } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";

/** SLA chip: red when overdue, amber in the last quarter of the allowed time. */
const Sla = ({ due, start }: { due: string | null; start?: string }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const now = useNow();
  if (!due) return <span className="text-xs text-text-secondary">—</span>;
  const end = new Date(due).getTime();
  const hours = Math.round((end - now) / 3_600_000);
  const total = start ? end - new Date(start).getTime() : 0;
  const late = hours < 0;
  const close = !late && total > 0 && (end - now) / total < 0.25;
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs whitespace-nowrap", late ? "bg-risk-high-bg text-risk-high-text" : close ? "bg-risk-medium-bg text-risk-medium-text" : "bg-muted text-text-secondary")}>
      {late ? t("myWork.overdueBy", { time: formatDuration(-hours, locale) }) : t("myWork.dueIn", { time: formatDuration(hours, locale) })}
    </span>
  );
};

const countOverdue = (w: MyWork, now: number) =>
  w.alerts.filter((a) => new Date(a.slaDueAt).getTime() < now).length + w.cases.filter((c) => c.slaDueAt && new Date(c.slaDueAt).getTime() < now).length;

export const MyWorkPage = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const now = useNow();
  const ruleText = useRuleText();
  const { data, isPending, isError } = useMyWork();
  useMyWorkLive();

  if (isPending) return <Skeleton className="h-[600px]" />;
  if (isError || !data) return <Panel><p>{t("errors.generic")}</p></Panel>;
  const total = data.alertsTotal + data.cases.length + data.mentions.length;
  const overdue = countOverdue(data, now);

  return (
    <>
      <PageHeader title={t("myWork.title")} subtitle={total ? t("myWork.subtitle", { count: total, n: formatNumber(total, locale), overdue: formatNumber(overdue, locale) }) : t("myWork.empty")} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader eyebrow={t("myWork.cases")} title={data.cases.length ? t("myWork.casesTitle", { count: data.cases.length, n: formatNumber(data.cases.length, locale) }) : t("myWork.noCases")} />
          <ul className="flex flex-col divide-y divide-border">
            {data.cases.map((c) => (
              <li key={c.id} className="flex flex-col gap-1.5 py-3 first:pt-0">
                <div className="flex items-center gap-2">
                  <Folder className="size-4 shrink-0 text-text-secondary" />
                  <Link href={href(`/cases/${c.code}`)} className="font-mono text-sm text-link hover:underline">{c.code}</Link>
                  <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
                  <Sla due={c.slaDueAt} />
                </div>
                <div className="flex flex-wrap items-center gap-2 ps-6 text-xs text-text-secondary">
                  <CaseStatusBadge status={c.status} />
                  {localized(c.stepName, locale) !== t(`caseStatus.${c.status}`) ? <span>{localized(c.stepName, locale)}</span> : null}
                  <span>·</span>
                  {c.actions.map((a) => (
                    <span key={a.id} className={cn("rounded-md border px-1.5 py-0.5", a.blocked ? "border-dashed border-border" : "border-brand/40 text-heading")}>
                      {localized(a.label, locale)}{a.blocked ? ` (${t("myWork.needsFindings")})` : ""}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader
            eyebrow={t("myWork.alerts")}
            title={data.alertsTotal ? t("myWork.alertsTitle", { count: data.alertsTotal, n: formatNumber(data.alertsTotal, locale) }) : t("myWork.noAlerts")}
            actions={data.alertsTotal > data.alerts.length ? <Link href={href("/alerts")} className="text-sm text-link hover:underline">{t("myWork.allAlerts")}</Link> : undefined}
          />
          <ul className="flex flex-col divide-y divide-border">
            {data.alerts.slice(0, 12).map((a) => (
              <li key={a.id} className="flex items-center gap-2 py-2.5 first:pt-0">
                <TriangleAlert className="size-4 shrink-0 text-text-secondary" />
                <Link href={href(`/alerts/${a.code}`)} className="font-mono text-sm text-link hover:underline">{a.code}</Link>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {ruleText.name(a.ruleCode, a.ruleName)} <span className="text-text-secondary">· {a.customerName}</span>
                </span>
                <RiskBadge level={a.riskLevel} />
                <StatusBadge status={a.status} />
                <Sla due={a.slaDueAt} start={a.createdAt} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="xl:col-span-2">
          <PanelHeader eyebrow={t("myWork.mentions")} title={data.mentions.length ? t("myWork.mentionsTitle", { count: data.mentions.length, n: formatNumber(data.mentions.length, locale) }) : t("myWork.noMentions")} />
          <ul className="grid gap-3 md:grid-cols-2">
            {data.mentions.map((m) => (
              <li key={m.id} className="flex gap-3 rounded-md border border-border p-3">
                <AtSign className="mt-0.5 size-4 shrink-0 text-text-secondary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-secondary">
                    {t("myWork.mentionedBy", { name: m.authorName })} · <Link href={href(`/cases/${m.caseCode}`)} className="font-mono text-link hover:underline">{m.caseCode}</Link> · {formatRelative(m.createdAt, locale)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm">{m.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
};
