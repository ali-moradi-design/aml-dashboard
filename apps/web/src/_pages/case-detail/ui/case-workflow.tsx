"use client";

import { Background, MarkerType, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CaseDetail } from "@aml/shared";
import {
  StepNode,
  TransitionEdge,
  type StepNodeType,
  type TransitionEdgeType,
} from "@/entities/workflow";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatDateTime, formatDuration, formatNumber } from "@/shared/lib/format";
import { useNow } from "@/shared/lib/use-now";
import { cn } from "@/shared/lib/utils";
import { Note } from "@/shared/ui/panel";

const nodeTypes = { step: StepNode };
/** Compact cards are narrower than the designer's, so pull the columns closer to keep the diagram readable. */
const X_SCALE = 0.75;
const edgeTypes = { transition: TransitionEdge };

/** Steps and moves this case has been through, read from its event log. */
const historyOf = (events: CaseDetail["events"]) => {
  const steps = new Set<string>();
  const moves = new Set<string>();
  for (const e of events) {
    const d = (e.data ?? {}) as { fromStep?: string; toStep?: string; transitionId?: string };
    if (d.fromStep) steps.add(d.fromStep);
    if (d.toStep) steps.add(d.toStep);
    if (d.transitionId) moves.add(d.transitionId);
  }
  return { steps, moves };
};

/** The case's own workflow version, read-only: where it is, where it has been, what comes next. */
export const CaseWorkflow = ({ detail }: { detail: CaseDetail }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const now = useNow();
  const { workflow: wf, events } = detail;
  const { steps: visited, moves } = useMemo(() => historyOf(events), [events]);

  const next = useMemo(
    () => new Set(wf.graph.transitions.filter((tr) => tr.from === wf.step).map((tr) => tr.to)),
    [wf],
  );

  const nodes = useMemo<StepNodeType[]>(
    () =>
      wf.graph.steps.map((s) => ({
        id: s.id,
        type: "step",
        position: { x: s.position.x * X_SCALE, y: s.position.y },
        draggable: false,
        selectable: false,
        data: {
          step: s,
          compact: true,
          state:
            s.id === wf.step
              ? "current"
              : visited.has(s.id)
                ? "visited"
                : next.has(s.id)
                  ? "next"
                  : "idle",
        },
      })),
    [wf, visited, next],
  );
  const edges = useMemo<TransitionEdgeType[]>(
    () =>
      wf.graph.transitions.map((tr) => ({
        id: tr.id,
        source: tr.from,
        target: tr.to,
        type: "transition",
        selectable: false,
        data: {
          transition: tr,
          compact: true,
          taken: moves.has(tr.id),
          dim: !moves.has(tr.id) && tr.from !== wf.step,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: moves.has(tr.id) ? "var(--brand)" : "var(--text-secondary)",
        },
      })),
    [wf, moves],
  );

  const due = wf.slaDueAt ? new Date(wf.slaDueAt).getTime() : null;
  const hoursLeft = due ? Math.round((due - now) / 3_600_000) : null;

  return (
    <div className="flex flex-col gap-3">
      <div dir="ltr" className="h-90 overflow-hidden rounded-md border border-border bg-muted/40">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.08, maxZoom: 1.2 }}
            minZoom={0.3}
            maxZoom={2}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnScroll={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            proOptions={{ hideAttribution: true }}
            aria-label={t("workflow.caseDiagram")}
          >
            <Background gap={18} size={1} color="var(--border)" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <div>
          <dt className="text-xs text-text-secondary">{t("workflow.currentStep")}</dt>
          <dd>{(wf.stepName as Record<string, string | undefined>)[locale] || wf.stepName.en}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary">{t("workflow.since")}</dt>
          <dd>{formatDateTime(wf.stepEnteredAt, locale)}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary">{t("workflow.stepSla")}</dt>
          <dd
            className={cn(
              hoursLeft !== null &&
                (hoursLeft < 0
                  ? "text-risk-high-text"
                  : hoursLeft < 12
                    ? "text-risk-medium-text"
                    : ""),
            )}
          >
            {hoursLeft === null
              ? "—"
              : hoursLeft < 0
                ? t("workflow.slaOverdue", { time: formatDuration(-hoursLeft, locale) })
                : t("workflow.slaLeft", { time: formatDuration(hoursLeft, locale) })}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary">{t("workflow.versionLabel")}</dt>
          <dd>{t("workflow.versionN", { n: formatNumber(wf.version, locale) })}</dd>
        </div>
      </dl>
      {!wf.isLatest && wf.slaDueAt ? <Note>{t("workflow.olderVersion")}</Note> : null}
    </div>
  );
};
