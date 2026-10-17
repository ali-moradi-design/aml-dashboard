import { z } from "zod";
import { alertRowSchema, alertStatuses, riskLevels, transactionRowSchema } from "./domain";

// Response shapes for release 2 screens (customers, cases, rules).

export const caseStatuses = ["DRAFT", "OPEN", "PENDING_APPROVAL", "APPROVED", "REPORTED", "CLOSED"] as const;
export type CaseStatus = (typeof caseStatuses)[number];
export const casePriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

// ---------- Customers ----------

export const customerRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.enum(["PERSON", "COMPANY"]),
  country: z.string(),
  branchCity: z.string(),
  riskScore: z.number(),
  pep: z.boolean(),
  kycStatus: z.enum(["PENDING", "VERIFIED", "EXPIRED", "REJECTED"]),
  openAlerts: z.number(),
  createdAt: z.string(),
});
export type CustomerRow = z.infer<typeof customerRowSchema>;
export const customerPageSchema = z.object({ rows: z.array(customerRowSchema), rowCount: z.number() });

export const customerProfileSchema = z.object({
  customer: customerRowSchema.extend({
    city: z.string().nullable(),
    addressLine: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    occupation: z.string().nullable(),
    employer: z.string().nullable(),
    dateOfBirth: z.string().nullable(),
    nationality: z.string().nullable(),
    registrationNumber: z.string().nullable(),
    incorporationDate: z.string().nullable(),
    industry: z.string().nullable(),
    sourceOfFunds: z.string().nullable(),
    expectedMonthlyVolume: z.string().nullable(),
    kycReviewedAt: z.string().nullable(),
    branchCode: z.string(),
  }),
  riskFactors: z.array(z.object({ key: z.string(), weight: z.number() })),
  accounts: z.array(z.object({ id: z.string(), iban: z.string(), currency: z.string(), status: z.string(), balance: z.string(), openedAt: z.string() })),
  shareholders: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["PERSON", "COMPANY"]),
      country: z.string(),
      sharePercent: z.string(),
      documents: z.array(z.object({ kind: z.string(), number: z.string(), expiresAt: z.string().nullable() })),
    }),
  ),
  monthly: z.array(z.object({ month: z.string(), incoming: z.number(), outgoing: z.number() })),
  transactions: z.array(transactionRowSchema),
  alerts: z.array(alertRowSchema),
  cases: z.array(z.object({ code: z.string(), title: z.string(), status: z.enum(caseStatuses) })),
});
export type CustomerProfile = z.infer<typeof customerProfileSchema>;

// ---------- Cases ----------

export const userRefSchema = z.object({ id: z.string(), name: z.string(), role: z.string() });
export type UserRef = z.infer<typeof userRefSchema>;

export const caseRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  status: z.enum(caseStatuses),
  priority: z.enum(casePriorities),
  riskLevel: z.enum(riskLevels),
  typology: z.string(),
  branchCity: z.string(),
  subjectName: z.string().nullable(),
  totalAmount: z.string().nullable(),
  createdByName: z.string(),
  alertCount: z.number(),
  dueAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CaseRow = z.infer<typeof caseRowSchema>;
export const casePageSchema = z.object({ rows: z.array(caseRowSchema), rowCount: z.number() });

export const caseBoardSchema = z.object({
  columns: z.array(z.object({ status: z.enum(caseStatuses), count: z.number(), cases: z.array(caseRowSchema) })),
});
export type CaseBoard = z.infer<typeof caseBoardSchema>;

export const commentSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  author: userRefSchema,
  body: z.string(),
  mentions: z.array(z.string()),
  createdAt: z.string(),
  editedAt: z.string().nullable(),
  deleted: z.boolean(),
  edits: z.array(z.object({ body: z.string(), editedAt: z.string() })),
  attachments: z.array(z.object({ id: z.string(), name: z.string(), size: z.number() })),
});
export type Comment = z.infer<typeof commentSchema>;

export const caseDetailSchema = z.object({
  case: caseRowSchema.extend({
    summary: z.string(),
    findings: z.string().nullable(),
    recommendation: z.enum(["FILE_SAR", "MONITOR", "CLOSE"]).nullable(),
    periodStart: z.string().nullable(),
    periodEnd: z.string().nullable(),
    sarReference: z.string().nullable(),
    clearanceRank: z.number(),
    createdById: z.string(),
    approvedByName: z.string().nullable(),
    submittedAt: z.string().nullable(),
    approvedAt: z.string().nullable(),
    reportedAt: z.string().nullable(),
    closedAt: z.string().nullable(),
  }),
  alerts: z.array(alertRowSchema),
  parties: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["PERSON", "COMPANY"]),
      role: z.enum(["SUBJECT", "COUNTERPARTY", "BENEFICIAL_OWNER", "OTHER"]),
      country: z.string(),
      customerCode: z.string().nullable(),
      notes: z.string().nullable(),
      accounts: z.array(z.object({ iban: z.string(), bankName: z.string(), currency: z.string() })),
    }),
  ),
  documents: z.array(z.object({ id: z.string(), name: z.string(), mimeType: z.string(), size: z.number(), uploadedByName: z.string(), createdAt: z.string() })),
  members: z.array(userRefSchema),
  events: z.array(z.object({ id: z.string(), type: z.string(), actorName: z.string().nullable(), data: z.unknown(), createdAt: z.string() })),
  /** What the signed-in user may do right now (four-eyes rule already applied). */
  allowed: z.object({
    transitions: z.array(z.enum(caseStatuses)),
    edit: z.boolean(),
    comment: z.boolean(),
    manageMembers: z.boolean(),
    isMember: z.boolean(),
  }),
});
export type CaseDetail = z.infer<typeof caseDetailSchema>;

// ---------- Rules ----------

export const ruleRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  riskLevel: z.enum(riskLevels),
  enabled: z.boolean(),
  alerts30d: z.number(),
  hitRate: z.number(),
  falsePositiveRate: z.number(),
  lastAlertAt: z.string().nullable(),
  daily: z.array(z.number()),
});
export type RuleRow = z.infer<typeof ruleRowSchema>;

export const ruleDetailSchema = ruleRowSchema.extend({
  criteria: z.unknown(),
  statusMix: z.array(z.object({ status: z.enum(alertStatuses), count: z.number() })),
  createdAt: z.string(),
});
export type RuleDetail = z.infer<typeof ruleDetailSchema>;
