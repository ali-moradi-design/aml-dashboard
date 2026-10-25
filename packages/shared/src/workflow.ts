import { z } from "zod";
import { riskLevels, roleKeys } from "./domain";

// Case workflow (model B): an admin draws steps and transitions in the designer; the graph is
// stored as JSON per version. These pure functions are shared by the designer (live checks),
// the API (enforcement) and the tests.

export const workflowCategories = [
  "OPEN",
  "PENDING_APPROVAL",
  "APPROVED",
  "REPORTED",
  "CLOSED",
] as const;
export type WorkflowCategory = (typeof workflowCategories)[number];

/** Admin-written text: English is required, other languages fall back to it. */
export const localizedTextSchema = z.object({
  en: z.string().trim().min(2, "errors.required").max(60),
  fa: z.string().trim().max(60).optional(),
  de: z.string().trim().max(60).optional(),
  tr: z.string().trim().max(60).optional(),
  ar: z.string().trim().max(60).optional(),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;
export const localized = (text: LocalizedText, locale: string) =>
  (text as Record<string, string | undefined>)[locale] || text.en;

export const workflowStepSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{1,30}$/, "errors.stepId"),
  name: localizedTextSchema,
  /** Drives the status badge, board column and timestamps. */
  category: z.enum(workflowCategories),
  kind: z.enum(["start", "task", "end"]),
  /** Roles that act at this step. */
  roles: z.array(z.enum(roleKeys)),
  /** Only members of the case team may act (layer 4 of the access model). */
  membersOnly: z.boolean(),
  /** Time allowed in this step before it counts as overdue. */
  slaHours: z.number().int().min(1).max(2160).nullable(),
  position: z.object({ x: z.number(), y: z.number() }),
});
export type WorkflowStep = z.infer<typeof workflowStepSchema>;

export const conditionFields = {
  totalAmount: { type: "number" },
  alertCount: { type: "number" },
  riskLevel: { type: "enum", values: riskLevels },
  priority: { type: "enum", values: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
  recommendation: { type: "enum", values: ["FILE_SAR", "MONITOR", "CLOSE"] },
} as const;
export type ConditionField = keyof typeof conditionFields;

export const workflowConditionSchema = z.object({
  field: z.enum(Object.keys(conditionFields) as [ConditionField, ...ConditionField[]]),
  operator: z.enum(["gt", "gte", "lt", "lte", "eq", "neq"]),
  value: z.union([z.number(), z.string()]),
});
export type WorkflowCondition = z.infer<typeof workflowConditionSchema>;

export const workflowTransitionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{1,30}$/, "errors.stepId"),
  from: z.string(),
  to: z.string(),
  label: localizedTextSchema,
  /** Narrows the step's roles for this action; empty means everyone who acts at the step. */
  roles: z.array(z.enum(roleKeys)),
  /** Only applies when the case matches (e.g. amount above 1M EUR). */
  condition: workflowConditionSchema.nullable(),
  /** Four-eyes: whoever opened the case cannot take this action. */
  fourEyes: z.boolean(),
  requireReason: z.boolean(),
  requireSar: z.boolean(),
  /** Findings and a recommendation must be written first. */
  requireFindings: z.boolean(),
});
export type WorkflowTransition = z.infer<typeof workflowTransitionSchema>;

export const workflowGraphSchema = z.object({
  steps: z.array(workflowStepSchema),
  transitions: z.array(workflowTransitionSchema),
});
export type WorkflowGraph = z.infer<typeof workflowGraphSchema>;

// ---------- Validation before publishing ----------

export type WorkflowIssue = {
  code:
    | "noStart"
    | "manyStarts"
    | "noEnd"
    | "duplicateStep"
    | "duplicateTransition"
    | "unknownStep"
    | "selfLoop"
    | "unreachable"
    | "deadEnd"
    | "endHasExit"
    | "noPathToEnd"
    | "noRoles"
    | "noSla"
    | "badCondition";
  stepId?: string;
  transitionId?: string;
};

const reach = (start: string[], next: (id: string) => string[]) => {
  const seen = new Set(start);
  const queue = [...start];
  while (queue.length)
    for (const n of next(queue.shift()!)) if (!seen.has(n)) (seen.add(n), queue.push(n));
  return seen;
};

