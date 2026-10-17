import { describe, expect, it } from "vitest";
import {
  availableTransitions, defaultWorkflowV1, defaultWorkflowV2, slaDeadline, validateWorkflow,
  type Actor, type CaseFacts, type WorkflowGraph,
} from "@aml/shared";

const facts: CaseFacts = {
  step: "investigation", createdById: "ana", totalAmount: 250_000, alertCount: 2, riskLevel: "HIGH", priority: "HIGH", recommendation: "FILE_SAR", hasFindings: true,
};
const analyst: Actor = { userId: "ana", role: "ANALYST", isMember: true };
const supervisor: Actor = { userId: "sup", role: "SUPERVISOR", isMember: false };
const compliance: Actor = { userId: "cm", role: "COMPLIANCE_MANAGER", isMember: false };
const ids = (g: WorkflowGraph, f: CaseFacts, a: Actor) => availableTransitions(g, f, a).map((x) => `${x.transition.id}${x.blocked ? `:${x.blocked}` : ""}`);

describe("workflow validation", () => {
  it("accepts the seeded workflows", () => {
    expect(validateWorkflow(defaultWorkflowV1)).toEqual([]);
    expect(validateWorkflow(defaultWorkflowV2)).toEqual([]);
  });

  it("finds unreachable steps, dead ends and steps that can never finish", () => {
    const g = structuredClone(defaultWorkflowV2);
    g.steps.push({ ...g.steps[1]!, id: "orphan", position: { x: 0, y: 0 } });
    g.transitions = g.transitions.filter((t) => t.from !== "compliance_review");
    g.transitions.push({ ...g.transitions[0]!, id: "orphan_exit", from: "orphan", to: "compliance_review" });
    const codes = validateWorkflow(g).map((i) => `${i.code}:${i.stepId ?? i.transitionId}`);
    expect(codes).toContain("unreachable:orphan");
    expect(codes).toContain("deadEnd:compliance_review");
    expect(codes).toContain("noPathToEnd:orphan");
  });

  it("needs exactly one start and at least one end", () => {
    const g = structuredClone(defaultWorkflowV1);
    g.steps = g.steps.map((s) => ({ ...s, kind: s.kind === "end" ? "task" : s.kind === "task" ? "start" : s.kind }));
    const codes = validateWorkflow(g).map((i) => i.code);
    expect(codes).toContain("noEnd");
    expect(codes).toContain("manyStarts");
  });

  it("rejects transitions to unknown steps and bad conditions", () => {
    const g = structuredClone(defaultWorkflowV1);
    g.transitions.push({ ...g.transitions[0]!, id: "ghost", to: "nowhere" });
    g.transitions.push({ ...g.transitions[0]!, id: "odd", condition: { field: "riskLevel", operator: "gt", value: "HIGH" } });
    const codes = validateWorkflow(g).map((i) => `${i.code}:${i.transitionId}`);
    expect(codes).toEqual(expect.arrayContaining(["unknownStep:ghost", "badCondition:odd"]));
  });
});

describe("workflow engine", () => {
  it("lets a member submit only after findings and a recommendation", () => {
    expect(ids(defaultWorkflowV2, facts, analyst)).toEqual(["submit"]);
    expect(ids(defaultWorkflowV2, { ...facts, hasFindings: false }, analyst)).toEqual(["submit:findings"]);
    expect(ids(defaultWorkflowV2, facts, { ...analyst, isMember: false })).toEqual([]);
  });

  it("routes large cases to compliance (condition on the amount)", () => {
    const review = { ...facts, step: "supervisor_review" };
    expect(ids(defaultWorkflowV2, review, supervisor)).toEqual(["approve", "send_back"]);
    expect(ids(defaultWorkflowV2, { ...review, totalAmount: 2_500_000 }, supervisor)).toEqual(["to_compliance", "send_back"]);
    expect(ids(defaultWorkflowV1, { ...review, totalAmount: 2_500_000 }, supervisor)).toEqual(["approve", "send_back"]);
  });

  it("applies the four-eyes rule as a visible block", () => {
    const own = { ...facts, step: "supervisor_review", createdById: "sup" };
    expect(ids(defaultWorkflowV2, own, supervisor)).toEqual(["approve:fourEyes", "send_back"]);
  });

  it("limits filing the SAR to compliance and to cases recommending it", () => {
    const approved = { ...facts, step: "approved" };
    expect(ids(defaultWorkflowV2, approved, supervisor)).toEqual([]);
    expect(ids(defaultWorkflowV2, approved, compliance)).toEqual(["file_sar"]);
    expect(ids(defaultWorkflowV2, { ...approved, recommendation: "MONITOR" }, supervisor)).toEqual(["close"]);
  });

  it("offers nothing at an end step and computes step SLAs", () => {
    expect(ids(defaultWorkflowV2, { ...facts, step: "reported" }, compliance)).toEqual([]);
    const entered = new Date("2026-10-01T08:00:00Z");
    expect(slaDeadline(defaultWorkflowV2, "supervisor_review", entered)?.toISOString()).toBe("2026-10-03T08:00:00.000Z");
    expect(slaDeadline(defaultWorkflowV2, "closed", entered)).toBeNull();
  });
});
