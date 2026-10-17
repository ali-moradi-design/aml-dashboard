import type { CaseStatus } from "@aml/shared";
import { can, type Principal } from "../../shared/access";

export type CaseFacts = {
  status: CaseStatus;
  createdById: string;
  recommendation: "FILE_SAR" | "MONITOR" | "CLOSE" | null;
  hasFindings: boolean;
};

const isCompliance = (p: Principal) => p.role === "COMPLIANCE_MANAGER" || p.role === "ADMIN";

/**
 * Pure: which status changes the user may make now. Release 2 uses a fixed approval chain
 * (analyst → supervisor → compliance manager); release 3 replaces it with the workflow designer.
 * Four-eyes rule: whoever prepared the case cannot approve it.
 */
export const allowedTransitions = (c: CaseFacts, p: Principal, isMember: boolean): CaseStatus[] => {
  const approver = can(p, "cases.approve") && p.userId !== c.createdById;
  const out: CaseStatus[] = [];
  switch (c.status) {
    case "OPEN":
      if (isMember && c.hasFindings && c.recommendation) out.push("PENDING_APPROVAL");
      if (approver) out.push("CLOSED");
      break;
    case "PENDING_APPROVAL":
      if (approver) out.push("APPROVED", "OPEN");
      break;
    case "APPROVED":
      if (c.recommendation === "FILE_SAR" && isCompliance(p)) out.push("REPORTED");
      if (c.recommendation !== "FILE_SAR" && approver) out.push("CLOSED");
      break;
    case "REPORTED":
      if (isCompliance(p)) out.push("CLOSED");
      break;
    default:
      break;
  }
  return out;
};

/** Pure: the reason a transition is refused, for a clear error message. */
export const transitionError = (c: CaseFacts, p: Principal, to: CaseStatus, isMember: boolean): string | null => {
  if (allowedTransitions(c, p, isMember).includes(to)) return null;
  if (to === "APPROVED" && p.userId === c.createdById) return "Four-eyes rule: you prepared this case, so someone else must approve it";
  if (to === "PENDING_APPROVAL" && (!c.hasFindings || !c.recommendation)) return "Add findings and a recommendation before submitting";
  return `Cannot move a ${c.status} case to ${to}`;
};
