import type { WorkflowGraph, WorkflowStep, WorkflowTransition } from "./workflow";

// The seeded case workflows. Version 1 is the fixed chain from release 2; version 2 adds a
// compliance review for cases above 1M EUR. Open cases started on version 1 stay on it.

const step = (
  s: Omit<WorkflowStep, "membersOnly" | "roles"> &
    Partial<Pick<WorkflowStep, "membersOnly" | "roles">>,
): WorkflowStep => ({ membersOnly: false, roles: [], ...s });
const move = (
  t: Omit<
    WorkflowTransition,
    "roles" | "condition" | "fourEyes" | "requireReason" | "requireSar" | "requireFindings"
  > &
    Partial<WorkflowTransition>,
): WorkflowTransition => ({
  roles: [],
  condition: null,
  fourEyes: false,
  requireReason: false,
  requireSar: false,
  requireFindings: false,
  ...t,
});

const REVIEWERS = ["SUPERVISOR", "COMPLIANCE_MANAGER", "ADMIN"] as const;

const baseSteps = (withCompliance: boolean): WorkflowStep[] => [
  step({
    id: "investigation",
    name: { en: "Investigation", fa: "بررسی" },
    category: "OPEN",
    kind: "start",
    roles: ["ANALYST", ...REVIEWERS],
    membersOnly: true,
    slaHours: 240,
    position: { x: 0, y: 160 },
  }),
  step({
    id: "supervisor_review",
    name: { en: "Supervisor review", fa: "بازبینی سرپرست" },
    category: "PENDING_APPROVAL",
    kind: "task",
    roles: [...REVIEWERS],
    slaHours: 48,
    position: { x: 300, y: 160 },
  }),
  ...(withCompliance
    ? [
        step({
          id: "compliance_review",
          name: { en: "Compliance review", fa: "بازبینی انطباق" },
          category: "PENDING_APPROVAL",
          kind: "task",
          roles: ["COMPLIANCE_MANAGER", "ADMIN"],
          slaHours: 72,
          position: { x: 600, y: 0 },
        }),
      ]
    : []),
  step({
    id: "approved",
    name: { en: "Approved", fa: "تأییدشده" },
    category: "APPROVED",
    kind: "task",
    roles: [...REVIEWERS],
    slaHours: 120,
    position: { x: 900, y: 160 },
  }),
  step({
    id: "reported",
    name: { en: "Reported to FIU", fa: "گزارش به واحد اطلاعات مالی" },
    category: "REPORTED",
    kind: "end",
    slaHours: null,
    position: { x: 1200, y: 60 },
  }),
  step({
    id: "closed",
    name: { en: "Closed", fa: "بسته" },
    category: "CLOSED",
    kind: "end",
    slaHours: null,
    position: { x: 1200, y: 280 },
  }),
];

const ONE_MILLION = 1_000_000;

const baseTransitions = (withCompliance: boolean): WorkflowTransition[] => [
  move({
    id: "submit",
    from: "investigation",
    to: "supervisor_review",
    label: { en: "Submit for approval", fa: "ارسال برای تأیید" },
    requireFindings: true,
  }),
  move({
    id: "close_early",
    from: "investigation",
    to: "closed",
    label: { en: "Close without report", fa: "بستن بدون گزارش" },
    roles: [...REVIEWERS],
    requireReason: true,
    fourEyes: true,
  }),
  move({
    id: "approve",
    from: "supervisor_review",
    to: "approved",
    label: { en: "Approve", fa: "تأیید" },
    fourEyes: true,
    condition: withCompliance
      ? { field: "totalAmount", operator: "lte", value: ONE_MILLION }
      : null,
  }),
  ...(withCompliance
    ? [
        move({
          id: "to_compliance",
          from: "supervisor_review",
          to: "compliance_review",
          label: { en: "Approve, send to compliance", fa: "تأیید و ارسال به انطباق" },
          fourEyes: true,
          condition: { field: "totalAmount", operator: "gt", value: ONE_MILLION },
        }),
        move({
          id: "compliance_approve",
          from: "compliance_review",
          to: "approved",
          label: { en: "Approve", fa: "تأیید" },
          fourEyes: true,
        }),
        move({
          id: "compliance_send_back",
          from: "compliance_review",
          to: "investigation",
          label: { en: "Send back", fa: "برگرداندن" },
          requireReason: true,
        }),
      ]
    : []),
  move({
    id: "send_back",
    from: "supervisor_review",
    to: "investigation",
    label: { en: "Send back", fa: "برگرداندن" },
    requireReason: true,
  }),
  move({
    id: "file_sar",
    from: "approved",
    to: "reported",
    label: { en: "File SAR", fa: "ثبت گزارش مشکوک" },
    roles: ["COMPLIANCE_MANAGER", "ADMIN"],
    requireSar: true,
    condition: { field: "recommendation", operator: "eq", value: "FILE_SAR" },
  }),
  move({
    id: "close",
    from: "approved",
    to: "closed",
    label: { en: "Close case", fa: "بستن پرونده" },
    requireReason: true,
    condition: { field: "recommendation", operator: "neq", value: "FILE_SAR" },
  }),
];

export const defaultWorkflowV1: WorkflowGraph = {
  steps: baseSteps(false),
  transitions: baseTransitions(false),
};
export const defaultWorkflowV2: WorkflowGraph = {
  steps: baseSteps(true),
  transitions: baseTransitions(true),
};

/** Seed and migration helper: the step a release 2 status maps to. */
export const stepForStatus: Record<string, string> = {
  OPEN: "investigation",
  PENDING_APPROVAL: "supervisor_review",
  APPROVED: "approved",
  REPORTED: "reported",
  CLOSED: "closed",
};
