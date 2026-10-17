import { describe, expect, it } from "vitest";
import type { Principal } from "../../shared/access";
import { allowedTransitions, transitionError, type CaseFacts } from "./case-policy";

const user = (id: string, role: Principal["role"], perms: string[]): Principal => ({
  userId: id, sessionId: "s", email: `${id}@x`, name: id, role, roleName: role, clearanceRank: 4, regionIds: ["r"], regions: [], permissions: new Set(perms),
});
const analyst = user("ana", "ANALYST", ["cases.view", "cases.create"]);
const supervisor = user("sup", "SUPERVISOR", ["cases.view", "cases.approve"]);
const compliance = user("cm", "COMPLIANCE_MANAGER", ["cases.view", "cases.approve"]);

const base: CaseFacts = { status: "OPEN", createdById: "ana", recommendation: "FILE_SAR", hasFindings: true };

describe("case policy", () => {
  it("lets a member submit a finished case for approval", () => {
    expect(allowedTransitions(base, analyst, true)).toContain("PENDING_APPROVAL");
  });

  it("blocks submitting without findings", () => {
    expect(allowedTransitions({ ...base, hasFindings: false }, analyst, true)).not.toContain("PENDING_APPROVAL");
    expect(transitionError({ ...base, hasFindings: false }, analyst, "PENDING_APPROVAL", true)).toMatch(/findings/);
  });

  it("applies the four-eyes rule: the preparer cannot approve", () => {
    const pending = { ...base, status: "PENDING_APPROVAL" as const, createdById: "sup" };
    expect(allowedTransitions(pending, supervisor, true)).toEqual([]);
    expect(transitionError(pending, supervisor, "APPROVED", true)).toMatch(/Four-eyes/);
    expect(allowedTransitions({ ...pending, createdById: "ana" }, supervisor, true)).toEqual(["APPROVED", "OPEN"]);
  });

  it("only compliance files the SAR", () => {
    const approved = { ...base, status: "APPROVED" as const };
    expect(allowedTransitions(approved, supervisor, true)).toEqual([]);
    expect(allowedTransitions(approved, compliance, false)).toEqual(["REPORTED"]);
  });

  it("closes approved cases that do not need a report", () => {
    expect(allowedTransitions({ ...base, status: "APPROVED", recommendation: "MONITOR" }, supervisor, false)).toEqual(["CLOSED"]);
  });
});
