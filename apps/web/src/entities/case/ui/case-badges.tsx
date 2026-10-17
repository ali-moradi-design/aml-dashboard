"use client";

import { useTranslation } from "react-i18next";
import type { CaseStatus } from "@aml/shared";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatDate } from "@/shared/lib/format";
import { useNow } from "@/shared/lib/use-now";
import { cn } from "@/shared/lib/utils";

const statusClass: Record<CaseStatus, string> = {
  DRAFT: "bg-muted text-text-secondary",
  OPEN: "bg-brand-soft text-heading",
  PENDING_APPROVAL: "bg-risk-medium-bg text-risk-medium-text",
  APPROVED: "bg-risk-low-bg text-risk-low-text",
  REPORTED: "bg-risk-high-bg text-risk-high-text",
  CLOSED: "bg-muted text-text-secondary",
};

export const CaseStatusBadge = ({ status }: { status: CaseStatus }) => {
  const { t } = useTranslation();
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap", statusClass[status])}>{t(`caseStatus.${status}`)}</span>;
};

const priorityClass = { LOW: "text-text-secondary", MEDIUM: "text-text", HIGH: "text-risk-medium-text", CRITICAL: "text-risk-high-text" } as const;

export const PriorityLabel = ({ priority }: { priority: keyof typeof priorityClass }) => {
  const { t } = useTranslation();
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", priorityClass[priority])}>
      <span className={cn("size-1.5 rounded-full bg-current")} aria-hidden />
      {t(`priority.${priority}`)}
    </span>
  );
};

const OPEN_STATES: CaseStatus[] = ["DRAFT", "OPEN", "PENDING_APPROVAL", "APPROVED"];

/** Due date that turns red once overdue, only while the case is still being worked. */
export const DueLabel = ({ dueAt, status }: { dueAt: string; status: CaseStatus }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const now = useNow();
  const days = Math.ceil((new Date(dueAt).getTime() - now) / 86_400_000);
  if (!OPEN_STATES.includes(status)) return <span className="text-xs text-text-secondary">{formatDate(dueAt, locale)}</span>;
  return (
    <span className={cn("text-xs", days < 0 ? "text-risk-high-text" : days <= 3 ? "text-risk-medium-text" : "text-text-secondary")}>
      {days < 0 ? t("cases.overdue", { count: -days }) : days === 0 ? t("cases.dueToday") : t("cases.dueIn", { count: days })}
    </span>
  );
};