/** Pure: everything that would make a published workflow unusable. An empty list means it can be published. */
export const validateWorkflow = (g: WorkflowGraph): WorkflowIssue[] => {
  const issues: WorkflowIssue[] = [];
  const ids = new Set<string>();
  for (const s of g.steps) {
    if (ids.has(s.id)) issues.push({ code: "duplicateStep", stepId: s.id });
    ids.add(s.id);
  }
  const starts = g.steps.filter((s) => s.kind === "start");
  if (!starts.length) issues.push({ code: "noStart" });
  if (starts.length > 1)
    starts.slice(1).forEach((s) => issues.push({ code: "manyStarts", stepId: s.id }));
  if (!g.steps.some((s) => s.kind === "end")) issues.push({ code: "noEnd" });

  const seenT = new Set<string>();
  const valid = g.transitions.filter((t) => {
    if (seenT.has(t.id)) issues.push({ code: "duplicateTransition", transitionId: t.id });
    seenT.add(t.id);
    if (!ids.has(t.from) || !ids.has(t.to))
      return (issues.push({ code: "unknownStep", transitionId: t.id }), false);
    if (t.from === t.to) return (issues.push({ code: "selfLoop", transitionId: t.id }), false);
    if (t.condition) {
      const def = conditionFields[t.condition.field];
      const ok =
        def.type === "number"
          ? typeof t.condition.value === "number" && Number.isFinite(t.condition.value)
          : (def.values as readonly string[]).includes(String(t.condition.value)) &&
            (t.condition.operator === "eq" || t.condition.operator === "neq");
      if (!ok) issues.push({ code: "badCondition", transitionId: t.id });
    }
    return true;
  });

  const out = (id: string) => valid.filter((t) => t.from === id).map((t) => t.to);
  const into = (id: string) => valid.filter((t) => t.to === id).map((t) => t.from);
  const reachable = reach(
    starts.map((s) => s.id),
    out,
  );
  const canFinish = reach(
    g.steps.filter((s) => s.kind === "end").map((s) => s.id),
    into,
  );

  for (const s of g.steps) {
    const exits = out(s.id).length;
    if (s.kind === "end") {
      if (exits) issues.push({ code: "endHasExit", stepId: s.id });
      continue;
    }
    if (starts.length && !reachable.has(s.id)) issues.push({ code: "unreachable", stepId: s.id });
    if (!exits) issues.push({ code: "deadEnd", stepId: s.id });
    else if (!canFinish.has(s.id)) issues.push({ code: "noPathToEnd", stepId: s.id });
    if (!s.roles.length) issues.push({ code: "noRoles", stepId: s.id });
    if (s.slaHours == null) issues.push({ code: "noSla", stepId: s.id });
  }
  return issues;
};

// ---------- Engine ----------

export type CaseFacts = {
  step: string;
  createdById: string;
  totalAmount: number;
  alertCount: number;
  riskLevel: string;
  priority: string;
  recommendation: string | null;
  hasFindings: boolean;
};
export type Actor = { userId: string; role: string; isMember: boolean };
export type BlockReason = "findings" | "fourEyes";
export type AvailableTransition = {
  transition: WorkflowTransition;
  to: WorkflowStep;
  blocked: BlockReason | null;
};

const compare = (
  actual: number | string | null,
  op: WorkflowCondition["operator"],
  expected: number | string,
) => {
  if (op === "eq") return String(actual) === String(expected);
  if (op === "neq") return String(actual) !== String(expected);
  const a = Number(actual);
  const b = Number(expected);
  return op === "gt" ? a > b : op === "gte" ? a >= b : op === "lt" ? a < b : a <= b;
};

export const conditionMatches = (c: WorkflowCondition | null, facts: CaseFacts) =>
  !c || compare(facts[c.field] ?? null, c.operator, c.value);

export const startStep = (g: WorkflowGraph) => g.steps.find((s) => s.kind === "start");
export const stepOf = (g: WorkflowGraph, id: string) => g.steps.find((s) => s.id === id);

/**
 * Pure: the actions this person sees on the case right now. Conditions that do not match hide the
 * action; unmet requirements keep it visible but blocked, so the UI can say why.
 */
export const availableTransitions = (
  g: WorkflowGraph,
  facts: CaseFacts,
  actor: Actor,
): AvailableTransition[] => {
  const step = stepOf(g, facts.step);
  if (!step || step.kind === "end" || !step.roles.includes(actor.role as never)) return [];
  if (step.membersOnly && !actor.isMember) return [];
  return g.transitions
    .filter(
      (t) =>
        t.from === step.id &&
        (!t.roles.length || t.roles.includes(actor.role as never)) &&
        conditionMatches(t.condition, facts),
    )
    .flatMap((t) => {
      const to = stepOf(g, t.to);
      if (!to) return [];
      const blocked: BlockReason | null =
        t.fourEyes && actor.userId === facts.createdById
          ? "fourEyes"
          : t.requireFindings && (!facts.hasFindings || !facts.recommendation)
            ? "findings"
            : null;
      return [{ transition: t, to, blocked }];
    });
};

/** When the current step's SLA runs out (null for end steps or steps without an SLA). */
export const slaDeadline = (g: WorkflowGraph, step: string, enteredAt: Date) => {
  const s = stepOf(g, step);
  return s?.slaHours && s.kind !== "end"
    ? new Date(enteredAt.getTime() + s.slaHours * 3_600_000)
    : null;
};

// ---------- API shapes ----------

export const workflowVersionRowSchema = z.object({
  id: z.string(),
  version: z.number(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  note: z.string().nullable(),
  createdByName: z.string(),
  publishedByName: z.string().nullable(),
  publishedAt: z.string().nullable(),
  updatedAt: z.string(),
  /** Cases still running on this version (they keep it until they finish). */
  openCases: z.number(),
  totalCases: z.number(),
});
export type WorkflowVersionRow = z.infer<typeof workflowVersionRowSchema>;

export const workflowOverviewSchema = z.object({
  key: z.string(),
  name: z.string(),
  versions: z.array(workflowVersionRowSchema),
});
export type WorkflowOverview = z.infer<typeof workflowOverviewSchema>;

export const workflowIssueSchema = z.object({
  code: z.string(),
  stepId: z.string().optional(),
  transitionId: z.string().optional(),
});

export const workflowVersionSchema = workflowVersionRowSchema.extend({
  graph: workflowGraphSchema,
  issues: z.array(workflowIssueSchema),
  /** Open cases per step, so the designer can warn before removing a busy step. */
  stepLoad: z.record(z.string(), z.number()),
});
export type WorkflowVersionDetail = z.infer<typeof workflowVersionSchema>;

export const workflowDraftInputSchema = z.object({
  graph: workflowGraphSchema,
  note: z.string().trim().max(200).optional(),
});
export type WorkflowDraftInput = z.infer<typeof workflowDraftInputSchema>;
