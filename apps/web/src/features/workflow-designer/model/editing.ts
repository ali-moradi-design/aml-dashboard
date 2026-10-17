import { Graph as DagreGraph, layout } from "@dagrejs/dagre";
import type { WorkflowGraph, WorkflowStep, WorkflowTransition } from "@aml/shared";

// Pure edits on the workflow graph. The designer keeps the graph as its only state and
// applies these; React Flow nodes and edges are derived from it.

const uniqueId = (base: string, taken: Set<string>) => {
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}_${i}`;
  return id;
};

export const addStep = (g: WorkflowGraph, position: { x: number; y: number }): { graph: WorkflowGraph; id: string } => {
  const id = uniqueId("new_step", new Set(g.steps.map((s) => s.id)));
  const step: WorkflowStep = { id, name: { en: "New step" }, category: "PENDING_APPROVAL", kind: "task", roles: ["SUPERVISOR"], membersOnly: false, slaHours: 48, position };
  return { graph: { ...g, steps: [...g.steps, step] }, id };
};

/** Renaming a step id also rewires its transitions. */
export const updateStep = (g: WorkflowGraph, id: string, patch: Partial<WorkflowStep>): WorkflowGraph => {
  const nextId = patch.id ?? id;
  return {
    steps: g.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    transitions: nextId === id ? g.transitions : g.transitions.map((t) => ({ ...t, from: t.from === id ? nextId : t.from, to: t.to === id ? nextId : t.to })),
  };
};

export const removeStep = (g: WorkflowGraph, id: string): WorkflowGraph => ({
  steps: g.steps.filter((s) => s.id !== id),
  transitions: g.transitions.filter((t) => t.from !== id && t.to !== id),
});

export const addTransition = (g: WorkflowGraph, from: string, to: string): { graph: WorkflowGraph; id: string } => {
  const id = uniqueId(`${from}_to_${to}`.slice(0, 28), new Set(g.transitions.map((t) => t.id)));
  const t: WorkflowTransition = { id, from, to, label: { en: "Move on" }, roles: [], condition: null, fourEyes: false, requireReason: false, requireSar: false, requireFindings: false };
  return { graph: { ...g, transitions: [...g.transitions, t] }, id };
};

export const updateTransition = (g: WorkflowGraph, id: string, patch: Partial<WorkflowTransition>): WorkflowGraph => ({
  ...g,
  transitions: g.transitions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
});

export const removeTransition = (g: WorkflowGraph, id: string): WorkflowGraph => ({ ...g, transitions: g.transitions.filter((t) => t.id !== id) });

export const moveStep = (g: WorkflowGraph, id: string, position: { x: number; y: number }): WorkflowGraph => ({
  ...g,
  steps: g.steps.map((s) => (s.id === id ? { ...s, position } : s)),
});

/** Left-to-right layered layout (dagre), so a messy drawing becomes readable in one click. */
export const autoLayout = (g: WorkflowGraph, size = { width: 210, height: 110 }): WorkflowGraph => {
  const d = new DagreGraph();
  d.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 110, marginx: 20, marginy: 20 });
  d.setDefaultEdgeLabel(() => ({}));
  for (const s of g.steps) d.setNode(s.id, { ...size });
  // Backward moves (send back) should not pull steps to the left.
  const order = new Map(g.steps.map((s, i) => [s.id, s.kind === "start" ? -1 : s.kind === "end" ? 1e6 + i : i]));
  for (const t of g.transitions) if ((order.get(t.from) ?? 0) < (order.get(t.to) ?? 0)) d.setEdge(t.from, t.to);
  layout(d);
  return {
    ...g,
    steps: g.steps.map((s) => {
      const n = d.node(s.id) as { x: number; y: number } | undefined;
      return n ? { ...s, position: { x: Math.round(n.x - size.width / 2), y: Math.round(n.y - size.height / 2) } } : s;
    }),
  };
};
