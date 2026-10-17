"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Clock, Flag, Play, TriangleAlert, Users } from "lucide-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { localized, type WorkflowCategory, type WorkflowStep } from "@aml/shared";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatDuration, formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

export type StepNodeData = {
  step: WorkflowStep;
  /** Has a validation problem (red outline). */
  invalid?: boolean;
  /** Open cases waiting in this step. */
  load?: number;
  /** On the case page: where the case is and where it has been. */
  state?: "current" | "visited" | "idle";
  compact?: boolean;
};
export type StepNodeType = Node<StepNodeData, "step">;

export const categoryStrip: Record<WorkflowCategory, string> = {
  OPEN: "bg-brand",
  PENDING_APPROVAL: "bg-risk-medium",
  APPROVED: "bg-risk-low",
  REPORTED: "bg-risk-high",
  CLOSED: "bg-text-secondary",
};

/** A workflow step drawn as a card: category color, who acts, the SLA and open cases. */
export const StepNode = memo(function StepNode({ data, selected }: NodeProps<StepNodeType>) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { step, invalid, load, state, compact } = data;
  const Icon = step.kind === "start" ? Play : step.kind === "end" ? Flag : null;
  const dim = state === "idle";

  return (
    <div
      dir={locale === "fa" || locale === "ar" ? "rtl" : "ltr"}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card text-start shadow-sm transition-[box-shadow,opacity]",
        compact ? "w-[168px]" : "w-[210px]",
        selected ? "border-brand ring-2 ring-brand/30" : invalid ? "border-risk-high ring-2 ring-risk-high/20" : "border-border",
        state === "current" && "border-brand ring-4 ring-brand/25",
        dim && "opacity-45",
      )}
    >
      <span className={cn("absolute inset-y-0 start-0 w-1", categoryStrip[step.category])} aria-hidden />
      <Handle type="target" position={Position.Left} className="!size-2.5 !border-2 !border-card !bg-text-secondary" />
      <div className={cn("flex flex-col gap-1.5 ps-4 pe-3", compact ? "py-2" : "py-3")}>
        <div className="flex items-center gap-1.5">
          {Icon ? <Icon className="size-3.5 shrink-0 text-text-secondary" aria-label={t(`workflow.kind.${step.kind}`)} /> : null}
          <span className={cn("truncate text-heading", compact ? "text-xs" : "text-sm")}>{localized(step.name, locale)}</span>
          {invalid ? <TriangleAlert className="ms-auto size-3.5 shrink-0 text-risk-high" aria-label={t("workflow.hasIssues")} /> : null}
          {state === "current" ? <span className="ms-auto rounded-full bg-brand px-1.5 text-[10px] text-on-brand">{t("workflow.here")}</span> : null}
        </div>
        {!compact ? (
          <>
            <span className="text-[11px] text-text-secondary">{t(`caseStatus.${step.category}`)}</span>
            {step.kind !== "end" ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary">
                <span className="flex items-center gap-1"><Users className="size-3" />{step.roles.length ? step.roles.map((r) => t(`role.${r}`)).join(", ") : "—"}</span>
                {step.slaHours ? <span className="flex items-center gap-1"><Clock className="size-3" />{formatDuration(step.slaHours, locale)}</span> : null}
              </div>
            ) : null}
            {load ? <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-[11px] text-text">{t("workflow.openCases", { count: load, n: formatNumber(load, locale) })}</span> : null}
          </>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} className="!size-2.5 !border-2 !border-card !bg-brand" />
    </div>
  );
});
