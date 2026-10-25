"use client";

import { useTranslation } from "react-i18next";
import type { AlertStatus, RiskLevel } from "@aml/shared";
import { cn } from "@/shared/lib/utils";

const riskClass: Record<RiskLevel, string> = {
  HIGH: "bg-risk-high-bg text-risk-high-text",
  MEDIUM: "bg-risk-medium-bg text-risk-medium-text",
  LOW: "bg-risk-low-bg text-risk-low-text",
};

export const RiskBadge = ({ level, className }: { level: RiskLevel; className?: string }) => {
  const { t } = useTranslation();
  return (
    <span
      className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs", riskClass[level], className)}
    >
      {t(`risk.${level}`)}
    </span>
  );
};

const statusClass: Record<AlertStatus, string> = {
  NEW: "bg-brand-soft text-heading",
  IN_REVIEW: "bg-muted text-text",
  CLOSED_FALSE_POSITIVE: "bg-muted text-text-secondary",
  ESCALATED: "bg-risk-high-bg text-risk-high-text",
};

export const StatusBadge = ({ status }: { status: AlertStatus }) => {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap",
        statusClass[status],
      )}
    >
      {t(`alertStatus.${status}`)}
    </span>
  );
};
