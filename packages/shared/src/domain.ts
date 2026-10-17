import { z } from "zod";

export const roleKeys = ["ANALYST", "SUPERVISOR", "COMPLIANCE_MANAGER", "ADMIN"] as const;
export type RoleKey = (typeof roleKeys)[number];

export const riskLevels = ["HIGH", "MEDIUM", "LOW"] as const;
export type RiskLevel = (typeof riskLevels)[number];

export const alertStatuses = ["NEW", "IN_REVIEW", "CLOSED_FALSE_POSITIVE", "ESCALATED"] as const;
export type AlertStatus = (typeof alertStatuses)[number];

export const permissions = [
  "overview.view",
  "alerts.view",
  "alerts.decide",
  "cases.view",
  "cases.create",
  "cases.approve",
  "transactions.view",
  "customers.view",
  "customers.manage",
  "rules.view",
  "rules.manage",
  "jobs.manage",
  "import.manage",
  "reports.view",
  "workflow.manage",
  "news.create",
  "admin.manage",
] as const;
export type Permission = (typeof permissions)[number];

export const currencies = ["EUR", "USD", "TRY", "AED"] as const;
export type Currency = (typeof currencies)[number];

// ---------- Auth ----------

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const meSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(roleKeys),
  roleName: z.string(),
  clearanceRank: z.number(),
  regions: z.array(z.object({ code: z.string(), name: z.string() })),
  permissions: z.array(z.string()),
});
export type Me = z.infer<typeof meSchema>;

export const sessionInfoSchema = z.object({
  id: z.string(),
  userAgent: z.string().nullable(),
  ip: z.string().nullable(),
  createdAt: z.string(),
  lastSeenAt: z.string(),
  current: z.boolean(),
});
export type SessionInfo = z.infer<typeof sessionInfoSchema>;

// ---------- Grid queries (server-side sorting and paging) ----------

export const sortItemSchema = z.object({ colId: z.string(), sort: z.enum(["asc", "desc"]) });

export const gridQuerySchema = z.object({
  startRow: z.number().int().min(0),
  endRow: z.number().int().positive(),
  sortModel: z.array(sortItemSchema).default([]),
  // Simple column filters: { status: ["NEW"], riskLevel: ["HIGH"], search: "north" }
  filters: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({}),
});
export type GridQuery = z.infer<typeof gridQuerySchema>;

export const pageSchema = <T extends z.ZodType>(row: T) =>
  z.object({ rows: z.array(row), rowCount: z.number() });

// ---------- Alerts ----------

export const alertRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  status: z.enum(alertStatuses),
  riskLevel: z.enum(riskLevels),
  score: z.number(),
  ruleCode: z.string(),
  ruleName: z.string(),
  customerName: z.string(),
  customerCode: z.string(),
  branchCode: z.string(),
  branchCity: z.string(),
  amount: z.string().nullable(),
  currency: z.string().nullable(),
  baseAmount: z.string().nullable(),
  assigneeName: z.string().nullable(),
  createdAt: z.string(),
});
export type AlertRow = z.infer<typeof alertRowSchema>;
export const alertPageSchema = pageSchema(alertRowSchema);
export type AlertPage = z.infer<typeof alertPageSchema>;

export const transactionRowSchema = z.object({
  id: z.string(),
  ref: z.string(),
  bookedAt: z.string(),
  direction: z.enum(["IN", "OUT"]),
  channel: z.enum(["CASH", "WIRE", "CARD", "ONLINE"]),
  amount: z.string(),
  currency: z.string(),
  baseAmount: z.string(),
  counterpartyName: z.string(),
  counterpartyCountry: z.string(),
  iban: z.string(),
  customerName: z.string(),
  customerCode: z.string(),
  branchCode: z.string(),
  branchCity: z.string(),
});
export type TransactionRow = z.infer<typeof transactionRowSchema>;
export const transactionPageSchema = pageSchema(transactionRowSchema);
export type TransactionPage = z.infer<typeof transactionPageSchema>;

export const alertDetailSchema = z.object({
  alert: alertRowSchema.extend({
    decisionNote: z.string().nullable(),
    decidedAt: z.string().nullable(),
    decidedByName: z.string().nullable(),
    /** Set once the alert was escalated into an investigation case. */
    caseCode: z.string().nullable(),
  }),
  rule: z.object({ code: z.string(), name: z.string(), description: z.string(), criteria: z.unknown() }),
  customer: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    type: z.enum(["PERSON", "COMPANY"]),
    country: z.string(),
    occupation: z.string().nullable(),
    riskScore: z.number(),
    pep: z.boolean(),
  }),
  account: z.object({ iban: z.string(), currency: z.string(), status: z.string(), openedAt: z.string() }),
  transaction: transactionRowSchema.nullable(),
  history: z.array(transactionRowSchema),
  previousAlerts: z.array(z.object({ code: z.string(), status: z.enum(alertStatuses), ruleName: z.string(), createdAt: z.string() })),
});
export type AlertDetail = z.infer<typeof alertDetailSchema>;

export const alertDecisionSchema = z.object({
  decision: z.enum(["CLOSE_FALSE_POSITIVE", "ESCALATE"]),
  note: z.string().trim().min(10, "Write at least 10 characters").max(2000),
});
export type AlertDecision = z.infer<typeof alertDecisionSchema>;

// ---------- Overview ----------

export const overviewSchema = z.object({
  kpis: z.object({
    openAlerts: z.number(),
    openAlertsDelta: z.number(),
    highRiskAlerts: z.number(),
    highRiskToday: z.number(),
    awaitingDecision: z.number(),
    overdue: z.number(),
    medianReviewHours: z.number(),
  }),
  sparklines: z.object({ open: z.array(z.number()), high: z.array(z.number()), awaiting: z.array(z.number()), review: z.array(z.number()) }),
  trend: z.array(z.object({ day: z.string(), created: z.number(), falsePositive: z.number() })),
  byRule: z.array(z.object({ code: z.string(), name: z.string(), count: z.number(), hitRate: z.number() })),
  heatmap: z.array(z.object({ weekday: z.number(), hourBucket: z.number(), count: z.number() })),
  funnel: z.object({ raised: z.number(), reviewed: z.number(), escalated: z.number(), reported: z.number() }),
  riskByBranch: z.array(z.object({ code: z.string(), city: z.string(), high: z.number(), medium: z.number(), low: z.number() })),
  needsDecision: z.array(alertRowSchema),
});
export type Overview = z.infer<typeof overviewSchema>;

export const referenceSchema = z.object({
  branches: z.array(z.object({ code: z.string(), city: z.string(), country: z.string(), regionCode: z.string() })),
  rules: z.array(z.object({ code: z.string(), name: z.string(), riskLevel: z.enum(riskLevels) })),
});
export type Reference = z.infer<typeof referenceSchema>;
