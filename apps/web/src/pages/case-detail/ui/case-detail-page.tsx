"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatIban, type CaseDetail, type CaseStatus } from "@aml/shared";
import { CaseComments } from "@/features/case-comments";
import { CaseDocuments } from "@/features/case-documents";
import { CaseFindings } from "@/features/case-findings";
import { CaseMembers } from "@/features/case-members";
import { CaseNote } from "@/features/case-note";
import { CaseTransitionActions } from "@/features/case-transition";
import { RiskBadge, StatusBadge } from "@/entities/alert";
import { CaseStatusBadge, DueLabel, PriorityLabel, useCase, useCaseLive } from "@/entities/case";
import { useRuleText } from "@/entities/rule";
import { isHttpError } from "@/shared/api";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatDate, formatDateTime, formatMoney, formatNumber, formatRelative } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Note, Panel, PanelHeader } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";

const Item = ({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) => (
  <div>
    <dt className="text-xs text-text-secondary">{label}</dt>
    <dd className={cn("mt-0.5 text-text", mono && "ltr-nums font-mono text-[13px]")}>{children || "—"}</dd>
  </div>
);

/** The fixed chain; the last step is either "reported" (SAR filed) or "closed". */
const Lifecycle = ({ c }: { c: CaseDetail["case"] }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const end: CaseStatus = c.status === "CLOSED" ? "CLOSED" : "REPORTED";
  const steps: Array<{ status: CaseStatus; at: string | null; by?: string | null }> = [
    { status: "OPEN", at: c.createdAt, by: c.createdByName },
    { status: "PENDING_APPROVAL", at: c.submittedAt },
    { status: "APPROVED", at: c.approvedAt, by: c.approvedByName },
    { status: end, at: end === "CLOSED" ? c.closedAt : c.reportedAt },
  ];
  const order: CaseStatus[] = ["DRAFT", "OPEN", "PENDING_APPROVAL", "APPROVED", "REPORTED", "CLOSED"];
  const reached = (s: CaseStatus) => order.indexOf(c.status) >= order.indexOf(s) || (s === "CLOSED" && c.status === "CLOSED");

  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => {
        const done = reached(s.status) && (s.status !== c.status || s.status === end);
        const current = s.status === c.status && s.status !== end;
        return (
          <li key={s.status} className="relative flex gap-3 pb-5 last:pb-0" aria-current={current ? "step" : undefined}>
            {i < steps.length - 1 ? <span className={cn("absolute start-[11px] top-6 bottom-0 w-px", done ? "bg-brand" : "bg-border")} aria-hidden /> : null}
            <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-xs", done ? "border-brand bg-brand text-on-brand" : current ? "border-brand text-heading" : "border-border text-text-secondary")}>
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className={cn("block text-sm", !done && !current && "text-text-secondary")}>{t(`caseStatus.${s.status}`)}</span>
              {s.at && (done || current) ? <span className="text-xs text-text-secondary">{formatDateTime(s.at, locale)}{s.by ? ` · ${s.by}` : ""}</span> : null}
              {s.status === "REPORTED" && c.sarReference ? <span className="block font-mono text-xs text-text-secondary">{c.sarReference}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const eventText = (e: CaseDetail["events"][number], t: (k: string, o?: Record<string, unknown>) => string) => {
  const data = (e.data ?? {}) as { from?: CaseStatus; to?: CaseStatus; name?: string; note?: string | null };
  switch (e.type) {
    case "status_changed":
      return t("caseEvent.status_changed", { from: t(`caseStatus.${data.from}`), to: t(`caseStatus.${data.to}`) }) + (data.note ? `: “${data.note}”` : "");
    case "document_added":
      return t("caseEvent.document_added", { name: data.name });
    default:
      return t(`caseEvent.${e.type}`, { defaultValue: e.type });
  }
};

export const CaseDetailPage = ({ code }: { code: string }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const ruleText = useRuleText();
  const { data, isPending, error } = useCase(code);
  const live = useCaseLive(code, Boolean(data?.allowed.isMember));
  const Back = locale === "fa" || locale === "ar" ? ArrowRight : ArrowLeft;

  if (isPending) return <Skeleton className="h-[640px]" />;
  if (error || !data) {
    return (
      <Panel>
        <p>{isHttpError(error) && error.status === 404 ? t("caseDetail.notFound") : t("errors.generic")}</p>
        <Link href={href("/cases")} className="text-link hover:underline">{t("caseDetail.back")}</Link>
      </Panel>
    );
  }

  const { case: c, parties, alerts, events } = data;

  return (
    <>
      <Link href={href("/cases")} className="inline-flex w-fit items-center gap-1.5 text-sm text-text-secondary hover:text-text">
        <Back className="size-4" /> {t("caseDetail.back")}
      </Link>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <span className="font-mono">{c.code}</span>
            <CaseStatusBadge status={c.status} />
            <RiskBadge level={c.riskLevel} />
            <PriorityLabel priority={c.priority} />
            {live ? (
              <span className="inline-flex items-center gap-1 text-xs text-risk-low-text" title={t("caseDetail.liveHint")}>
                <Radio className="size-3.5" /> {t("caseDetail.live")}
              </span>
            ) : null}
          </p>
          <h1 className="mt-1 text-2xl text-heading">{c.title}</h1>
          <p className="mt-1 text-text-secondary">
            {t(`typology.${c.typology}`)} · {t(`city.${c.branchCity}`, { defaultValue: c.branchCity })} · {t("caseDetail.openedBy", { name: c.createdByName, when: formatRelative(c.createdAt, locale) })} · <DueLabel dueAt={c.dueAt} status={c.status} />
          </p>
        </div>
        <CaseTransitionActions detail={data} />
      </div>

      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Panel>
            <PanelHeader eyebrow={t("caseDetail.summary")} />
            <p className="whitespace-pre-wrap">{c.summary}</p>
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Item label={t("fields.period")}>{c.periodStart && c.periodEnd ? `${formatDate(c.periodStart, locale)} – ${formatDate(c.periodEnd, locale)}` : null}</Item>
              <Item label={t("fields.totalAmount")}>{c.totalAmount ? formatMoney(c.totalAmount, "EUR", locale) : null}</Item>
              <Item label={t("caseDetail.alerts")}>{formatNumber(c.alertCount, locale)}</Item>
              <Item label={t("caseDetail.clearance")}>{t(`clearance.${c.clearanceRank}`, { defaultValue: String(c.clearanceRank) })}</Item>
            </dl>
          </Panel>

          <Panel>
            <PanelHeader eyebrow={t("caseDetail.findings")} />
            <CaseFindings detail={data} />
          </Panel>

          <Panel>
            <PanelHeader eyebrow={t("caseDetail.parties")} title={t("caseDetail.partiesTitle", { count: parties.length })} />
            <ul className="grid gap-3 md:grid-cols-2">
              {parties.map((p) => (
                <li key={p.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      {p.customerCode ? <Link href={href(`/customers/${p.customerCode}`)} className="block truncate text-link hover:underline">{p.name}</Link> : <span className="block truncate">{p.name}</span>}
                      <span className="text-xs text-text-secondary">{t(`customerType.${p.type}`)} · {t(`country.${p.country}`, { defaultValue: p.country })}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-text-secondary">{t(`partyRole.${p.role}`)}</span>
                  </span>
                  {p.accounts.map((a) => <span key={a.iban} className="ltr-nums font-mono text-xs text-text-secondary">{formatIban(a.iban)} · {a.currency}</span>)}
                  {p.notes ? <span className="text-xs text-text-secondary">{p.notes}</span> : null}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader eyebrow={t("caseDetail.linkedAlerts")} title={alerts.length ? undefined : t("caseDetail.noAlerts")} />
            <ul className="flex flex-col gap-2">
              {alerts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <Link href={href(`/alerts/${a.code}`)} className="font-mono text-link hover:underline">{a.code}</Link>
                  <span className="min-w-0 flex-1 truncate">{ruleText.name(a.ruleCode, a.ruleName)}</span>
                  <span className="text-xs text-text-secondary">{formatDate(a.createdAt, locale)}</span>
                  <RiskBadge level={a.riskLevel} />
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader eyebrow={t("comments.title")} />
            <CaseComments detail={data} />
          </Panel>
        </div>

        <div className="flex w-full flex-col gap-6 xl:w-[360px] xl:shrink-0">
          <Panel>
            <PanelHeader eyebrow={t("caseDetail.lifecycle")} />
            <Lifecycle c={c} />
          </Panel>
          <Panel>
            <PanelHeader eyebrow={t("caseDetail.team")} />
            <CaseMembers detail={data} />
          </Panel>
          <Panel>
            <PanelHeader eyebrow={t("caseDetail.documents")} />
            <CaseDocuments detail={data} />
          </Panel>
          {data.allowed.isMember ? (
            <Panel>
              <PanelHeader eyebrow={t("caseDetail.note")} />
              <CaseNote code={c.code} />
            </Panel>
          ) : (
            <Note>{t("caseDetail.notMember")}</Note>
          )}
          <Panel>
            <PanelHeader eyebrow={t("caseDetail.activity")} />
            <ol className="flex flex-col gap-3">
              {events.slice(0, 12).map((e) => (
                <li key={e.id} className="text-sm">
                  <span className="block">{eventText(e, t)}</span>
                  <span className="text-xs text-text-secondary">{e.actorName ? `${e.actorName} · ` : ""}{formatRelative(e.createdAt, locale)}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
};
