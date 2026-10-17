"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Edge, type EdgeProps } from "@xyflow/react";
import { Eye, FileWarning, Filter, MessageSquareText } from "lucide-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { localized, type WorkflowTransition } from "@aml/shared";
import { useLocale } from "@/shared/i18n/use-locale";
import { cn } from "@/shared/lib/utils";
import { useConditionText } from "../lib/condition-text";

export type TransitionEdgeData = { transition: WorkflowTransition; invalid?: boolean; taken?: boolean; dim?: boolean; compact?: boolean };
export type TransitionEdgeType = Edge<TransitionEdgeData, "transition">;

/** A transition: action name, condition and requirements on a label pill. */
export const TransitionEdge = memo(function TransitionEdge(props: EdgeProps<TransitionEdgeType>) {
  const { t } = useTranslation();
  const locale = useLocale();
  const conditionText = useConditionText();
  const { data, selected, markerEnd } = props;
  const [path, x, y] = getBezierPath(props);
  if (!data) return null;
  const tr = data.transition;
  const stroke = data.invalid ? "var(--risk-high)" : selected ? "var(--brand)" : data.taken ? "var(--brand)" : "var(--text-secondary)";

  return (
    <>
      <BaseEdge id={props.id} path={path} markerEnd={markerEnd} style={{ stroke, strokeWidth: selected || data.taken ? 2.2 : 1.4, opacity: data.dim ? 0.35 : 1 }} />
      {!data.compact ? (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
            className={cn(
              "nodrag nopan pointer-events-auto absolute flex max-w-[220px] flex-col items-center gap-0.5 rounded-md border bg-card px-2 py-1 text-[11px] shadow-sm",
              selected ? "border-brand" : data.invalid ? "border-risk-high" : "border-border",
              data.dim && "opacity-40",
            )}
          >
            <span className="truncate text-text">{localized(tr.label, locale)}</span>
            {tr.condition || tr.fourEyes || tr.requireSar || tr.requireReason ? (
              <span className="flex items-center gap-1.5 text-text-secondary">
                {tr.condition ? <span className="flex items-center gap-0.5"><Filter className="size-3" />{conditionText(tr.condition)}</span> : null}
                {tr.fourEyes ? <Eye className="size-3" aria-label={t("workflow.flag.fourEyes")} /> : null}
                {tr.requireSar ? <FileWarning className="size-3" aria-label={t("workflow.flag.requireSar")} /> : null}
                {tr.requireReason ? <MessageSquareText className="size-3" aria-label={t("workflow.flag.requireReason")} /> : null}
              </span>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
});
