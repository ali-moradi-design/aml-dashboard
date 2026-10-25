"use client";

import {
  Background, MarkerType, MiniMap, Panel as FlowPanel, ReactFlow, ReactFlowProvider, useReactFlow,
  type Connection, type EdgeChange, type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { LayoutGrid, Maximize2, Plus, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { localized, validateWorkflow, type WorkflowGraph, type WorkflowIssue } from "@aml/shared";
import { StepNode, TransitionEdge, type StepNodeType, type TransitionEdgeType } from "@/entities/workflow";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Panel, PanelHeader } from "@/shared/ui/panel";
import { addStep, addTransition, autoLayout, moveStep, removeStep, removeTransition, updateStep, updateTransition } from "../model/editing";
import { StepInspector, TransitionInspector } from "./inspector";

const nodeTypes = { step: StepNode };
const edgeTypes = { transition: TransitionEdge };
type Selection = { kind: "step" | "transition"; id: string } | null;

type Props = {
  graph: WorkflowGraph;
  onChange: (g: WorkflowGraph) => void;
  readOnly: boolean;
  /** Open cases per step in this version. */
  stepLoad: Record<string, number>;
  header?: React.ReactNode;
};

const Canvas = ({ graph, onChange, readOnly, stepLoad, issues, selection, setSelection }: Props & { issues: WorkflowIssue[]; selection: Selection; setSelection: (s: Selection) => void }) => {
  const { t } = useTranslation();
  const flow = useReactFlow();
  const badSteps = new Set(issues.map((i) => i.stepId).filter(Boolean));
  const badTransitions = new Set(issues.map((i) => i.transitionId).filter(Boolean));

  const nodes = useMemo<StepNodeType[]>(
    () => graph.steps.map((s) => ({
      id: s.id, type: "step", position: s.position,
      data: { step: s, invalid: badSteps.has(s.id), load: stepLoad[s.id] },
      selected: selection?.kind === "step" && selection.id === s.id,
      draggable: !readOnly, connectable: !readOnly, deletable: !readOnly,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- issues are derived from graph
    [graph, stepLoad, selection, readOnly, issues],
  );
  const edges = useMemo<TransitionEdgeType[]>(
    () => graph.transitions.map((tr) => ({
      id: tr.id, source: tr.from, target: tr.to, type: "transition",
      data: { transition: tr, invalid: badTransitions.has(tr.id) },
      selected: selection?.kind === "transition" && selection.id === tr.id,
      deletable: !readOnly,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: badTransitions.has(tr.id) ? "var(--risk-high)" : "var(--text-secondary)" },
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- issues are derived from graph
    [graph, selection, readOnly, issues],
  );

  const onNodesChange = (changes: NodeChange<StepNodeType>[]) => {
    let next = graph;
    for (const c of changes) {
      if (c.type === "position" && c.position && !readOnly) next = moveStep(next, c.id, { x: Math.round(c.position.x), y: Math.round(c.position.y) });
      if (c.type === "select") setSelection(c.selected ? { kind: "step", id: c.id } : selection?.id === c.id ? null : selection);
      if (c.type === "remove" && !readOnly) next = removeStep(next, c.id);
    }
    if (next !== graph) onChange(next);
  };
  const onEdgesChange = (changes: EdgeChange<TransitionEdgeType>[]) => {
    let next = graph;
    for (const c of changes) {
      if (c.type === "select") setSelection(c.selected ? { kind: "transition", id: c.id } : selection?.id === c.id ? null : selection);
      if (c.type === "remove" && !readOnly) next = removeTransition(next, c.id);
    }
    if (next !== graph) onChange(next);
  };
  const onConnect = (c: Connection) => {
    if (readOnly || !c.source || !c.target || c.source === c.target) return;
    const { graph: next, id } = addTransition(graph, c.source, c.target);
    onChange(next);
    setSelection({ kind: "transition", id });
  };
  const add = () => {
    const el = document.querySelector(".react-flow");
    const rect = el?.getBoundingClientRect();
    const center = flow.screenToFlowPosition({ x: (rect?.left ?? 0) + (rect?.width ?? 600) / 2, y: (rect?.top ?? 0) + (rect?.height ?? 400) / 2 });
    const { graph: next, id } = addStep(graph, { x: Math.round(center.x - 105), y: Math.round(center.y - 50) });
    onChange(next);
    setSelection({ kind: "step", id });
  };

  return (
    <ReactFlow<StepNodeType, TransitionEdgeType>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onPaneClick={() => setSelection(null)}
      deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.3}
      proOptions={{ hideAttribution: true }}
      aria-label={t("workflow.canvasLabel")}
    >
      <Background gap={20} size={1} color="var(--border)" />
      <MiniMap pannable zoomable className="!bg-card" maskColor="color-mix(in srgb, var(--muted) 70%, transparent)" nodeColor={() => "var(--border)"} />
      <FlowPanel position="top-left" className="flex gap-1 rounded-md border border-border bg-card p-1 shadow-sm">
        {!readOnly ? <Button size="sm" variant="ghost" onClick={add}><Plus /> {t("workflow.addStep")}</Button> : null}
        {!readOnly ? <Button size="sm" variant="ghost" onClick={() => { onChange(autoLayout(graph)); requestAnimationFrame(() => void flow.fitView({ padding: 0.15, duration: 300 })); }}><LayoutGrid /> {t("workflow.autoLayout")}</Button> : null}
        <Button size="sm" variant="ghost" onClick={() => void flow.fitView({ padding: 0.15, duration: 300 })}><Maximize2 /> {t("workflow.fit")}</Button>
      </FlowPanel>
      {!readOnly ? <FlowPanel position="bottom-center" className="rounded-md bg-card/90 px-3 py-1.5 text-xs text-text-secondary shadow-sm">{t("workflow.canvasHint")}</FlowPanel> : null}
    </ReactFlow>
  );
};

/**
 * Case workflow designer: steps are cards, transitions are drawn by dragging from one card's
 * right handle to another. Validation runs on every change with the same rules the API uses.
 */
export const WorkflowDesigner = (props: Props) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const { graph, onChange, readOnly, stepLoad } = props;
  const [selection, setSelection] = useState<Selection>(null);
  const issues = useMemo(() => validateWorkflow(graph), [graph]);
  const step = selection?.kind === "step" ? graph.steps.find((s) => s.id === selection.id) : undefined;
  const transition = selection?.kind === "transition" ? graph.transitions.find((x) => x.id === selection.id) : undefined;
  const stepName = (id?: string) => (id ? localized(graph.steps.find((s) => s.id === id)?.name ?? { en: id }, locale) : "");

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <section dir="ltr" className="h-[calc(100dvh-250px)] min-h-[520px] min-w-0 overflow-hidden xl:flex-1 rounded-lg border border-border bg-card">
        <ReactFlowProvider>
          <Canvas {...props} issues={issues} selection={selection} setSelection={setSelection} />
        </ReactFlowProvider>
      </section>

      <aside className="flex w-full flex-col gap-4 xl:w-[360px] xl:shrink-0">
        {props.header}
        <Panel className="gap-3 p-5">
          <PanelHeader eyebrow={t("workflow.checks")} title={issues.length ? t("workflow.issuesTitle", { count: issues.length, n: formatNumber(issues.length, locale) }) : t("workflow.valid")} />
          {issues.length ? (
            <ul className="flex max-h-48 flex-col gap-1 overflow-auto">
              {issues.map((i, n) => (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => setSelection(i.stepId ? { kind: "step", id: i.stepId } : i.transitionId ? { kind: "transition", id: i.transitionId } : null)}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-muted"
                  >
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-risk-high" />
                    <span>{t(`workflow.issue.${i.code}`, { step: stepName(i.stepId), transition: i.transitionId })}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">{t("workflow.validHint")}</p>
          )}
        </Panel>

        <Panel className={cn("gap-4 p-5", !step && !transition && "hidden xl:flex")}>
          <PanelHeader
            eyebrow={step ? t("workflow.step") : transition ? t("workflow.transition") : t("workflow.inspector")}
            title={step ? localized(step.name, locale) : transition ? localized(transition.label, locale) : undefined}
          />
          {step ? (
            <StepInspector
              key={step.id}
              graph={graph}
              step={step}
              readOnly={readOnly}
              load={stepLoad[step.id] ?? 0}
              onChange={(patch) => {
                onChange(updateStep(graph, step.id, patch));
                if (patch.id) setSelection({ kind: "step", id: patch.id });
              }}
              onRemove={() => { onChange(removeStep(graph, step.id)); setSelection(null); }}
            />
          ) : transition ? (
            <TransitionInspector
              key={transition.id}
              graph={graph}
              transition={transition}
              readOnly={readOnly}
              onChange={(patch) => onChange(updateTransition(graph, transition.id, patch))}
              onRemove={() => { onChange(removeTransition(graph, transition.id)); setSelection(null); }}
            />
          ) : (
            <p className="text-sm text-text-secondary">{readOnly ? t("workflow.inspectHintReadOnly") : t("workflow.inspectHint")}</p>
          )}
        </Panel>
      </aside>
    </div>
  );
};
